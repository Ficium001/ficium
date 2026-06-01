-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 PHASE 2 — FILE 1: public.audit_events (Client WORM Audit)
-- Mirrors institution.audit_events structure exactly
-- WORM: INSERT-only via RLS — no UPDATE or DELETE ever
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Create table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Context
  client_id         uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  pending_action_id uuid,       -- reserved for future use
  -- Actor
  actor_id          uuid        NOT NULL,
  actor_type        text        NOT NULL DEFAULT 'client_user'
                                CHECK (actor_type IN ('client_user','system','ficium_admin')),
  actor_role        text,
  actor_ip          inet,
  actor_device      text,
  -- Action
  action_category   text        NOT NULL,
  event_label       text        NOT NULL,
  resource_type     text,
  resource_id       uuid,
  -- State
  state_before      jsonb,
  state_after       jsonb,
  -- Outcome
  outcome           text        NOT NULL DEFAULT 'success'
                                CHECK (outcome IN ('success','rejected','expired','error')),
  outcome_note      text,
  -- Timestamp (NO updated_at — immutable)
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── WORM: RLS INSERT-only ─────────────────────────────────────────────────────
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Clients can only see their own audit events
CREATE POLICY "audit_client_select" ON public.audit_events
  FOR SELECT USING (actor_id = auth.uid() OR client_id = auth.uid());

-- Anyone authenticated can insert (system + client actions)
CREATE POLICY "audit_insert_only" ON public.audit_events
  FOR INSERT WITH CHECK (true);

-- NO UPDATE policy — append only
-- NO DELETE policy — append only

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_public_audit_client_id 
  ON public.audit_events(client_id);
CREATE INDEX IF NOT EXISTS idx_public_audit_actor_id 
  ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_public_audit_created_at 
  ON public.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_audit_action 
  ON public.audit_events(action_category);

-- ── write_client_audit() helper function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.write_client_audit(
  p_client_id       uuid,
  p_action_category text,
  p_event_label     text,
  p_resource_type   text    DEFAULT NULL,
  p_resource_id     uuid    DEFAULT NULL,
  p_state_before    jsonb   DEFAULT NULL,
  p_state_after     jsonb   DEFAULT NULL,
  p_outcome         text    DEFAULT 'success',
  p_outcome_note    text    DEFAULT NULL,
  p_actor_ip        inet    DEFAULT NULL,
  p_actor_device    text    DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, actor_role,
    actor_ip, actor_device, action_category, event_label,
    resource_type, resource_id, state_before, state_after,
    outcome, outcome_note
  ) VALUES (
    p_client_id, auth.uid(), 'client_user', 'client',
    p_actor_ip, p_actor_device, p_action_category, p_event_label,
    p_resource_type, p_resource_id, p_state_before, p_state_after,
    p_outcome, p_outcome_note
  ) RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.write_client_audit TO authenticated;

-- ── Auto-audit triggers ───────────────────────────────────────────────────────

-- Trigger: log KYC status changes
CREATE OR REPLACE FUNCTION public.trg_audit_kyc_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    INSERT INTO public.audit_events (
      client_id, actor_id, actor_type, action_category, event_label,
      resource_type, resource_id, state_before, state_after, outcome
    ) VALUES (
      NEW.id, NEW.id, 'client_user', 'kyc.status_change',
      'KYC status changed: ' || OLD.kyc_status || ' → ' || NEW.kyc_status,
      'clients', NEW.id,
      jsonb_build_object('kyc_status', OLD.kyc_status),
      jsonb_build_object('kyc_status', NEW.kyc_status),
      'success'
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_client_kyc_change ON public.clients;
CREATE TRIGGER on_client_kyc_change
  AFTER UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_kyc_change();

-- Trigger: log new requests
CREATE OR REPLACE FUNCTION public.trg_audit_request_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_after, outcome
  ) VALUES (
    NEW.client_id, NEW.client_id, 'client_user',
    'request.submit', 'Financing request submitted',
    'requests', NEW.id,
    jsonb_build_object(
      'product_type', NEW.product_type,
      'amount', NEW.amount,
      'status', NEW.status
    ),
    'success'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_request_created_audit ON public.requests;
CREATE TRIGGER on_request_created_audit
  AFTER INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_request_created();

-- Trigger: log bid acceptances
CREATE OR REPLACE FUNCTION public.trg_audit_bid_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_after, outcome
  ) VALUES (
    NEW.client_id, NEW.client_id, 'client_user',
    'bid.accept', 'Bid accepted by client',
    'bid_acceptances', NEW.id,
    jsonb_build_object('bid_id', NEW.bid_id, 'request_id', NEW.request_id),
    'success'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_bid_accepted_audit ON public.bid_acceptances;
CREATE TRIGGER on_bid_accepted_audit
  AFTER INSERT ON public.bid_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_bid_accepted();

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 
  'public.audit_events created' AS status,
  (SELECT count(*) FROM pg_policies WHERE tablename='audit_events' AND schemaname='public') AS policies,
  (SELECT count(*) FROM pg_indexes WHERE tablename='audit_events' AND schemaname='public') AS indexes;
