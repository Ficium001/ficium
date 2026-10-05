-- ─────────────────────────────────────────────────────────────────────────────
-- Fixes market data going stale (Aug 6 2026):
--
-- 1. 20260701_market_refresh_cron.sql was written but never actually applied
--    to production — confirmed absent from both cron.job and the migrations
--    history table. Nothing had ever invoked market-refresh via cron.
-- 2. Even a manual invoke would have timed out: pg_net's default timeout is
--    5s, but the function takes ~30s (RSS ingestion + AI enrichment).
-- 3. The original migration depended on a `service_role_key` Vault secret
--    that was never created either. market-refresh is deployed with
--    verify_jwt = false, so no Authorization header is actually required —
--    dropped that dependency rather than adding the secret.
--
-- Applied directly to prod via Supabase MCP on 2026-08-06; this migration
-- brings the repo's migration history back in sync with what's live.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.unschedule('market-refresh-4h')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'market-refresh-4h'
);

SELECT cron.schedule(
  'market-refresh-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://wixfhjlsjkiwfvqewvmt.supabase.co/functions/v1/market-refresh',
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
