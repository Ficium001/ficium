-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 PHASE 2 — FILE 2: admin.audit_events (Platform Admin WORM Audit)
-- Logs all Ficium admin actions: approvals, suspensions, config changes
-- WORM: INSERT-only via RLS — no UPDATE or DELETE ever
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Create table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin.audit_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Context
  admin_id          uuid        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  institution_id    uuid        REFERENCES institution.institutions(id) ON DELETE SET NULL,
  -- Actor
  actor_id          uuid        NOT NULL,
  actor_type        text        NOT NULL DEFAULT 'ficium_admin'
                                CHECK (actor_type IN ('ficium_admin','system')),
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
ALTER TABLE admin.audit_events ENABLE ROW LEVEL SECURITY;

-- Only Ficium admins can read audit events
CREATE POLICY "admin_audit_select" ON admin.audit_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin.admin_users
      WHERE id = auth.uid() AND active = true
    )
  );

-- System and admins can insert
CREATE POLICY "admin_audit_insert" ON admin.audit_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin.admin_users
      WHERE id = auth.uid() AND active = true
    )
  );

-- NO UPDATE policy — WORM
-- NO DELETE policy — WORM

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id
  ON admin.audit_events(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_institution_id
  ON admin.audit_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at
  ON admin.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action
  ON admin.audit_events(action_category);

-- ── write_admin_audit() helper function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION admin.write_admin_audit(
  p_action_category text,
  p_event_label     text,
  p_institution_id  uuid    DEFAULT NULL,
  p_resource_type   text    DEFAULT NULL,
  p_resource_id     uuid    DEFAULT NULL,
  p_state_before    jsonb   DEFAULT NULL,
  p_state_after     jsonb   DEFAULT NULL,
  p_outcome         text    DEFAULT 'success',
  p_outcome_note    text    DEFAULT NULL,
  p_actor_ip        inet    DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO admin.audit_events (
    admin_id, institution_id, actor_id, actor_type, actor_ip,
    action_category, event_label, resource_type, resource_id,
    state_before, state_after, outcome, outcome_note
  ) VALUES (
    auth.uid(), p_institution_id, auth.uid(), 'ficium_admin', p_actor_ip,
    p_action_category, p_event_label, p_resource_type, p_resource_id,
    p_state_before, p_state_after, p_outcome, p_outcome_note
  ) RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END; $$;

GRANT EXECUTE ON FUNCTION admin.write_admin_audit TO authenticated;
REVOKE EXECUTE ON FUNCTION admin.write_admin_audit FROM anon;

-- ── Auto-audit triggers ───────────────────────────────────────────────────────

-- Trigger: log institution approval/suspension changes
CREATE OR REPLACE FUNCTION public.trg_audit_institution_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Approval change
  IF OLD.approved IS DISTINCT FROM NEW.approved THEN
    INSERT INTO admin.audit_events (
      institution_id, actor_id, actor_type,
      action_category, event_label,
      resource_type, resource_id,
      state_before, state_after, outcome
    ) VALUES (
      NEW.id, auth.uid(), 'ficium_admin',
      CASE WHEN NEW.approved THEN 'institution.approve' ELSE 'institution.suspend' END,
      CASE WHEN NEW.approved THEN 'Institution approved' ELSE 'Institution suspended' END,
      'institutions', NEW.id,
      jsonb_build_object('approved', OLD.approved, 'onboarding_stage', OLD.onboarding_stage),
      jsonb_build_object('approved', NEW.approved, 'onboarding_stage', NEW.onboarding_stage),
      'success'
    );
  END IF;

  -- Suspension change (suspended_at)
  IF OLD.suspended_at IS DISTINCT FROM NEW.suspended_at THEN
    INSERT INTO admin.audit_events (
      institution_id, actor_id, actor_type,
      action_category, event_label,
      resource_type, resource_id,
      state_before, state_after, outcome
    ) VALUES (
      NEW.id, auth.uid(), 'ficium_admin',
      'institution.suspend',
      CASE WHEN NEW.suspended_at IS NOT NULL THEN 'Institution suspended' ELSE 'Institution unsuspended' END,
      'institutions', NEW.id,
      jsonb_build_object('suspended_at', OLD.suspended_at),
      jsonb_build_object('suspended_at', NEW.suspended_at),
      'success'
    );
  END IF;

  -- Modules change
  IF OLD.modules IS DISTINCT FROM NEW.modules THEN
    INSERT INTO admin.audit_events (
      institution_id, actor_id, actor_type,
      action_category, event_label,
      resource_type, resource_id,
      state_before, state_after, outcome
    ) VALUES (
      NEW.id, auth.uid(), 'ficium_admin',
      'institution.modules_update', 'Institution modules updated',
      'institutions', NEW.id,
      jsonb_build_object('modules', OLD.modules),
      jsonb_build_object('modules', NEW.modules),
      'success'
    );
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_institution_change_audit ON institution.institutions;
CREATE TRIGGER on_institution_change_audit
  AFTER UPDATE ON institution.institutions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_institution_change();

-- ── Unified audit view (admin sees everything) ────────────────────────────────
CREATE OR REPLACE VIEW admin.unified_audit
WITH (security_invoker=false)
AS
  -- Institution audit events
  SELECT
    'institution'   AS source_schema,
    ae.id,
    ae.institution_id,
    NULL::uuid      AS client_id,
    ae.actor_id,
    ae.actor_type,
    ae.actor_role,
    ae.action_category,
    ae.event_label,
    ae.resource_type,
    ae.resource_id,
    ae.state_before,
    ae.state_after,
    ae.outcome,
    ae.outcome_note,
    ae.created_at,
    i.name          AS institution_name
  FROM institution.audit_events ae
  LEFT JOIN institution.institutions i ON i.id = ae.institution_id

  UNION ALL

  -- Client audit events
  SELECT
    'public'        AS source_schema,
    ae.id,
    NULL::uuid      AS institution_id,
    ae.client_id,
    ae.actor_id,
    ae.actor_type,
    ae.actor_role,
    ae.action_category,
    ae.event_label,
    ae.resource_type,
    ae.resource_id,
    ae.state_before,
    ae.state_after,
    ae.outcome,
    ae.outcome_note,
    ae.created_at,
    NULL::text      AS institution_name
  FROM public.audit_events ae

  UNION ALL

  -- Admin audit events
  SELECT
    'admin'         AS source_schema,
    ae.id,
    ae.institution_id,
    NULL::uuid      AS client_id,
    ae.actor_id,
    ae.actor_type,
    NULL::text      AS actor_role,
    ae.action_category,
    ae.event_label,
    ae.resource_type,
    ae.resource_id,
    ae.state_before,
    ae.state_after,
    ae.outcome,
    ae.outcome_note,
    ae.created_at,
    i.name          AS institution_name
  FROM admin.audit_events ae
  LEFT JOIN institution.institutions i ON i.id = ae.institution_id

ORDER BY created_at DESC;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  'admin.audit_events created' AS status,
  (SELECT count(*) FROM pg_policies WHERE tablename='audit_events' AND schemaname='admin') AS policies,
  (SELECT count(*) FROM pg_indexes WHERE tablename='audit_events' AND schemaname='admin') AS indexes;
