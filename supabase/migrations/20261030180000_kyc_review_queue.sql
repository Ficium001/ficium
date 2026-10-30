-- KYC review queue, borrower side (2026-10-30).
--
-- Staff review flagged KYC submissions on the app admin site (ficium-admin).
-- That site is the master for decisions and their audit; it never connects to
-- this database. It reads cases through the signed internal API
-- (/api/internal?op=admin-kyc), which calls the two read functions below as
-- service_role, and sends each decision through the existing admin sync
-- channel as topic 'kyc.case_decided'.
--
-- A decision applies once per submission (aggregate version 1). It always
-- records the review on that submission; it changes the borrower's KYC status
-- only if that submission is still the borrower's latest and the borrower is
-- still awaiting review, so a stale decision can't overwrite a newer outcome.

-- ── reads (service_role only) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_kyc_cases(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(c ORDER BY c.waiting DESC, c.submitted_at), '[]'::jsonb) FROM (
    SELECT s.id AS submission_id, s.client_id, s.submitted_at, s.status, s.risk_score,
           coalesce(s.flags, '{}') AS flags, s.document_type,
           right(coalesce(s.document_number, ''), 4) AS document_last4,
           s.reviewed_at, s.review_note, c.full_name, c.kyc_status::text AS client_kyc_status,
           (s.status IN ('pending_review', 'under_review')) AS waiting
      FROM public.kyc_submissions s JOIN public.clients c ON c.id = s.client_id
     WHERE s.status IN ('pending_review', 'under_review')
        OR s.reviewed_at > now() - interval '30 days'
     ORDER BY (s.status IN ('pending_review', 'under_review')) DESC, s.submitted_at
     LIMIT least(greatest(coalesce(p_limit, 100), 1), 500)) c
$$;

CREATE OR REPLACE FUNCTION public.admin_kyc_case(p_submission uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'submission_id', s.id, 'client_id', s.client_id, 'submitted_at', s.submitted_at,
    'status', s.status, 'risk_score', s.risk_score, 'flags', coalesce(s.flags, '{}'),
    'provider', s.provider, 'reference_id', s.reference_id,
    'document_type', s.document_type, 'document_number', s.document_number,
    'mrz_valid', s.mrz_valid, 'face_match_score', s.face_match_score,
    'name_match_score', s.name_match_score, 'document_expired', s.document_expired,
    'nationality', s.nationality, 'residence_status', s.residence_status,
    'reviewed_at', s.reviewed_at, 'review_note', s.review_note,
    'paths', jsonb_build_object('id', s.id_document_path, 'selfie', s.selfie_path,
                                'proof_of_address', s.proof_of_address_path, 'permit', s.permit_path),
    'ai', s.details->'aiAnalysis',
    'client', jsonb_build_object('full_name', c.full_name, 'date_of_birth', c.date_of_birth,
        'city', c.city, 'country', c.country, 'kyc_status', c.kyc_status::text, 'since', c.created_at),
    'is_latest', NOT EXISTS (SELECT 1 FROM public.kyc_submissions n
                              WHERE n.client_id = s.client_id AND n.submitted_at > s.submitted_at),
    'previous', (SELECT coalesce(jsonb_agg(jsonb_build_object('submitted_at', p.submitted_at,
                   'status', p.status, 'risk_score', p.risk_score) ORDER BY p.submitted_at DESC), '[]'::jsonb)
                   FROM public.kyc_submissions p WHERE p.client_id = s.client_id AND p.id <> s.id))
  FROM public.kyc_submissions s JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_submission
$$;

REVOKE ALL ON FUNCTION public.admin_kyc_cases(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_kyc_case(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kyc_cases(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_kyc_case(uuid) TO service_role;

-- ── the decision, applied from the admin sync channel ─────────────────────
CREATE OR REPLACE FUNCTION admin._sync_kyc_decision(p jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sub public.kyc_submissions; d text := p->>'decision'; latest boolean;
BEGIN
  IF d NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'invalid KYC decision %', d USING ERRCODE = '22023';
  END IF;
  SELECT * INTO sub FROM public.kyc_submissions WHERE id = (p->>'submission_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown KYC submission' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.kyc_submissions
     SET status = d, reviewed_at = coalesce((p->>'decided_at')::timestamptz, now()),
         review_note = left(format('%s (%s)', p->>'reason', p->>'reviewer'), 2000)
   WHERE id = sub.id;

  latest := NOT EXISTS (SELECT 1 FROM public.kyc_submissions n
                         WHERE n.client_id = sub.client_id AND n.submitted_at > sub.submitted_at);
  IF latest THEN
    UPDATE public.clients SET kyc_status = d::public.kyc_status
     WHERE id = sub.client_id AND kyc_status IN ('pending_review', 'under_review');
    IF FOUND THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
      VALUES (sub.client_id, 'kyc_decision',
              CASE d WHEN 'verified' THEN 'Identity verified' ELSE 'Identity check unsuccessful' END,
              CASE d WHEN 'verified' THEN 'Your identity has been verified. You can now send requests to banks.'
                     ELSE 'We could not verify your identity from the documents provided. Please submit them again.' END,
              CASE d WHEN 'verified' THEN '/requests/new' ELSE '/onboarding/kyc' END,
              jsonb_build_object('submission_id', sub.id));
    END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION admin._sync_kyc_decision(jsonb) FROM PUBLIC, anon, authenticated;

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
          AND p_aggregate_id = p_payload->>'submission_id' AND p_version = 1)) THEN
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
