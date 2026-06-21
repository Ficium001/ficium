-- =============================================================
-- FICIUM — Fix All Missing Backend Issues
-- Run this ENTIRE script in Supabase SQL Editor at once.
-- =============================================================

-- ── STEP 1: Add missing 'status' column to client_goals ──────
ALTER TABLE public.client_goals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','cancelled'));

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'client_goals' AND column_name = 'status';

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

  -- COMPUTED COLUMNS
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

-- RLS
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

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN new.updated_at = NOW(); RETURN new; END; $$;

DROP TRIGGER IF EXISTS snapshot_updated_at ON public.client_financial_snapshot;
CREATE TRIGGER snapshot_updated_at
  BEFORE UPDATE ON public.client_financial_snapshot
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS snapshot_client_idx
  ON public.client_financial_snapshot(client_id);

-- ── STEP 3: Recreate client_profile_view with snapshot data ──
-- First check what columns exist in clients table
DO $$
DECLARE
  has_first_name boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'first_name'
  ) INTO has_first_name;
  
  IF has_first_name THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.client_profile_view AS
      SELECT
        u.id                      AS user_id,
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
        -- Snapshot (null until user fills in net worth page)
        s.total_assets,
        s.total_liabilities,
        s.net_worth              AS total_net_worth,
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
      FROM auth.users u
      JOIN public.clients cp ON cp.user_id = u.id
      LEFT JOIN public.client_financial_snapshot s ON s.client_id = u.id
      WHERE u.id = auth.uid()
    $view$;
  ELSE
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.client_profile_view AS
      SELECT
        u.id                      AS user_id,
        u.email,
        cp.full_name,
        NULL::text               AS first_name,
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
        s.total_assets,
        s.total_liabilities,
        s.net_worth              AS total_net_worth,
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
      FROM auth.users u
      JOIN public.clients cp ON cp.user_id = u.id
      LEFT JOIN public.client_financial_snapshot s ON s.client_id = u.id
      WHERE u.id = auth.uid()
    $view$;
  END IF;
END $$;

-- ── STEP 4: Create documents storage bucket ───────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg','image/png','image/webp','application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "documents_storage_policy" ON storage.objects;
CREATE POLICY "documents_storage_policy" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ── STEP 5: Verify everything ─────────────────────────────────
SELECT '✅ client_goals status column' AS check_name,
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_goals' AND column_name='status') AS passed

UNION ALL SELECT '✅ client_financial_snapshot exists',
  EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name='client_financial_snapshot') AS passed

UNION ALL SELECT '✅ client_profile_view has total_assets',
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='client_profile_view' AND column_name='total_assets') AS passed

UNION ALL SELECT '✅ documents bucket exists',
  EXISTS (SELECT 1 FROM storage.buckets WHERE id='documents') AS passed

UNION ALL SELECT '✅ snapshot RLS enabled',
  (SELECT rowsecurity FROM pg_tables
    WHERE tablename='client_financial_snapshot') AS passed;
