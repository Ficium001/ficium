-- Ficium Credit Rating — add scoring columns to kyc_submissions
-- Run in Supabase SQL Editor

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS credit_rating        TEXT,
  ADD COLUMN IF NOT EXISTS credit_pd            NUMERIC,
  ADD COLUMN IF NOT EXISTS credit_pd_percent    TEXT,
  ADD COLUMN IF NOT EXISTS credit_risk_category TEXT,
  ADD COLUMN IF NOT EXISTS credit_pillar_scores JSONB,
  ADD COLUMN IF NOT EXISTS credit_audit_trail   JSONB,
  ADD COLUMN IF NOT EXISTS credit_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS credit_rated_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_kyc_credit_rating    ON kyc_submissions(credit_rating);
CREATE INDEX IF NOT EXISTS idx_kyc_credit_rated_at  ON kyc_submissions(credit_rated_at DESC);
