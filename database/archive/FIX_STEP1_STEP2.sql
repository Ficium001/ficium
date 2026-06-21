-- =============================================================
-- FICIUM — FIX_ALL_NOW v3
-- Drops existing view first to avoid column rename conflict.
-- =============================================================

-- ── STEP 1: Add status column to client_goals ────────────────
ALTER TABLE public.client_goals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','cancelled'));

-- ── STEP 2: Create client_financial_snapshot ─────────────────
CREATE TABLE IF NOT EXISTS public.client_financial_snapshot (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cash_savings          numeric(15,2) NOT NULL DEFAULT 0,
  fixed_deposits        numeric(15,2) NOT NULL DEFAULT 0,
  investments_value     numeric(15,2) NOT NULL DEFAULT 0,
  property_value        numeric(15,2) NOT NULL DEFAULT 0,
  vehicle_value         numeric(15,2) NOT NULL DEFAULT 0,
  other_assets          numeric(15,2) NOT NULL DEFAULT 0,
  mortgage_balance      numeric(15,2) NOT NULL DEFAULT 0,
  personal_loan_balance numeric(15,2) NOT NULL DEFAULT 0,
  credit_card_balance   numeric(15,2) NOT NULL DEFAULT 0,
  vehicle_loan_balance  numeric(15,2) NOT NULL DEFAULT 0,
  other_liabilities     numeric(15,2) NOT NULL DEFAULT 0,
  monthly_income        numeric(12,2) NOT NULL DEFAULT 0,
  monthly_expenses      numeric(12,2) NOT NULL DEFAULT 0,
  monthly_loan_payments numeric(12,2) NOT NULL DEFAULT 0,
  monthly_savings       numeric(12,2) NOT NULL DEFAULT 0,
  total_assets          numeric(15,2) GENERATED ALWAYS AS (
    cash_savings + fixed_deposits + investments_value + property_value + vehicle_value + other_assets
  ) STORED,
  total_liabilities     numeric(15,2) GENERATED ALWAYS AS (
    mortgage_balance + personal_loan_balance + credit_card_balance + vehicle_loan_balance + other_liabilities
  ) STORED,
  net_worth             numeric(15,2) GENERATED ALWAYS AS (
    (cash_savings + fixed_deposits + investments_value + property_value + vehicle_value + other_assets) -
    (mortgage_balance + personal_loan_balance + credit_card_balance + vehicle_loan_balance + other_liabilities)
  ) STORED,
  debt_to_income_ratio  numeric(5,2)  GENERATED ALWAYS AS (
    CASE WHEN monthly_income > 0
    THEN ROUND(((mortgage_balance + personal_loan_balance + credit_card_balance +
                 vehicle_loan_balance + other_liabilities) / (monthly_income * 12)) * 100, 2)
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
CREATE POLICY "snapshot_select" ON public.client_financial_snapshot FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "snapshot_insert" ON public.client_financial_snapshot FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "snapshot_update" ON public.client_financial_snapshot FOR UPDATE USING (auth.uid() = client_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN new.updated_at = NOW(); RETURN new; END; $$;

DROP TRIGGER IF EXISTS snapshot_updated_at ON public.client_financial_snapshot;
CREATE TRIGGER snapshot_updated_at BEFORE UPDATE ON public.client_financial_snapshot
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS snapshot_client_idx ON public.client_financial_snapshot(client_id);

-- ── STEP 3: See what the existing view actually looks like ────
-- This tells us the current column names so we can rebuild correctly
SELECT column_name, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'client_profile_view'
ORDER BY ordinal_position;
