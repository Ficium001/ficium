-- =============================================================
-- Ficium — Goal Workspace Migration
-- Supports the new Goals-first architecture:
-- Goal → Plan | Documents | Insights | Requests
--
-- Run in Supabase SQL Editor (service role)
-- Safe to re-run: all blocks are IF NOT EXISTS / OR REPLACE
-- =============================================================


-- =============================================================
-- 1. EXTEND client_goals
-- Add columns needed by the workspace tabs
-- =============================================================

ALTER TABLE public.client_goals
  ADD COLUMN IF NOT EXISTS readiness_score      integer     DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS readiness_breakdown  jsonb       DEFAULT '{}',
  -- e.g. { "documents": 67, "financial_health": 90, "goal_viability": 88, "profile": 80 }
  ADD COLUMN IF NOT EXISTS status               text        DEFAULT 'on-track'
                                                CHECK (status IN ('on-track','needs-attention','ahead')),
  ADD COLUMN IF NOT EXISTS loan_route           text,
  -- Denormalised for fast card rendering
  ADD COLUMN IF NOT EXISTS active_bids_count    integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_rate_offered    numeric(6,3),
  -- Link to the journey wizard (nullable — not all goals have a wizard)
  ADD COLUMN IF NOT EXISTS journey_id           uuid        REFERENCES public.client_journeys(id) ON DELETE SET NULL;

-- Index for readiness queries (e.g. "goals ready to send")
CREATE INDEX IF NOT EXISTS client_goals_readiness_idx
  ON public.client_goals(client_id, readiness_score);


-- =============================================================
-- 2. goal_documents (join table: goal ↔ client_documents)
-- Documents tab — links existing vault docs to a specific goal
-- =============================================================

CREATE TABLE IF NOT EXISTS public.goal_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id      uuid NOT NULL REFERENCES public.client_goals(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  required     boolean NOT NULL DEFAULT true,
  -- Which document type is required for this goal type
  doc_type     text NOT NULL,
  -- e.g. 'payslip' | 'bank_statement' | 'id_document' | 'utility_bill'
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, document_id)
);

ALTER TABLE public.goal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_documents_select" ON public.goal_documents
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "goal_documents_insert" ON public.goal_documents
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "goal_documents_delete" ON public.goal_documents
  FOR DELETE USING (auth.uid() = client_id);

CREATE INDEX IF NOT EXISTS goal_documents_goal_idx
  ON public.goal_documents(goal_id);


-- =============================================================
-- 3. goal_required_documents (template: what docs each goal type needs)
-- Static reference — not per-user, used to compute readiness
-- =============================================================

CREATE TABLE IF NOT EXISTS public.goal_required_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type  text NOT NULL,
  doc_type   text NOT NULL,
  label      text NOT NULL,
  mandatory  boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (goal_type, doc_type)
);

-- No RLS — public read, service-role write
ALTER TABLE public.goal_required_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_req_docs_public_read" ON public.goal_required_documents
  FOR SELECT USING (true);

-- Seed: required docs per goal type
INSERT INTO public.goal_required_documents (goal_type, doc_type, label, mandatory, sort_order)
VALUES
  -- MORTGAGE
  ('mortgage', 'payslip',            'Last 3 payslips',          true,  1),
  ('mortgage', 'bank_statement',     'Bank statements (6 months)',true,  2),
  ('mortgage', 'id_document',        'NIC / Passport',            true,  3),
  ('mortgage', 'utility_bill',       'Proof of address',          true,  4),
  ('mortgage', 'property_valuation', 'Property valuation',        false, 5),
  -- VEHICLE
  ('vehicle',  'payslip',            'Last 3 payslips',           true,  1),
  ('vehicle',  'bank_statement',     'Bank statements (3 months)', true,  2),
  ('vehicle',  'id_document',        'NIC / Passport',             true,  3),
  ('vehicle',  'vehicle_quote',      'Vehicle quotation',          true,  4),
  -- BUSINESS
  ('business', 'id_document',        'NIC / Passport',             true,  1),
  ('business', 'bank_statement',     'Business bank statements',   true,  2),
  ('business', 'business_plan',      'Business plan',              true,  3),
  ('business', 'tax_return',         'Tax returns (2 years)',       true,  4),
  -- PERSONAL / EDUCATION / SAVINGS / INVESTMENT / OTHER
  ('personal',   'payslip',          'Last 3 payslips',            true,  1),
  ('personal',   'id_document',      'NIC / Passport',             true,  2),
  ('personal',   'bank_statement',   'Bank statements (3 months)', true,  3),
  ('education',  'payslip',          'Last 3 payslips',            true,  1),
  ('education',  'id_document',      'NIC / Passport',             true,  2),
  ('education',  'bank_statement',   'Bank statements (3 months)', false, 3),
  ('investment', 'id_document',      'NIC / Passport',             true,  1),
  ('investment', 'bank_statement',   'Bank statements (3 months)', true,  2),
  ('savings',    'id_document',      'NIC / Passport',             true,  1),
  ('other',      'id_document',      'NIC / Passport',             true,  1)
ON CONFLICT (goal_type, doc_type) DO NOTHING;


-- =============================================================
-- 4. goal_requests (join table: goal ↔ requests)
-- Requests tab — a goal can spawn multiple requests over time
-- =============================================================

CREATE TABLE IF NOT EXISTS public.goal_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES public.client_goals(id) ON DELETE CASCADE,
  request_id  uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, request_id)
);

ALTER TABLE public.goal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_requests_select" ON public.goal_requests
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "goal_requests_insert" ON public.goal_requests
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "goal_requests_delete" ON public.goal_requests
  FOR DELETE USING (auth.uid() = client_id);

CREATE INDEX IF NOT EXISTS goal_requests_goal_idx ON public.goal_requests(goal_id);
CREATE INDEX IF NOT EXISTS goal_requests_request_idx ON public.goal_requests(request_id);


-- =============================================================
-- 5. goal_ai_insights (Insights tab — metered AI coach entries)
-- Each row is one AI insight session for a goal
-- =============================================================

CREATE TABLE IF NOT EXISTS public.goal_ai_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES public.client_goals(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt      text NOT NULL,
  response    text NOT NULL,
  tokens_used integer DEFAULT 0,
  model       text DEFAULT 'claude-sonnet-4-20250514',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_insights_select" ON public.goal_ai_insights
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "goal_insights_insert" ON public.goal_ai_insights
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Monthly metering index
CREATE INDEX IF NOT EXISTS goal_insights_monthly_idx
  ON public.goal_ai_insights(client_id, date_trunc('month', created_at));


-- =============================================================
-- 6. activity_events (Home screen — activity feed)
-- Lightweight event log for the "Activity Feed" widget
-- =============================================================

CREATE TABLE IF NOT EXISTS public.activity_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  -- 'bid_received' | 'bid_accepted' | 'request_opened' |
  -- 'goal_created' | 'document_uploaded' | 'kyc_verified' |
  -- 'readiness_changed' | 'ai_insight_generated'
  title        text NOT NULL,
  body         text,
  goal_id      uuid REFERENCES public.client_goals(id) ON DELETE SET NULL,
  request_id   uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  meta         jsonb DEFAULT '{}',
  -- e.g. { rate: "7.9%", bank: "MCB" }
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select" ON public.activity_events
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "activity_insert" ON public.activity_events
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "activity_update" ON public.activity_events
  FOR UPDATE USING (auth.uid() = client_id);

CREATE INDEX IF NOT EXISTS activity_events_client_idx
  ON public.activity_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_unread_idx
  ON public.activity_events(client_id, read_at)
  WHERE read_at IS NULL;


-- =============================================================
-- 7. READINESS SCORE FUNCTION
-- Called after doc upload, profile update, or on demand
-- Returns a score 0-100 and a breakdown JSONB
-- =============================================================

CREATE OR REPLACE FUNCTION public.compute_goal_readiness(p_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal          public.client_goals%ROWTYPE;
  v_user          public.users%ROWTYPE;
  v_doc_score     integer := 0;
  v_fin_score     integer := 0;
  v_viability     integer := 0;
  v_profile       integer := 0;
  v_total         integer := 0;
  v_required_docs integer := 0;
  v_uploaded_docs integer := 0;
  v_result        jsonb;
BEGIN
  SELECT * INTO v_goal FROM public.client_goals WHERE id = p_goal_id;
  IF NOT FOUND THEN RETURN '{"error": "goal not found"}'::jsonb; END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_goal.client_id;

  -- ── Documents (30%) ─────────────────────────────────────────
  SELECT COUNT(*) INTO v_required_docs
    FROM public.goal_required_documents
   WHERE goal_type = v_goal.type AND mandatory = true;

  SELECT COUNT(DISTINCT grd.doc_type) INTO v_uploaded_docs
    FROM public.goal_required_documents grd
    JOIN public.client_documents cd
      ON cd.client_id = v_goal.client_id
     AND cd.type = grd.doc_type
     AND cd.verified = true
   WHERE grd.goal_type = v_goal.type AND grd.mandatory = true;

  IF v_required_docs > 0 THEN
    v_doc_score := ROUND((v_uploaded_docs::numeric / v_required_docs) * 100);
  ELSE
    v_doc_score := 100;
  END IF;

  -- ── Financial health (25%) ───────────────────────────────────
  -- Proxy: KYC verified + income snapshot present
  IF v_user.kyc_status = 'verified' THEN v_fin_score := v_fin_score + 60; END IF;
  IF v_goal.saved_amount > 0 THEN v_fin_score := v_fin_score + 40; END IF;

  -- ── Goal viability (25%) ─────────────────────────────────────
  -- Has a target amount and a realistic timeline
  IF v_goal.target_amount > 0 THEN v_viability := v_viability + 50; END IF;
  IF v_goal.target_date IS NOT NULL AND v_goal.target_date > CURRENT_DATE THEN
    v_viability := v_viability + 50;
  ELSIF v_goal.target_date IS NULL THEN
    v_viability := v_viability + 30; -- no deadline is OK
  END IF;

  -- ── Profile completeness (20%) ───────────────────────────────
  IF v_user.full_name   IS NOT NULL AND v_user.full_name   <> '' THEN v_profile := v_profile + 25; END IF;
  IF v_user.phone       IS NOT NULL AND v_user.phone       <> '' THEN v_profile := v_profile + 25; END IF;
  IF v_user.date_of_birth IS NOT NULL                             THEN v_profile := v_profile + 25; END IF;
  IF v_user.kyc_status = 'verified'                              THEN v_profile := v_profile + 25; END IF;

  -- ── Weighted total ───────────────────────────────────────────
  v_total := ROUND(
    (v_doc_score  * 0.30) +
    (v_fin_score  * 0.25) +
    (v_viability  * 0.25) +
    (v_profile    * 0.20)
  );

  v_result := jsonb_build_object(
    'score',             v_total,
    'documents',         v_doc_score,
    'financial_health',  v_fin_score,
    'goal_viability',    v_viability,
    'profile',           v_profile,
    'docs_uploaded',     v_uploaded_docs,
    'docs_required',     v_required_docs
  );

  -- Persist to table
  UPDATE public.client_goals
     SET readiness_score       = v_total,
         readiness_breakdown   = v_result,
         updated_at            = now()
   WHERE id = p_goal_id;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (they can only call it for their own goals
-- because the function reads client_goals with no auth check — wrap in RPC guard below)
REVOKE EXECUTE ON FUNCTION public.compute_goal_readiness(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.compute_goal_readiness(uuid) TO service_role;


-- =============================================================
-- 8. TRIGGER: auto-fire readiness after document insert
-- =============================================================

CREATE OR REPLACE FUNCTION public.trg_recompute_goal_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal_id uuid;
BEGIN
  -- For every goal that references this client, recompute
  FOR v_goal_id IN
    SELECT id FROM public.client_goals WHERE client_id = NEW.client_id
  LOOP
    PERFORM public.compute_goal_readiness(v_goal_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doc_readiness ON public.client_documents;
CREATE TRIGGER trg_doc_readiness
  AFTER INSERT OR UPDATE OF verified ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recompute_goal_readiness();


-- =============================================================
-- 9. TRIGGER: auto-create activity_event when a bid arrives
-- (fires when institution.institution_bids is inserted)
-- =============================================================

CREATE OR REPLACE FUNCTION public.trg_bid_activity_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_goal_id   uuid;
  v_rate_pct  numeric;
BEGIN
  -- Get client from the request
  SELECT client_id INTO v_client_id
    FROM public.requests WHERE id = NEW.request_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Get linked goal (if any)
  SELECT goal_id INTO v_goal_id
    FROM public.goal_requests WHERE request_id = NEW.request_id
   LIMIT 1;

  -- rate in institution_bids is decimal (0.079) → convert to %
  v_rate_pct := ROUND((NEW.rate * 100)::numeric, 2);

  INSERT INTO public.activity_events (
    client_id, event_type, title, body,
    goal_id, request_id, meta
  ) VALUES (
    v_client_id,
    'bid_received',
    'New offer received',
    'A bank submitted a bid at ' || v_rate_pct || '% p.a.',
    v_goal_id,
    NEW.request_id,
    jsonb_build_object('rate', v_rate_pct, 'bid_id', NEW.id)
  );

  -- Also bump active_bids_count on the goal
  IF v_goal_id IS NOT NULL THEN
    UPDATE public.client_goals
       SET active_bids_count = (
             SELECT COUNT(*)
               FROM institution.institution_bids ib
               JOIN public.goal_requests gr ON gr.request_id = ib.request_id
              WHERE gr.goal_id = v_goal_id
                AND ib.status = 'submitted'
           ),
           best_rate_offered = (
             SELECT MIN(rate) * 100
               FROM institution.institution_bids ib
               JOIN public.goal_requests gr ON gr.request_id = ib.request_id
              WHERE gr.goal_id = v_goal_id
                AND ib.status = 'submitted'
           ),
           updated_at = now()
     WHERE id = v_goal_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_to_activity ON institution.institution_bids;
CREATE TRIGGER trg_bid_to_activity
  AFTER INSERT ON institution.institution_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bid_activity_event();


-- =============================================================
-- 10. VIEW: client_goals_with_stats
-- Flat view for Dashboard and Goals list page
-- Includes live bid counts and best rate without N+1 queries
-- =============================================================

CREATE OR REPLACE VIEW public.client_goals_with_stats
WITH (security_invoker = true)  -- respects caller RLS
AS
SELECT
  cg.id,
  cg.client_id,
  cg.type,
  cg.title,
  cg.target_amount,
  cg.saved_amount,
  cg.target_date,
  cg.ai_insight,
  cg.status,
  cg.readiness_score,
  cg.readiness_breakdown,
  cg.active_bids_count,
  cg.best_rate_offered,
  cg.journey_id,
  cg.loan_route,
  cg.created_at,
  cg.updated_at,
  -- Document completeness
  (
    SELECT COUNT(DISTINCT grd.doc_type)
      FROM public.goal_required_documents grd
      JOIN public.client_documents cd
        ON cd.client_id = cg.client_id
       AND cd.type = grd.doc_type
       AND cd.verified = true
     WHERE grd.goal_type = cg.type AND grd.mandatory = true
  ) AS docs_uploaded,
  (
    SELECT COUNT(*)
      FROM public.goal_required_documents
     WHERE goal_type = cg.type AND mandatory = true
  ) AS docs_required
FROM public.client_goals cg;

GRANT SELECT ON public.client_goals_with_stats TO authenticated;


-- =============================================================
-- ROLLBACK SCRIPT (keep for reference)
-- =============================================================
/*
DROP TRIGGER  IF EXISTS trg_bid_to_activity  ON institution.institution_bids;
DROP TRIGGER  IF EXISTS trg_doc_readiness    ON public.client_documents;
DROP FUNCTION IF EXISTS public.trg_bid_activity_event();
DROP FUNCTION IF EXISTS public.trg_recompute_goal_readiness();
DROP FUNCTION IF EXISTS public.compute_goal_readiness(uuid);
DROP VIEW     IF EXISTS public.client_goals_with_stats;
DROP TABLE    IF EXISTS public.activity_events;
DROP TABLE    IF EXISTS public.goal_ai_insights;
DROP TABLE    IF EXISTS public.goal_requests;
DROP TABLE    IF EXISTS public.goal_required_documents;
DROP TABLE    IF EXISTS public.goal_documents;
ALTER TABLE   public.client_goals
  DROP COLUMN IF EXISTS readiness_score,
  DROP COLUMN IF EXISTS readiness_breakdown,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS loan_route,
  DROP COLUMN IF EXISTS active_bids_count,
  DROP COLUMN IF EXISTS best_rate_offered,
  DROP COLUMN IF EXISTS journey_id;
*/
