-- ─────────────────────────────────────────────────────────────────────────────
-- Markets content v7 — real news ingestion, detailed stories, user preferences
--
-- 1. market_news gains: body (detailed explanation), scope (local/global),
--    source_name + source_url (real attribution), content_hash (dedupe).
-- 2. market_stories gains: detail_everyday / detail_finance (long-form body).
-- 3. New market_preferences — per-user personalisation (categories,
--    currencies, scope emphasis, default story mode). RLS: owner-only.
--
-- Run in: Supabase dashboard → SQL editor (App DB) or supabase db push.
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. market_news — detail, scope, attribution, dedupe ─────────────────────

alter table public.market_news
  add column if not exists body         text,
  add column if not exists scope        text not null default 'local',
  add column if not exists source_name  text,
  add column if not exists source_url   text,
  add column if not exists content_hash text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'market_news_scope_check'
  ) then
    alter table public.market_news
      add constraint market_news_scope_check
      check (scope in ('local', 'global'));
  end if;
end $$;

-- Dedupe key for ingested items. Partial unique index so legacy AI rows
-- (content_hash is null) are unaffected.
create unique index if not exists idx_market_news_content_hash
  on public.market_news (content_hash)
  where content_hash is not null;

create index if not exists idx_market_news_scope_published
  on public.market_news (scope, published_at desc);

-- ── 1b. market_fx_rates — rate basis, so the UI can label indicative rates ──
-- Today every row is computed from a live USD/EUR/GBP/ZAR feed plus a fixed
-- per-bank spread assumption, NOT each bank's own published counter rate.
-- Default 'indicative' reflects that honestly; flip individual rows to
-- 'live' once real per-bank rate feeds are integrated.

alter table public.market_fx_rates
  add column if not exists rate_basis text not null default 'indicative';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'market_fx_rates_basis_check'
  ) then
    alter table public.market_fx_rates
      add constraint market_fx_rates_basis_check
      check (rate_basis in ('indicative', 'live'));
  end if;
end $$;

-- ── 2. market_stories — long-form detail per mode ───────────────────────────

alter table public.market_stories
  add column if not exists detail_everyday text not null default '',
  add column if not exists detail_finance  text not null default '';

-- ── 3. market_preferences — per-user personalisation ────────────────────────

create table if not exists public.market_preferences (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  categories   text[]      not null default '{}',   -- NewsCategory values
  currencies   text[]      not null default '{}',   -- 'USD' | 'EUR' | 'GBP' | 'ZAR'
  scopes       text[]      not null default '{local,global}',
  default_mode text        not null default 'everyday'
               check (default_mode in ('everyday', 'finance')),
  updated_at   timestamptz not null default now()
);

alter table public.market_preferences enable row level security;
alter table public.market_preferences force row level security;

drop policy if exists "market_preferences_select_own" on public.market_preferences;
create policy "market_preferences_select_own"
  on public.market_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "market_preferences_insert_own" on public.market_preferences;
create policy "market_preferences_insert_own"
  on public.market_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "market_preferences_update_own" on public.market_preferences;
create policy "market_preferences_update_own"
  on public.market_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "market_preferences_delete_own" on public.market_preferences;
create policy "market_preferences_delete_own"
  on public.market_preferences for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.market_preferences to authenticated;
