-- ─────────────────────────────────────────────────────────────────────────────
-- Schedule market-refresh edge function every 30 minutes via pg_cron.
--
-- The function is called via net.http_post (pg_net extension).
-- The Authorization header uses the service_role_key stored in a Supabase
-- Vault secret (set once via Dashboard → Vault → New secret:
--   name: "service_role_key", value: <your service_role JWT>)
--
-- To install manually if not running via supabase db push:
--   Run this SQL in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove existing schedule if present (idempotent)
SELECT cron.unschedule('market-refresh-30min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'market-refresh-30min'
);

-- Schedule every 30 minutes
SELECT cron.schedule(
  'market-refresh-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://wixfhjlsjkiwfvqewvmt.supabase.co/functions/v1/market-refresh',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1
      )
    )
  ) AS request_id;
  $$
);
