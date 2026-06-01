-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 3: MIGRATE DATA (fixed v3)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Migrate clients ───────────────────────────────────────────────────
INSERT INTO public.clients (
  id, email, full_name, first_name, middle_name, last_name,
  title, phone, user_type, company_name, company_registration,
  kyc_status, date_of_birth, gender,
  id_document_type, id_document_number, id_document_path, selfie_path,
  address_line_1, address_line_2, city, postal_code, country,
  created_at, updated_at
)
SELECT
  u.id, u.email,
  coalesce(u.full_name, ''),
  u.first_name, u.middle_name, u.last_name,
  NULLIF(u.title::text, '')::public.title_type,
  u.phone,
  coalesce(u.user_type, 'individual'),
  u.company_name, u.company_registration,
  u.kyc_status,
  u.date_of_birth,
  u.gender::text,
  u.id_document_type::text,
  u.id_document_number, u.id_document_path, u.selfie_path,
  u.address_line_1, u.address_line_2, u.city, u.postal_code,
  coalesce(u.country, 'MU'),
  u.created_at, u.updated_at
FROM public.users u
WHERE u.role = 'client'
ON CONFLICT (id) DO NOTHING;

SELECT 'Step 1 complete — clients migrated: ' || count(*) AS status FROM public.clients;

-- ── STEP 2: Migrate institution members ───────────────────────────────────────
-- institution_users columns: id, institution_id, user_id, role, is_primary_admin, invited_by, created_at
INSERT INTO institution.institution_members (
  auth_user_id, institution_id, email, full_name,
  role, is_primary_admin, active, joined_at, created_at, updated_at
)
SELECT
  iu.user_id, iu.institution_id,
  coalesce(u.email, ''),
  coalesce(u.full_name, ''),
  iu.role::institution.inst_role,
  iu.is_primary_admin,
  true,
  coalesce(iu.created_at, now()),
  coalesce(iu.created_at, now()),
  now()
FROM institution.institution_users iu
JOIN public.users u ON u.id = iu.user_id
ON CONFLICT (auth_user_id, institution_id) DO NOTHING;

SELECT 'Step 2 complete — institution members migrated: ' || count(*) AS status
FROM institution.institution_members;

-- ── STEP 3: Migrate unified client dossier ────────────────────────────────────
-- financial_profiles columns: user_id, employment_status, monthly_income,
--   additional_income, total_net_worth, has_existing_loans, pep_declaration,
--   tax_residency, source_of_wealth, health_score, risk_score,
--   affordability_score, created_at, updated_at

-- First from financial_profiles (richer)
INSERT INTO public.client_dossier (
  client_id, employment_status, monthly_income, additional_income,
  total_net_worth, has_existing_loans, pep_declaration,
  tax_residency, source_of_wealth, health_score, risk_score,
  affordability_score, created_at, updated_at
)
SELECT
  fp.user_id,
  fp.employment_status, fp.monthly_income, fp.additional_income,
  fp.total_net_worth, fp.has_existing_loans, fp.pep_declaration,
  fp.tax_residency, fp.source_of_wealth, fp.health_score,
  fp.risk_score, fp.affordability_score,
  fp.created_at, fp.updated_at
FROM public.financial_profiles fp
WHERE fp.user_id IN (SELECT id FROM public.clients)
ON CONFLICT (client_id) DO NOTHING;

-- client_dossiers columns: id, user_id, employment_status, monthly_income,
--   total_assets, existing_loans, credit_history, health_score,
--   created_at, updated_at, address_line_1, address_line_2, city, country, postal_code
-- Fill gaps from client_dossiers for any not in financial_profiles
INSERT INTO public.client_dossier (
  client_id, employment_status, total_net_worth,
  health_score, created_at, updated_at
)
SELECT
  cd.user_id,
  cd.employment_status,
  cd.total_assets,
  cd.health_score,
  cd.created_at,
  cd.updated_at
FROM public.client_dossiers cd
WHERE cd.user_id NOT IN (SELECT client_id FROM public.client_dossier)
AND cd.user_id IN (SELECT id FROM public.clients)
ON CONFLICT (client_id) DO NOTHING;

SELECT 'Step 3 complete — client dossiers migrated: ' || count(*) AS status
FROM public.client_dossier;

-- ── STEP 4: Migrate loan_details → client_loan_details ───────────────────────
INSERT INTO public.client_loan_details (
  client_id, loan_type, outstanding_amount,
  monthly_repayment, bank_name, remaining_months, created_at
)
SELECT
  ld.user_id, ld.loan_type, ld.outstanding_amount,
  ld.monthly_repayment, ld.bank_name, ld.remaining_months, ld.created_at
FROM public.loan_details ld
WHERE ld.user_id IN (SELECT id FROM public.clients)
ON CONFLICT DO NOTHING;

SELECT 'Step 4 complete — loan details migrated: ' || count(*) AS status
FROM public.client_loan_details;

-- ── STEP 5: Verify FK integrity ───────────────────────────────────────────────
SELECT
  'Requests with valid client FK' AS check_name, count(*) AS count
FROM public.requests r
WHERE r.client_id IN (SELECT id FROM public.clients)
UNION ALL
SELECT
  'Requests with BROKEN client FK', count(*)
FROM public.requests r
WHERE r.client_id NOT IN (SELECT id FROM public.clients);

SELECT 'All migration steps complete' AS status;
