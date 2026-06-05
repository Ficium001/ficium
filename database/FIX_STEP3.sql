-- =============================================================
-- FICIUM — Step 3: Recreate client_profile_view with snapshot
-- Drops the existing view and rebuilds it keeping all 27 original
-- columns plus the snapshot financial data joined in.
-- =============================================================

-- Drop existing view (safe — recreated immediately below)
DROP VIEW IF EXISTS public.client_profile_view;

-- Recreate with snapshot data joined in
CREATE VIEW public.client_profile_view AS
SELECT
  -- Original 27 columns (exact names from existing view)
  c.id                                        AS user_id,
  c.email,
  c.full_name,
  c.first_name,
  c.last_name,
  c.kyc_status,
  c.date_of_birth,
  c.address_line_1,
  c.city,
  c.country,
  c.user_type,
  (c.kyc_status = 'verified')                 AS kyc_verified,
  (c.kyc_status = 'verified')                 AS proof_of_address_done,
  d.employment_status,
  d.monthly_income,
  d.total_net_worth,
  d.has_existing_loans,
  d.pep_declaration                           AS is_pep,
  d.tax_residency,
  d.source_of_wealth,
  d.health_score,
  d.risk_score,
  d.affordability_score,
  (d.id IS NOT NULL)                          AS financial_profile_done,
  (d.source_of_wealth IS NOT NULL)            AS source_of_wealth_done,
  false                                       AS enhanced_due_diligence_required,
  CASE
    WHEN c.kyc_status = 'verified' AND d.id IS NOT NULL THEN 100
    WHEN c.kyc_status = 'verified' THEN 60
    WHEN c.kyc_status = 'pending'  THEN 20
    ELSE 10
  END                                         AS completion_percent,

  -- NEW: snapshot financial breakdown (null until user fills /networth)
  s.total_assets,
  s.total_liabilities,
  s.net_worth                                 AS snapshot_net_worth,
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

FROM public.clients c
LEFT JOIN public.client_dossier d  ON d.client_id = c.id
LEFT JOIN public.client_financial_snapshot s ON s.client_id = c.id
WHERE c.id = auth.uid();

-- ── Storage bucket ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_storage_policy" ON storage.objects;
CREATE POLICY "documents_storage_policy" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ── Final verification ────────────────────────────────────────
SELECT
  'client_goals.status'                AS check_name,
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_goals' AND column_name='status') AS passed
UNION ALL SELECT
  'client_financial_snapshot exists',
  EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name='client_financial_snapshot')
UNION ALL SELECT
  'client_profile_view has total_assets',
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_profile_view' AND column_name='total_assets')
UNION ALL SELECT
  'client_profile_view has debt_to_income_ratio',
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_profile_view' AND column_name='debt_to_income_ratio')
UNION ALL SELECT
  'documents bucket exists',
  EXISTS (SELECT 1 FROM storage.buckets WHERE id='documents')
UNION ALL SELECT
  'your profile row loads',
  EXISTS (SELECT 1 FROM public.client_profile_view);
