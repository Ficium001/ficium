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
-- ACTIVATION (run once, with real values — secret never committed):
--   SELECT vault.create_secret('https://<portal-api-host>', 'portal_api_url');
--   SELECT vault.create_secret('<APP_SERVICE_SECRET>',      'app_service_secret');
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE SCHEMA IF NOT EXISTS marketplace_sync;

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
    timeout_milliseconds := 5000
  );
END; $$;
REVOKE ALL ON FUNCTION marketplace_sync.dispatch() FROM PUBLIC;

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

-- Safety-net sweep every 5 minutes (idempotent on the ingest side)
SELECT cron.schedule('marketplace-sync-sweep', '*/5 * * * *',
  $cron$SELECT marketplace_sync.dispatch();$cron$);
