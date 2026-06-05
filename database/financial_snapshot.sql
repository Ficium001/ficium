-- =============================================================
-- FICIUM — Financial Snapshot
-- Real assets, liabilities, and monthly cashflow per client.
-- This is what makes Net Worth, Health Score, and AI advice real.
-- Run in Supabase SQL Editor.
-- =============================================================

-- ── client_financial_snapshot ────────────────────────────────
-- One row per client, upserted whenever they update their profile.
create table if not exists public.client_financial_snapshot (
  id                   uuid        primary key default gen_random_uuid(),
  client_id            uuid        not null unique references auth.users(id) on delete cascade,

  -- ASSETS (MUR)
  cash_savings         numeric(15,2) not null default 0,
  fixed_deposits       numeric(15,2) not null default 0,
  investments_value    numeric(15,2) not null default 0,
  property_value       numeric(15,2) not null default 0,
  vehicle_value        numeric(15,2) not null default 0,
  other_assets         numeric(15,2) not null default 0,

  -- LIABILITIES (MUR)
  mortgage_balance     numeric(15,2) not null default 0,
  personal_loan_balance numeric(15,2) not null default 0,
  credit_card_balance  numeric(15,2) not null default 0,
  vehicle_loan_balance numeric(15,2) not null default 0,
  other_liabilities    numeric(15,2) not null default 0,

  -- MONTHLY CASHFLOW (MUR)
  monthly_income       numeric(12,2) not null default 0,
  monthly_expenses     numeric(12,2) not null default 0,
  monthly_loan_payments numeric(12,2) not null default 0,
  monthly_savings      numeric(12,2) not null default 0,

  -- COMPUTED (updated by trigger)
  total_assets         numeric(15,2) generated always as (
    cash_savings + fixed_deposits + investments_value +
    property_value + vehicle_value + other_assets
  ) stored,
  total_liabilities    numeric(15,2) generated always as (
    mortgage_balance + personal_loan_balance + credit_card_balance +
    vehicle_loan_balance + other_liabilities
  ) stored,
  net_worth            numeric(15,2) generated always as (
    (cash_savings + fixed_deposits + investments_value +
     property_value + vehicle_value + other_assets) -
    (mortgage_balance + personal_loan_balance + credit_card_balance +
     vehicle_loan_balance + other_liabilities)
  ) stored,
  debt_to_income_ratio numeric(5,2) generated always as (
    case when monthly_income > 0
    then round(((mortgage_balance + personal_loan_balance + credit_card_balance +
                 vehicle_loan_balance + other_liabilities) /
                (monthly_income * 12)) * 100, 2)
    else 0 end
  ) stored,

  -- META
  currency             text        not null default 'MUR',
  snapshot_date        date        not null default current_date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.client_financial_snapshot enable row level security;

drop policy if exists "snapshot_select" on public.client_financial_snapshot;
drop policy if exists "snapshot_insert" on public.client_financial_snapshot;
drop policy if exists "snapshot_update" on public.client_financial_snapshot;

create policy "snapshot_select" on public.client_financial_snapshot
  for select using (auth.uid() = client_id);
create policy "snapshot_insert" on public.client_financial_snapshot
  for insert with check (auth.uid() = client_id);
create policy "snapshot_update" on public.client_financial_snapshot
  for update using (auth.uid() = client_id);

-- Auto-update trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists snapshot_updated_at on public.client_financial_snapshot;
create trigger snapshot_updated_at
  before update on public.client_financial_snapshot
  for each row execute function update_updated_at();

-- Index
create index if not exists snapshot_client_idx
  on public.client_financial_snapshot(client_id);

-- ── Update client_profile_view to include snapshot data ──────
-- Drop and recreate view with snapshot fields joined in
-- (run this AFTER the table above is created)

-- First check if client_profile_view exists, then add snapshot fields
-- This is additive — existing columns are unchanged
create or replace view public.client_profile_view as
select
  u.id                                    as user_id,
  u.email,
  cp.full_name,
  cp.first_name,
  cp.kyc_status,
  cp.kyc_verified,
  cp.address_line_1,
  cp.city,
  cp.country,
  cp.employment_status,
  cp.monthly_income,
  cp.has_existing_loans,
  cp.is_pep,
  cp.enhanced_due_diligence_required,
  cp.proof_of_address_done,
  cp.financial_profile_done,
  cp.source_of_wealth_done,
  cp.health_score,
  cp.risk_score,
  cp.affordability_score,
  cp.completion_percent,
  -- Snapshot data (null if not yet entered)
  s.total_assets,
  s.total_liabilities,
  s.net_worth                             as total_net_worth,
  s.cash_savings,
  s.fixed_deposits,
  s.investments_value,
  s.property_value,
  s.vehicle_value,
  s.other_assets,
  s.mortgage_balance,
  s.personal_loan_balance,
  s.credit_card_balance,
  s.vehicle_loan_balance,
  s.other_liabilities,
  s.monthly_expenses,
  s.monthly_loan_payments,
  s.monthly_savings,
  s.debt_to_income_ratio
from auth.users u
join public.clients cp on cp.user_id = u.id
left join public.client_financial_snapshot s on s.client_id = u.id
where u.id = auth.uid();

-- Verify
select column_name from information_schema.columns
where table_name = 'client_financial_snapshot'
order by ordinal_position;
