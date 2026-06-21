# Ficium — Deploying Edge Functions

## market-refresh (live data scraper)

### What it does
Runs 3× daily (6 AM, 12 PM, 6 PM Mauritius time). Fetches:
- USD/EUR/GBP/ZAR vs MUR from Open Exchange Rates API (free)
- FX buy/sell rates from all 8 Mauritius banks (scraped)
- BOM repo rate (scraped from bom.mu)
- SEMDEX from Stock Exchange of Mauritius (scraped)
- News from BOM RSS feed
- Regenerates AI stories via Claude Haiku when data changes significantly

### Deploy via Supabase dashboard (no CLI needed)

1. Go to **Supabase dashboard → Edge Functions → New function**
2. Name it: `market-refresh`
3. Paste the contents of `supabase/functions/market-refresh/index.ts`
4. Click **Deploy**

### Set the cron schedule (Supabase dashboard)

1. Go to **Supabase dashboard → Database → Extensions**
2. Enable **pg_cron** if not already enabled
3. Go to **SQL Editor** and run:

```sql
-- Schedule market-refresh to run 3x daily (Mauritius time = UTC+4)
select cron.schedule(
  'market-refresh-cron',
  '0 2,8,14 * * *',   -- 6 AM, 12 PM, 6 PM MUT
  $$
  select net.http_post(
    url := 'https://wixfhjlsjkiwfvqewvmt.supabase.co/functions/v1/market-refresh',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

Or use the simpler Supabase cron via the dashboard:
1. **Supabase → Database → Cron Jobs → New cron job**
2. Schedule: `0 2,8,14 * * *`
3. Command: HTTP POST to `https://wixfhjlsjkiwfvqewvmt.supabase.co/functions/v1/market-refresh`
4. Headers: `Authorization: Bearer <service_role_key>`

### Manual invoke (test it now)

```bash
curl -X POST https://wixfhjlsjkiwfvqewvmt.supabase.co/functions/v1/market-refresh \
  -H "Authorization: Bearer <your_service_role_key>" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Returns JSON with per-table update counts and what changed.

### Required environment variables (set in Supabase dashboard → Edge Functions → Secrets)

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set by Supabase |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for story generation) |

### Monitoring

Check **Supabase → Edge Functions → market-refresh → Logs** after each run.
Look for `[market-refresh] Refresh complete:` at the end — it shows counts for everything updated.

### What happens when a bank site is down

Each scraper is wrapped in try/catch. If MCB's site is down, the function continues with the other banks — partial data is better than no data. The API-based FX rate always provides a fallback.
