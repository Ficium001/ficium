-- The two market cron jobs (market-refresh-4h, bom-fx-weekdays) had this project's URL written
-- into their commands. Copied to UAT, production or DR they would keep calling this project's
-- edge functions. They now read the base URL from Vault, like the integration and admin outbox
-- jobs already do, so each environment sets its own value.
--
-- Vault secret functions_base_url: https://<project ref>.supabase.co/functions/v1
--   Set on this database before this migration ran. On a database where it is missing it is
--   created with a placeholder, and the jobs fail visibly until the real value is set.
--
-- Same schedules, same headers and secret; only the URL source changes.
--
-- Audit: Ficium database audit, 2026-11-24.

BEGIN;

DO $v$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'functions_base_url') THEN
    PERFORM vault.create_secret('__SET_FROM_DOPPLER__', 'functions_base_url',
                                'Base URL of this project''s edge functions (per environment)');
  END IF;
END $v$;

SELECT cron.schedule('market-refresh-4h', '0 */4 * * *', $cmd$
  SELECT net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url')
               || '/market-refresh',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                         where name = 'market_refresh_cron_secret')),
    timeout_milliseconds := 60000
  ) AS request_id;
$cmd$);

SELECT cron.schedule('bom-fx-weekdays', '20 5,8,11,14 * * 1-5', $cmd$
  SELECT net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url')
               || '/bom-fx',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                         where name = 'market_refresh_cron_secret')),
    timeout_milliseconds := 60000
  ) AS request_id;
$cmd$);

SELECT admin.migration_applied('20261124130000_cron_urls_from_vault');

COMMIT;
