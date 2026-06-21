-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: explicit GRANT SELECT to anon + authenticated roles on all market tables
-- Run in: Supabase dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Grant read access to both roles (anon = unauthenticated, authenticated = logged in)
grant select on public.market_data          to anon, authenticated;
grant select on public.market_fx_rates      to anon, authenticated;
grant select on public.market_deposit_rates to anon, authenticated;
grant select on public.market_lending_rates to anon, authenticated;
grant select on public.market_news          to anon, authenticated;
grant select on public.market_stories       to anon, authenticated;

-- Verify data exists — run these selects after granting
select 'market_data'          as tbl, count(*) from public.market_data
union all
select 'market_fx_rates',              count(*) from public.market_fx_rates
union all
select 'market_deposit_rates',         count(*) from public.market_deposit_rates
union all
select 'market_lending_rates',         count(*) from public.market_lending_rates
union all
select 'market_news',                  count(*) from public.market_news
union all
select 'market_stories',               count(*) from public.market_stories;
