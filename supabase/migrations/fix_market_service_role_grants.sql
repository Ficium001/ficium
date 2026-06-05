-- Grant full access to service_role on all market tables
-- (service_role is used by Edge Functions)
grant all on public.market_data          to service_role;
grant all on public.market_fx_rates      to service_role;
grant all on public.market_deposit_rates to service_role;
grant all on public.market_lending_rates to service_role;
grant all on public.market_news          to service_role;
grant all on public.market_stories       to service_role;

-- Also grant usage on sequences (for auto-generated UUIDs)
grant usage on all sequences in schema public to service_role;
