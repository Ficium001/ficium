-- =============================================================
-- FICIUM — One-time backfill: dossier scores (health / risk / affordability)
-- -------------------------------------------------------------
-- Some client_dossier rows (older / migrated accounts) have NULL
-- health_score / risk_score / affordability_score, so the Profile page shows
-- "—". Scores are normally computed in submitDossier (TypeScript) and only run
-- on a fresh onboarding, so migrated rows never got them.
--
-- This recomputes them from the SAME inputs the TS uses:
--   income      = client_dossier.monthly_income + additional_income
--   net_worth   = sum of asset_details (savings + investments + property +
--                 vehicle + business + other)
--   dti         = sum(client_loan_details.monthly_repayment) / income   (1 if income=0)
--   employment  = client_dossier.employment_status
--   compliance  = compliance_details flags (pep / bankruptcy / blacklisted /
--                 missed_repayments / legal_disputes)
--
-- The CASE arithmetic below mirrors computeHealthScore / computeRiskScore /
-- computeAffordabilityScore in src/individual/onboarding/api/dossier.ts
-- branch-for-branch (as of this backfill). It is a ONE-TIME fix; new users keep
-- getting scores from the canonical TS path.
--
-- Safe + idempotent: only touches rows where health_score IS NULL, so it never
-- overwrites a score the canonical onboarding already computed. RETURNING shows
-- exactly what was written so you can eyeball it.
--
-- Run in the Supabase SQL Editor.
-- =============================================================

with inp as (
  select
    d.client_id,
    coalesce(d.monthly_income, 0) + coalesce(d.additional_income, 0)          as income,
    coalesce(a.savings,0) + coalesce(a.investments,0) + coalesce(a.property_value,0)
      + coalesce(a.vehicle_value,0) + coalesce(a.business_assets,0) + coalesce(a.other_assets,0) as net_worth,
    d.employment_status                                                       as emp,
    coalesce(lp.total_repay, 0)                                               as total_repay,
    coalesce(cp.is_pep, false)            as is_pep,
    coalesce(cp.bankruptcy, false)        as bankruptcy,
    coalesce(cp.blacklisted, false)       as blacklisted,
    coalesce(cp.missed_repayments, false) as missed_repayments,
    coalesce(cp.legal_disputes, false)    as legal_disputes
  from public.client_dossier d
  left join public.asset_details a on a.user_id = d.client_id
  left join (
    select client_id, sum(monthly_repayment) as total_repay
    from public.client_loan_details
    group by client_id
  ) lp on lp.client_id = d.client_id
  left join public.compliance_details cp on cp.user_id = d.client_id
  where d.health_score is null
),
calc as (
  select *,
    case when income > 0 then total_repay / income else 1 end as dti
  from inp
),
scored as (
  select
    client_id,
    -- ── computeHealthScore (base 50) ────────────────────────────
    greatest(0, least(100, round(
        50
      + case when income >= 200000 then 22 when income >= 100000 then 16
             when income >=  50000 then 10 when income >=  25000 then  5 else 0 end
      + case when income > 0 then
               case when net_worth / income >= 36 then 15
                    when net_worth / income >= 18 then 10
                    when net_worth / income >=  6 then  5 else 0 end
             else 0 end
      + case when emp in ('employed','self_employed','business_owner') then 6 else 0 end
      + case when emp = 'unemployed' then -15 else 0 end
      + case when emp = 'student'    then  -8 else 0 end
      + case when dti > 0.6 then -25 when dti > 0.4 then -15
             when dti > 0.25 then -8 when dti > 0.1 then -3 else 0 end
      + case when bankruptcy        then -30 else 0 end
      + case when blacklisted       then -25 else 0 end
      + case when missed_repayments then -12 else 0 end
      + case when legal_disputes    then -10 else 0 end
    )))::int as health_score,
    -- ── computeRiskScore (base 30) ──────────────────────────────
    greatest(0, least(100, round(
        30
      + case when bankruptcy        then 35 else 0 end
      + case when blacklisted       then 30 else 0 end
      + case when missed_repayments then 18 else 0 end
      + case when legal_disputes    then 12 else 0 end
      + case when is_pep            then 10 else 0 end
      + case when dti > 0.6 then 25 when dti > 0.4 then 15 when dti > 0.25 then 8 else 0 end
      + case when emp = 'unemployed' then 20 else 0 end
      + case when emp in ('freelance','student') then 8 else 0 end
      + case when income < 15000 then 15 when income < 30000 then 5 else 0 end
    )))::int as risk_score,
    -- ── computeAffordabilityScore ───────────────────────────────
    case when income = 0 then 0 else
      greatest(0, least(100,
          round((1 - dti) * 80)
        + case when net_worth > income * 12 then 15
               when net_worth > income *  6 then  8
               when net_worth > income *  3 then  3 else 0 end
        + case when income < 20000 then -10 else 0 end
      ))
    end::int as affordability_score
  from calc
)
update public.client_dossier d
set health_score        = s.health_score,
    risk_score          = s.risk_score,
    affordability_score = s.affordability_score,
    updated_at          = now()
from scored s
where s.client_id = d.client_id
  and d.health_score is null
returning d.client_id, d.health_score, d.risk_score, d.affordability_score;

-- Confirm none remain (expect 0):
select count(*) as dossiers_with_null_scores
from public.client_dossier
where health_score is null;
