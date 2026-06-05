-- ============================================================
-- Ficium — client_goals table
-- Stores financial goals per client. Wired to FinancialGoalsSection.
-- Run: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================

create table if not exists public.client_goals (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in (
                   'mortgage','vehicle','personal','investment',
                   'education','business','savings','other'
                 )),
  title          text not null,
  target_amount  numeric(15,2) not null,
  saved_amount   numeric(15,2) not null default 0,
  target_date    date,
  ai_insight     text,
  banks_ready    int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- RLS: clients can only see their own goals
alter table public.client_goals enable row level security;

create policy "client_goals_select" on public.client_goals
  for select using (auth.uid() = client_id);

create policy "client_goals_insert" on public.client_goals
  for insert with check (auth.uid() = client_id);

create policy "client_goals_update" on public.client_goals
  for update using (auth.uid() = client_id);

create policy "client_goals_delete" on public.client_goals
  for delete using (auth.uid() = client_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger client_goals_updated_at
  before update on public.client_goals
  for each row execute function update_updated_at();

-- Index for fast per-client queries
create index if not exists client_goals_client_id_idx
  on public.client_goals(client_id, created_at);
