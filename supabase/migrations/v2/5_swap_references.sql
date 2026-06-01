-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 5: SWAP REFERENCES
-- Updates RLS policies, views, functions to use new V2 tables
-- Only run after file 4 verification passes with 0 issues
-- ══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Enable RLS on all new V2 tables ───────────────────────────────────

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_dossier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loan_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution.institution_members ENABLE ROW LEVEL SECURITY;

-- ── STEP 2: RLS Policies — public.clients ─────────────────────────────────────

DROP POLICY IF EXISTS "client_own_row" ON public.clients;
CREATE POLICY "client_own_row" ON public.clients
  FOR ALL USING (id = auth.uid());

-- ── STEP 3: RLS Policies — public.client_dossier ─────────────────────────────

DROP POLICY IF EXISTS "client_own_dossier" ON public.client_dossier;
CREATE POLICY "client_own_dossier" ON public.client_dossier
  FOR ALL USING (client_id = auth.uid());

-- ── STEP 4: RLS Policies — public.client_loan_details ────────────────────────

DROP POLICY IF EXISTS "client_own_loan_details" ON public.client_loan_details;
CREATE POLICY "client_own_loan_details" ON public.client_loan_details
  FOR ALL USING (client_id = auth.uid());

-- ── STEP 5: RLS Policies — institution.institution_members ───────────────────

DROP POLICY IF EXISTS "members_own_institution" ON institution.institution_members;
CREATE POLICY "members_own_institution" ON institution.institution_members
  FOR ALL USING (institution_id = institution.get_my_institution_id());

-- ── STEP 6: Update get_my_institution_id to use institution_members ───────────

CREATE OR REPLACE FUNCTION institution.get_my_institution_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  -- Try new institution_members first, fall back to institution_users during transition
  SELECT COALESCE(
    (SELECT institution_id FROM institution.institution_members 
     WHERE auth_user_id = auth.uid() AND active = true LIMIT 1),
    (SELECT institution_id FROM institution.institution_users 
     WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- ── STEP 7: get_my_member_id helper (new in V2) ───────────────────────────────

CREATE OR REPLACE FUNCTION institution.get_my_member_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM institution.institution_members
  WHERE auth_user_id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- ── STEP 8: get_my_role() — replaces reading public.users.role ────────────────
-- AuthContext will call this instead of querying public.users

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT 'client' FROM public.clients WHERE id = auth.uid()),
    (SELECT 'bank'   FROM institution.institution_members 
     WHERE auth_user_id = auth.uid() AND active = true),
    (SELECT 'admin'  FROM admin.admin_users WHERE id = auth.uid() AND active = true),
    -- Fallback to old public.users during transition period
    (SELECT role::text FROM public.users WHERE id = auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ── STEP 9: Update handle_new_user trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(new.raw_user_meta_data->>'role', 'client');

  IF v_role = 'client' THEN
    -- Client goes to public.clients ONLY
    INSERT INTO public.clients (
      id, email, full_name, first_name, last_name,
      phone, title, user_type, company_name, company_registration
    ) VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'phone',
      NULLIF(new.raw_user_meta_data->>'title', '')::public.title_type,
      coalesce(new.raw_user_meta_data->>'user_type', 'individual'),
      new.raw_user_meta_data->>'company_name',
      new.raw_user_meta_data->>'company_registration'
    ) ON CONFLICT (id) DO NOTHING;

    -- Also insert into public.users during transition (keeps V1 app working)
    INSERT INTO public.users (
      id, email, full_name, first_name, last_name, phone, title,
      role, kyc_status, user_type, company_name, company_registration
    ) VALUES (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      NULLIF(new.raw_user_meta_data->>'title', '')::public.title_type,
      'client'::public.user_role,
      'pending'::public.kyc_status,
      coalesce(new.raw_user_meta_data->>'user_type', 'individual'),
      new.raw_user_meta_data->>'company_name',
      new.raw_user_meta_data->>'company_registration'
    ) ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'admin' THEN
    INSERT INTO admin.admin_users (id, email, full_name)
    VALUES (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    ) ON CONFLICT (id) DO NOTHING;

    -- Also insert into public.users during transition
    INSERT INTO public.users (
      id, email, full_name, role, kyc_status, user_type
    ) VALUES (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      'admin'::public.user_role, 'pending'::public.kyc_status, 'individual'
    ) ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'bank' THEN
    -- Bank users: insert into public.users during transition
    -- institution_members created separately via invitation flow
    INSERT INTO public.users (
      id, email, full_name, role, kyc_status, user_type
    ) VALUES (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      'bank'::public.user_role, 'pending'::public.kyc_status, 'institution'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END; $$;

-- ── STEP 10: Update marketplace_requests view ─────────────────────────────────

DROP VIEW IF EXISTS institution.marketplace_requests;

CREATE VIEW institution.marketplace_requests
WITH (security_invoker=false)
AS
SELECT
  r.id,
  r.product_type,
  r.amount,
  r.preferred_term_months,
  r.max_rate,
  r.decision_deadline,
  r.anonymized_brief,
  r.created_at,
  encode(digest(r.client_id::text, 'sha256'), 'hex') AS client_ref
FROM public.requests r
WHERE r.status = 'open'
AND r.decision_deadline > now();

-- ── STEP 11: Update submit_for_approval to use institution_members ────────────

CREATE OR REPLACE FUNCTION institution.submit_for_approval(
  p_action_category text,
  p_resource_type   text,
  p_resource_id     uuid,
  p_payload         jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institution_id uuid;
  v_action_id      uuid;
  v_role           text;
  v_member_id      uuid;
BEGIN
  v_institution_id := institution.get_my_institution_id();
  v_member_id      := institution.get_my_member_id();

  SELECT role::text INTO v_role
  FROM institution.institution_members
  WHERE auth_user_id = auth.uid() AND institution_id = v_institution_id;

  -- Fallback to institution_users during transition
  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM institution.institution_users
    WHERE user_id = auth.uid() AND institution_id = v_institution_id;
  END IF;

  INSERT INTO institution.pending_actions (
    institution_id, action_category, resource_type, resource_id,
    payload, maker_id, maker_role, action_status, expires_at
  ) VALUES (
    v_institution_id, p_action_category, p_resource_type, p_resource_id,
    p_payload, auth.uid(), coalesce(v_role,'admin'), 'pending',
    now() + interval '48 hours'
  ) RETURNING id INTO v_action_id;

  INSERT INTO institution.audit_events (
    institution_id, pending_action_id, actor_id, actor_role,
    action_category, event_label, resource_type, resource_id,
    outcome, outcome_note, state_after
  ) VALUES (
    v_institution_id, v_action_id, auth.uid(), coalesce(v_role,'admin')::institution.inst_role,
    p_action_category, p_action_category || '.submitted',
    p_resource_type, p_resource_id,
    'success', 'Submitted for approval', p_payload
  );

  RETURN v_action_id;
END; $$;

GRANT EXECUTE ON FUNCTION institution.submit_for_approval TO authenticated;
REVOKE EXECUTE ON FUNCTION institution.submit_for_approval FROM anon;

SELECT 'References swapped successfully' AS status;
