-- =============================================================================
-- Request expiry notifications (APP DB)
--
-- notify_expiring_requests() — pg_cron hourly job
--   Fires for requests with decision_deadline 23-25h away.
--   Calls /api/internal { action: 'request-expiring', ... }
--   Idempotency: checks existing 'request_expiring' notification before firing.
--   Consumer sees: "Your X request closes in 24 hours"
--
-- Note: request-expired is fired from Portal DB close_expired_windows()
--   when a request status changes to 'expired' (zero bids at deadline).
--   See portal-api db migration for that side.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_expiring_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault AS $$
DECLARE
  v_url    text;
  v_secret text;
  v_row    record;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'portal_api_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'app_service_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RETURN; END IF;

  FOR v_row IN
    SELECT r.id, r.client_id, r.product_type, r.decision_deadline, r.amount
    FROM public.requests r
    WHERE r.status = 'open'
      AND r.decision_deadline BETWEEN now() + interval '23 hours'
                                  AND now() + interval '25 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = r.client_id
          AND n.kind    = 'request_expiring'
          AND n.metadata->>'request_id' = r.id::text
      )
  LOOP
    PERFORM net.http_post(
      url     := 'https://ficium.vercel.app/api/internal',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'X-Service-Secret', v_secret
      ),
      body    := jsonb_build_object(
        'action',       'request-expiring',
        'request_id',   v_row.id,
        'client_id',    v_row.client_id,
        'product_type', v_row.product_type,
        'amount',       v_row.amount,
        'deadline',     v_row.decision_deadline
      ),
      timeout_milliseconds := 10000
    );
  END LOOP;
END; $$;

-- Hourly sweep
SELECT cron.schedule(
  'notify-expiring-requests',
  '0 * * * *',
  $$ SELECT public.notify_expiring_requests(); $$
);
