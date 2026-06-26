-- =============================================================================
-- Marketplace request sync automation (APP DB — wixfhjlsjkiwfvqewvmt)
--
-- Auto-mirrors consumer requests into the portal's marketplace.request by
-- calling the portal-api POST /marketplace/sync-requests endpoint.
--   • event-driven: AFTER INSERT/UPDATE OF status trigger on public.requests
--   • safety net:   pg_cron job every 5 minutes
-- Config (portal URL + service secret) is read from Vault at runtime, so no
-- secret is embedded here. dispatch() no-ops gracefully if Vault keys are
-- absent, so it can never break consumer request creation.
--
-- ACTIVATION (run once — secrets never committed to repo):
--   SELECT vault.create_secret('https://ficium-portal-api-production.up.railway.app', 'portal_api_url');
--   SELECT vault.create_secret('<APP_SERVICE_SECRET>', 'app_service_secret');
--   ✓ DONE 2026-06-26 — vault keys are configured on production
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE SCHEMA IF NOT EXISTS marketplace_sync;

-- ---------------------------------------------------------------------------
-- dispatch(): fire-and-forget POST to portal-api /marketplace/sync-requests
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace_sync.dispatch()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace_sync, public, extensions, vault AS $$
DECLARE v_url text; v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'portal_api_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'app_service_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'marketplace_sync.dispatch: vault keys not configured, skipping';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/marketplace/sync-requests',
    headers := jsonb_build_object('Content-Type','application/json','X-Service-Secret', v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
END; $$;
REVOKE ALL ON FUNCTION marketplace_sync.dispatch() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- on_request_change(): trigger wrapper — non-fatal, never blocks commits
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace_sync.on_request_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace_sync, public AS $$
BEGIN
  BEGIN
    PERFORM marketplace_sync.dispatch();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'marketplace_sync dispatch failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_marketplace_sync ON public.requests;
CREATE TRIGGER trg_marketplace_sync
  AFTER INSERT OR UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION marketplace_sync.on_request_change();

-- ---------------------------------------------------------------------------
-- health(): observability view for sync status
-- NOTE: pg_net v0.20 stores responses in net._http_response directly by id;
-- no join to http_request_queue needed. The _http_response table is append-
-- only — rows are NOT deleted after the worker processes them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace_sync.health()
RETURNS TABLE(
    last_call        timestamp with time zone,
    last_status      integer,
    last_outcome     text,
    ok_last_hour     bigint,
    failed_last_hour bigint,
    vault_configured boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'marketplace_sync', 'net', 'vault'
AS $$
  SELECT
    (SELECT max(created) FROM net._http_response),
    (SELECT status_code  FROM net._http_response ORDER BY id DESC LIMIT 1),
    (SELECT CASE
        WHEN status_code = 200       THEN 'OK'
        WHEN status_code = 403       THEN 'AUTH_FAILED'
        WHEN status_code = 503       THEN 'PORTAL_UNAVAILABLE'
        WHEN timed_out               THEN 'TIMED_OUT'
        WHEN error_msg IS NOT NULL   THEN 'ERROR'
        ELSE 'HTTP_' || status_code::text
     END
     FROM net._http_response ORDER BY id DESC LIMIT 1),
    (SELECT count(*) FROM net._http_response
      WHERE status_code = 200 AND created > now() - interval '1 hour'),
    (SELECT count(*) FROM net._http_response
      WHERE (status_code <> 200 OR timed_out OR error_msg IS NOT NULL)
        AND created > now() - interval '1 hour'),
    (SELECT count(*) = 2 FROM vault.decrypted_secrets
      WHERE name IN ('portal_api_url','app_service_secret'));
$$;

-- ---------------------------------------------------------------------------
-- recent_calls(): last N sync responses for debugging
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace_sync.recent_calls(n int DEFAULT 10)
RETURNS TABLE(id bigint, status_code int, timed_out boolean, error_msg text,
              outcome text, body text, created timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'marketplace_sync', 'net'
AS $$
  SELECT
    r.id,
    r.status_code,
    r.timed_out,
    r.error_msg,
    CASE
      WHEN r.status_code = 200     THEN 'OK'
      WHEN r.status_code = 403     THEN 'AUTH_FAILED'
      WHEN r.status_code = 503     THEN 'PORTAL_UNAVAILABLE'
      WHEN r.timed_out             THEN 'TIMED_OUT'
      WHEN r.error_msg IS NOT NULL THEN 'ERROR'
      ELSE 'HTTP_' || r.status_code::text
    END,
    LEFT(r.content, 500),
    r.created
  FROM net._http_response r
  ORDER BY r.id DESC
  LIMIT n;
$$;

-- Safety-net sweep every 5 minutes (idempotent — ingest_app_request uses ON CONFLICT)
SELECT cron.schedule('marketplace-sync-sweep', '*/5 * * * *',
  $cron$SELECT marketplace_sync.dispatch();$cron$);
