-- ─────────────────────────────────────────────────────────────────────────────
-- Markets module — Supabase tables
-- Run in: Supabase dashboard → SQL editor
-- Schema: public (read by anonymous/authenticated via RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ticker readings (one row per ticker, upserted each refresh)
create table if not exists public.market_data (
  id            uuid        primary key default gen_random_uuid(),
  ticker_id     text        not null unique,
  value         numeric     not null,
  display_value text        not null,
  change_pct    numeric     not null default 0,
  direction     text        not null check (direction in ('up','down','flat')),
  history       numeric[]   not null default '{}',
  source        text        not null,
  fetched_at    timestamptz not null default now()
);

-- 2. FX rates — one row per currency × bank, upserted daily
create table if not exists public.market_fx_rates (
  id            uuid        primary key default gen_random_uuid(),
  currency_code text        not null,   -- 'USD', 'EUR', 'GBP', 'ZAR'
  currency_pair text        not null,   -- 'USD / MUR'
  bank_name     text        not null,
  buy_rate      numeric     not null,
  sell_rate     numeric     not null,
  fetched_at    timestamptz not null default now(),
  unique (currency_code, bank_name)
);

-- 3. Deposit rates — one row per bank × term
create table if not exists public.market_deposit_rates (
  id         uuid        primary key default gen_random_uuid(),
  bank_name  text        not null,
  bank_color text        not null default '#64748b',
  rate_1y    text        not null,
  rate_2y    text        not null,
  rate_3y    text        not null,
  fetched_at timestamptz not null default now(),
  unique (bank_name)
);

-- 4. Lending rates — one row per product
create table if not exists public.market_lending_rates (
  id          uuid        primary key default gen_random_uuid(),
  product     text        not null unique,
  icon_name   text        not null default 'landmark',
  best_rate   text        not null,
  is_best     boolean     not null default false,
  fetched_at  timestamptz not null default now()
);

-- 5. News items — latest headlines
create table if not exists public.market_news (
  id            uuid        primary key default gen_random_uuid(),
  headline      text        not null,
  category      text        not null,
  emoji         text        not null,
  plain_english text        not null,
  published_at  timestamptz not null default now(),
  related_ticker_id text,
  source        text        not null default 'manual'
);

-- 6. AI-generated dual-mode stories
create table if not exists public.market_stories (
  id                 uuid        primary key default gen_random_uuid(),
  story_key          text        not null unique,  -- e.g. 'repo_rate_2025_q3'
  category           text        not null,
  emoji              text        not null,
  related_cta        boolean     not null default false,
  headline_everyday  text        not null,
  plain_everyday     text        not null,
  headline_finance   text        not null,
  plain_finance      text        not null,
  generated_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — all tables are public read-only (market data is not sensitive)
-- Only the Edge Function service role can write
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.market_data          enable row level security;
alter table public.market_fx_rates      enable row level security;
alter table public.market_deposit_rates enable row level security;
alter table public.market_lending_rates enable row level security;
alter table public.market_news          enable row level security;
alter table public.market_stories       enable row level security;

-- Read: anyone (authenticated or anon)
create policy "market_data_read"          on public.market_data          for select using (true);
create policy "market_fx_rates_read"      on public.market_fx_rates      for select using (true);
create policy "market_deposit_rates_read" on public.market_deposit_rates for select using (true);
create policy "market_lending_rates_read" on public.market_lending_rates for select using (true);
create policy "market_news_read"          on public.market_news          for select using (true);
create policy "market_stories_read"       on public.market_stories       for select using (true);

-- Write: service role only (Edge Function uses service key — bypasses RLS automatically)
-- No explicit write policy needed; service role bypasses RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for common query patterns
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_market_data_ticker_id      on public.market_data (ticker_id);
create index if not exists idx_market_fx_currency_code    on public.market_fx_rates (currency_code);
create index if not exists idx_market_news_published_at   on public.market_news (published_at desc);
create index if not exists idx_market_stories_generated   on public.market_stories (generated_at desc);
