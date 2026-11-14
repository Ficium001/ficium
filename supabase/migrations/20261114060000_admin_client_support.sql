-- Borrower support for the app admin site (ficium-admin), App DB side.
--
-- Staff look a borrower up and can suspend or reinstate them. The admin site never connects to
-- this database: reads arrive over the signed admin channel (/api/internal?op=admin-clients) and
-- call the two service_role-only functions below; suspensions are decided in the admin database
-- (four-eyes, audited) and arrive here as admin-sync events (topic client.access_changed).
--
-- Reads return only what support needs: no date of birth, address, NIC, income or documents.

-- 1. Search ─────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_client_search(p_q text, p_limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  q   text := btrim(coalesce(p_q, ''));
  pat text;
BEGIN
  IF length(q) < 3 THEN
    RAISE EXCEPTION 'search needs at least 3 characters' USING ERRCODE = '22023';
  END IF;
  pat := replace(replace(replace(lower(q), '\', '\\'), '%', '\%'), '_', '\_');
  RETURN coalesce((
    SELECT jsonb_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT c.id AS client_id, c.full_name, c.email, c.kyc_status::text AS kyc_status, c.created_at,
             (u.banned_until IS NOT NULL AND u.banned_until > now()) AS suspended,
             (ac.client_id IS NOT NULL) AS closed
        FROM public.clients c
        LEFT JOIN auth.users u ON u.id = c.id
        LEFT JOIN public.account_closures ac ON ac.client_id = c.id
       WHERE c.id::text = lower(q)
          OR lower(c.email) LIKE pat || '%'
          OR lower(c.full_name) LIKE '%' || pat || '%'
       ORDER BY c.created_at DESC
       LIMIT least(greatest(coalesce(p_limit, 25), 1), 50)) r), '[]'::jsonb);
END $$;

-- 2. One borrower ───────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_client_summary(p_client_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
    'client_id', c.id, 'full_name', c.full_name, 'email', c.email,
    'phone_last4', nullif(right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 4), ''),
    'user_type', c.user_type, 'country', c.country,
    'kyc_status', c.kyc_status::text, 'kyc_submitted_at', c.kyc_submitted_at,
    'created_at', c.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed', u.email_confirmed_at IS NOT NULL,
    'suspended', (u.banned_until IS NOT NULL AND u.banned_until > now()),
    'closed_at', ac.closed_at, 'retain_until', ac.retain_until,
    'requests', coalesce((SELECT jsonb_object_agg(s, n) FROM (
                  SELECT r.status::text AS s, count(*) AS n FROM public.requests r
                   WHERE r.client_id = c.id GROUP BY 1) x), '{}'::jsonb),
    'recent_requests', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
                  SELECT r.id, r.product_type::text AS product_type, r.amount, r.status::text AS status, r.created_at
                    FROM public.requests r WHERE r.client_id = c.id
                   ORDER BY r.created_at DESC LIMIT 10) x), '[]'::jsonb)
  ) END
  FROM (SELECT p_client_id AS id) k
  LEFT JOIN public.clients c ON c.id = k.id
  LEFT JOIN auth.users u ON u.id = c.id
  LEFT JOIN public.account_closures ac ON ac.client_id = c.id
$$;

REVOKE ALL ON FUNCTION public.admin_client_search(text, integer), public.admin_client_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_client_search(text, integer), public.admin_client_summary(uuid) TO service_role;

-- 3. Suspend / reinstate (applied from admin-sync) ──────────────────────────────────────────────
-- Suspending blocks sign-in, ends every session and closes requests still out for offers (banks
-- are told through the existing integration trigger). Reinstating only lifts the block.
CREATE OR REPLACE FUNCTION admin._sync_client_access(p jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_client  uuid := (p->>'client_id')::uuid;
  v_suspend boolean := (p->>'suspended')::boolean;
  v_closed  integer := 0;
BEGIN
  IF v_suspend IS NULL OR coalesce(length(p->>'reason'), 0) < 10 THEN
    RAISE EXCEPTION 'invalid client access event' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client) THEN
    RAISE EXCEPTION 'unknown client' USING ERRCODE = 'P0002';
  END IF;

  UPDATE auth.users SET banned_until = CASE WHEN v_suspend THEN 'infinity'::timestamptz ELSE NULL END,
                        updated_at = now()
   WHERE id = v_client;

  IF v_suspend THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = v_client::text;
    DELETE FROM auth.sessions WHERE user_id = v_client;
    UPDATE public.requests SET status = 'closed'
     WHERE client_id = v_client AND status::text = 'open';
    GET DIAGNOSTICS v_closed = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_events
    (client_id, actor_id, actor_type, action_category, event_label,
     resource_type, resource_id, state_after, outcome, outcome_note)
  VALUES
    (v_client, coalesce((p->>'approved_by_id')::uuid, v_client), 'ficium_admin',
     CASE WHEN v_suspend THEN 'account.suspend' ELSE 'account.reinstate' END,
     CASE WHEN v_suspend THEN 'Account suspended by Ficium' ELSE 'Account reinstated by Ficium' END,
     'client', v_client,
     jsonb_build_object('requested_by', p->>'requested_by', 'approved_by', p->>'approved_by',
                        'open_requests_closed', v_closed),
     'success', left(p->>'reason', 500));
END $$;

REVOKE ALL ON FUNCTION admin._sync_client_access(jsonb) FROM PUBLIC, anon, authenticated;

-- 4. Route the new topic through admin.sync_apply (same checks as every other topic).
CREATE OR REPLACE FUNCTION admin.sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE cur bigint; outcome text;
BEGIN
  IF p_event_id IS NULL OR p_version IS NULL OR p_version < 1 OR p_payload IS NULL THEN
    RAISE EXCEPTION 'invalid sync event' USING ERRCODE = '22023';
  END IF;
  -- topic, aggregate and payload must agree: no cross-wiring
  IF NOT (
       (p_topic IN ('offer.listing_upserted','offer.listing_removed') AND p_aggregate_type = 'offer'
          AND p_aggregate_id = p_payload->>'id')
    OR (p_topic = 'kyc.policy_changed' AND p_aggregate_type = 'kyc_policy' AND p_aggregate_id = 'global'
          AND (p_payload->>'version')::bigint = p_version)
    OR (p_topic = 'config.setting_changed' AND p_aggregate_type = 'setting' AND p_aggregate_id = p_payload->>'key'
          AND (p_payload->>'version')::bigint = p_version)
    OR (p_topic = 'kyc.case_decided' AND p_aggregate_type = 'kyc_submission'
          AND p_aggregate_id = p_payload->>'submission_id' AND p_version = 1)
    OR (p_topic = 'client.access_changed' AND p_aggregate_type = 'client'
          AND p_aggregate_id = p_payload->>'client_id' AND (p_payload->>'version')::bigint = p_version)) THEN
    RAISE EXCEPTION 'unknown topic or inconsistent event %', p_topic USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM admin.sync_log WHERE event_id = p_event_id) THEN RETURN 'duplicate'; END IF;

  INSERT INTO admin.sync_state (aggregate_type, aggregate_id, applied_version, last_event_id)
  VALUES (p_aggregate_type, p_aggregate_id, 0, p_event_id) ON CONFLICT DO NOTHING;
  SELECT applied_version INTO cur FROM admin.sync_state
   WHERE aggregate_type = p_aggregate_type AND aggregate_id = p_aggregate_id FOR UPDATE;

  IF p_version <= cur THEN
    outcome := 'stale';
  ELSE
    CASE p_topic
      WHEN 'offer.listing_upserted' THEN PERFORM admin._sync_offer_upsert(p_payload);
      WHEN 'offer.listing_removed'  THEN DELETE FROM public.offer_listing WHERE id = (p_payload->>'id')::uuid;
      WHEN 'kyc.policy_changed'     THEN PERFORM admin._sync_kyc(p_event_id, p_payload);
      WHEN 'config.setting_changed' THEN PERFORM admin._sync_config(p_payload);
      WHEN 'kyc.case_decided'       THEN PERFORM admin._sync_kyc_decision(p_payload);
      WHEN 'client.access_changed'  THEN PERFORM admin._sync_client_access(p_payload);
    END CASE;
    UPDATE admin.sync_state SET applied_version = p_version, last_event_id = p_event_id, applied_at = now()
     WHERE aggregate_type = p_aggregate_type AND aggregate_id = p_aggregate_id;
    outcome := 'applied';
  END IF;

  INSERT INTO admin.sync_log (event_id, topic, aggregate_type, aggregate_id, aggregate_version, outcome)
  VALUES (p_event_id, p_topic, p_aggregate_type, p_aggregate_id, p_version, outcome)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN outcome;
END $function$;
