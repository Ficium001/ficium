-- Market data honesty (2026-10-30). Removes figures that were never real:
--   * market_data avg_deposit_rate / avg_lending_rate: the 3.40% / 8.25% hard-coded
--     fallbacks market-refresh v7 wrote as "BOM" whenever the page didn't parse.
--   * market_fx_rates: per-bank rows computed from one mid-market rate x assumed
--     spreads (the app named a "best bank" from them).
--   * market_deposit_rates / market_lending_rates: hand-entered seed rows under real
--     bank names (5 June 2026), never updated by any feed.
-- Kept in schema market_archive for the record; nothing reads it.
CREATE SCHEMA IF NOT EXISTS market_archive;
REVOKE ALL ON SCHEMA market_archive FROM PUBLIC, anon, authenticated;

CREATE TABLE market_archive.market_data_fabricated_20261030 AS
  SELECT * FROM public.market_data WHERE ticker_id IN ('avg_deposit_rate', 'avg_lending_rate');
CREATE TABLE market_archive.market_fx_rates_indicative_20261030 AS
  SELECT * FROM public.market_fx_rates WHERE coalesce(rate_basis, 'indicative') <> 'live';
CREATE TABLE market_archive.market_deposit_rates_seed_20261030 AS
  SELECT * FROM public.market_deposit_rates;
CREATE TABLE market_archive.market_lending_rates_seed_20261030 AS
  SELECT * FROM public.market_lending_rates;

DELETE FROM public.market_data WHERE ticker_id IN ('avg_deposit_rate', 'avg_lending_rate');
DELETE FROM public.market_fx_rates WHERE coalesce(rate_basis, 'indicative') <> 'live';
DELETE FROM public.market_deposit_rates;
DELETE FROM public.market_lending_rates;
