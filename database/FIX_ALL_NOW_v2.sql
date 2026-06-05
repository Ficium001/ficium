-- =============================================================
-- FICIUM — FIX_ALL_NOW v2
-- Correct version using actual table structure.
-- clients.id = auth.users.id (no user_id column)
-- Financial data is in client_dossier, not clients
-- =============================================================

-- ── STEP 1: Add missing 'status' column to client_goals ──────
ALTER TABLE public.client_goals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','cancelled'));

-- ── STEP 2: Create client_financial_snapshot ─────────────────
CREATE TABLE IF NOT EXISTS public.client_financial_snapshot (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ASSETS (MUR)
  cash_savings          numeric(15,2) NOT NULL DEFAULT 0,
  fixed_deposits        numeric(15,2) NOT NULL DEFAULT 0,
  investments_value     numeric(15,2) NOT NULL DEFAULT 0,
  property_value        numeric(15,2) NOT NULL DEFAULT 0,
  vehicle_value         numeric(15,2) NOT NULL DEFAULT 0,
  other_assets          numeric(15,2) NOT NULL DEFAULT 0,

  -- LIABILITIES (MUR)
  mortgage_balance      numeric(15,2) NOT NULL DEFAULT 0,
  personal_loan_balance numeric(15,2) NOT NULL DEFAULT 0,
  credit_card_balance   numeric(15,2) NOT NULL DEFAULT 0,
  vehicle_loan_balance  numeric(15,2) NOT NULL DEFAULT 0,
  other_liabilities     numeric(15,2) NOT NULL DEFAULT 0,

  -- MONTHLY CASHFLOW (MUR)
  monthly_income        numeric(12,2) NOT NULL DEFAULT 0,
  monthly_expenses      numeric(12,2) NOT NULL DEFAULT 0,
  monthly_loan_payments numeric(12,2) NOT NULL DEFAULT 0,
  monthly_savings       numeric(12,2) NOT NULL DEFAULT 0,

  -- COMPUTED
  total_assets          numeric(15,2) GENERATED ALWAYS AS (
    cash_savings + fixed_deposits + investments_value +
    property_value + vehicle_value + other_assets
  ) STORED,
  total_liabilities     numeric(15,2) GENERATED ALWAYS AS (
    mortgage_balance + personal_loan_balance + credit_card_balance +
    vehicle_loan_balance + other_liabilities
  ) STORED,
  net_worth             numeric(15,2) GENERATED ALWAYS AS (
    (cash_savings + fixed_deposits + investments_value +
     property_value + vehicle_value + other_assets) -
    (mortgage_balance + personal_loan_balance + credit_card_balance +
     vehicle_loan_balance + other_liabilities)
  ) STORED,
  debt_to_income_ratio  numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN monthly_income > 0
    THEN ROUND(((mortgage_balance + personal_loan_balance + credit_card_balance +
                 vehicle_loan_balance + other_liabilities) /
                (monthly_income * 12)) * 100, 2)
    ELSE 0 END
  ) STORED,

  currency              text          NOT NULL DEFAULT 'MUR',
  snapshot_date         date          NOT NULL DEFAULT CURRENT_DATE,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_financial_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshot_select" ON public.client_financial_snapshot;
DROP POLICY IF EXISTS "snapshot_insert" ON public.client_financial_snapshot;
DROP POLICY IF EXISTS "snapshot_update" ON public.client_financial_snapshot;

CREATE POLICY "snapshot_select" ON public.client_financial_snapshot
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "snapshot_insert" ON public.client_financial_snapshot
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "snapshot_update" ON public.client_financial_snapshot
  FOR UPDATE USING (auth.uid() = client_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN new.updated_at = NOW(); RETURN new; END; $$;

DROP TRIGGER IF EXISTS snapshot_updated_at ON public.client_financial_snapshot;
CREATE TRIGGER snapshot_updated_at
  BEFORE UPDATE ON public.client_financial_snapshot
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS snapshot_client_idx
  ON public.client_financial_snapshot(client_id);

-- ── STEP 3: Recreate client_profile_view ─────────────────────
-- clients.id = auth.users.id (PK is the user id directly)
-- Financial scores are in client_dossier
CREATE OR REPLACE VIEW public.client_profile_view AS
SELECT
  c.id                          AS user_id,
  c.email,
  c.full_name,
  c.first_name,
  c.kyc_status,
  c.kyc_status = 'verified'     AS kyc_verified,
  c.address_line_1,
  c.city,
  c.country,
  -- From client_dossier
  d.employment_status,
  d.monthly_income,
  d.has_existing_loans,
  d.pep_declaration             AS is_pep,
  false                         AS enhanced_due_diligence_required,
  -- Completion flags
  (c.kyc_status = 'verified')   AS proof_of_address_done,
  (d.id IS NOT NULL)            AS financial_profile_done,
  (d.source_of_wealth IS NOT NULL) AS source_of_wealth_done,
  -- Scores
  d.health_score,
  d.risk_score,
  d.affordability_score,
  CASE
    WHEN c.kyc_status = 'verified' AND d.id IS NOT NULL THEN 100
    WHEN c.kyc_status = 'verified' THEN 60
    WHEN c.kyc_status = 'pending'  THEN 20
    ELSE 10
  END                           AS completion_percent,
  -- Financial snapshot (null until user fills in /networth page)
  s.total_assets,
  s.total_liabilities,
  s.net_worth                   AS total_net_worth,
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
LEFT JOIN public.client_dossier d ON d.client_id = c.id
LEFT JOIN public.client_financial_snapshot s ON s.client_id = c.id
WHERE c.id = auth.uid();

-- ── STEP 4: Storage bucket ────────────────────────────────────
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

-- ── STEP 5: Verify ────────────────────────────────────────────
SELECT
  'client_goals.status column'           AS check_name,
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_goals' AND column_name='status') AS passed
UNION ALL SELECT
  'client_financial_snapshot table',
  EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name='client_financial_snapshot')
UNION ALL SELECT
  'client_profile_view.total_assets',
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_profile_view' AND column_name='total_assets')
UNION ALL SELECT
  'documents bucket',
  EXISTS (SELECT 1 FROM storage.buckets WHERE id='documents')
UNION ALL SELECT
  'snapshot RLS enabled',
  (SELECT rowsecurity FROM pg_tables WHERE tablename='client_financial_snapshot')
UNION ALL SELECT
  'your profile row exists',
  EXISTS (SELECT 1 FROM public.client_profile_view);
