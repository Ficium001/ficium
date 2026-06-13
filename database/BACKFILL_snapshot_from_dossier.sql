-- =============================================================
-- FICIUM — One-time backfill: client_financial_snapshot from dossier
-- -------------------------------------------------------------
-- Context: submitDossier now seeds client_financial_snapshot for new
-- onboardings, but users who onboarded BEFORE that change have an empty
-- snapshot (so NetWorth / FinancialHealth / the AI advisor show zeros).
-- This backfills them from the data they already entered.
--
-- Mirrors snapshotFromDossier() exactly:
--   assets passthrough (business folds into other_assets),
--   liabilities bucketed from the typed loan list,
--   monthly_income = monthly_income + additional_income,
--   monthly_loan_payments = sum of repayments.
--   fixed_deposits / monthly_expenses / monthly_savings are NOT set
--   (left at default 0 — no dossier source, never fabricated).
--   total_*, net_worth, debt_to_income_ratio are GENERATED — not written.
--
-- Safe to run repeatedly: ON CONFLICT (client_id) DO NOTHING means it only
-- seeds clients with NO snapshot yet — it never overwrites a snapshot a user
-- has refined in the NetWorth editor.
--
-- Run in the Supabase SQL Editor.
-- =============================================================

insert into public.client_financial_snapshot (
  client_id,
  cash_savings, investments_value, property_value, vehicle_value, other_assets,
  mortgage_balance, personal_loan_balance, credit_card_balance, vehicle_loan_balance, other_liabilities,
  monthly_income, monthly_loan_payments
)
select
  d.client_id,
  -- assets
  coalesce(a.savings,         0),
  coalesce(a.investments,     0),
  coalesce(a.property_value,  0),
  coalesce(a.vehicle_value,   0),
  coalesce(a.business_assets, 0) + coalesce(a.other_assets, 0),
  -- liabilities (bucketed from client_loan_details)
  coalesce(l.mortgage,        0),
  coalesce(l.personal,        0),
  coalesce(l.credit_card,     0),
  coalesce(l.vehicle,         0),
  coalesce(l.other_liab,      0),
  -- monthly cashflow
  coalesce(d.monthly_income,  0) + coalesce(d.additional_income, 0),
  coalesce(l.monthly_pay,     0)
from public.client_dossier d
left join public.asset_details a
  on a.user_id = d.client_id
left join (
  select
    client_id,
    sum(outstanding_amount) filter (where loan_type = 'mortgage')              as mortgage,
    sum(outstanding_amount) filter (where loan_type = 'personal')             as personal,
    sum(outstanding_amount) filter (where loan_type = 'credit_card')          as credit_card,
    sum(outstanding_amount) filter (where loan_type = 'vehicle')              as vehicle,
    sum(outstanding_amount) filter (where loan_type in ('business','other'))  as other_liab,
    sum(monthly_repayment)                                                    as monthly_pay
  from public.client_loan_details
  group by client_id
) l on l.client_id = d.client_id
on conflict (client_id) do nothing;

-- How many clients still have no snapshot after the backfill (expect 0 for
-- anyone who has a dossier; clients without a dossier legitimately have none):
select count(*) as dossiers_without_snapshot
from public.client_dossier d
left join public.client_financial_snapshot s on s.client_id = d.client_id
where s.client_id is null;
