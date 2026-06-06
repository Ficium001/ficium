-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM — Credit Ratings Table
-- Standalone table, separate from KYC. Linked to clients via client_id.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.credit_ratings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Rating output
  rating              TEXT NOT NULL,               -- e.g. "BBB+", "A-", "D"
  pd                  NUMERIC(6,4) NOT NULL,        -- probability of default 0.0000–1.0000
  pd_percent          TEXT NOT NULL,               -- human-readable e.g. "1.50%"
  risk_category       TEXT NOT NULL,               -- "Investment Grade" | "Speculative Grade" | "Distressed"
  recommendation      TEXT NOT NULL,

  -- Detailed breakdown
  pillar_scores       JSONB NOT NULL DEFAULT '{}', -- per-pillar scores
  audit_trail         JSONB NOT NULL DEFAULT '[]', -- factor-by-factor breakdown

  -- Input snapshot (what data was used to compute this rating)
  input_snapshot      JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  rated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rating_version      TEXT NOT NULL DEFAULT '1.0.0', -- engine version
  rated_by            TEXT NOT NULL DEFAULT 'auto',  -- "auto" | admin user id

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_ratings_client_id  ON public.credit_ratings(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_ratings_rating      ON public.credit_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_credit_ratings_risk_cat    ON public.credit_ratings(risk_category);
CREATE INDEX IF NOT EXISTS idx_credit_ratings_rated_at    ON public.credit_ratings(rated_at DESC);

-- RLS
ALTER TABLE public.credit_ratings ENABLE ROW LEVEL SECURITY;

-- Admins can see all ratings
CREATE POLICY "admin_full_access" ON public.credit_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin.admin_users WHERE id = auth.uid())
  );

-- Clients can only see their own rating
CREATE POLICY "client_own_rating" ON public.credit_ratings
  FOR SELECT USING (
    client_id = auth.uid()
  );

-- Institutions can read ratings for clients who have active requests
CREATE POLICY "institution_read_ratings" ON public.credit_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_requests cr
      WHERE cr.client_id = credit_ratings.client_id
      AND cr.status IN ('open', 'bidding', 'accepted')
    )
  );

COMMENT ON TABLE public.credit_ratings IS 'Credit scores computed by the Ficium Rating Engine. Separate from KYC — KYC verifies identity, credit_ratings assess creditworthiness.';
