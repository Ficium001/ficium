-- KYC server access through two narrow functions (2026-10-30).
--
-- service_role deliberately has no table rights on public.clients or
-- public.kyc_submissions (PII lockdown). The verify endpoint therefore reaches
-- them only through these definer functions, executable by service_role alone:
--   kyc_server_context  what verification needs: the borrower's own name,
--                       submissions in the last 24 h, whether a document number
--                       is already used by another borrower
--   kyc_record_outcome  the submission row (every outcome) and, unless
--                       rejected, the borrower's KYC status and address
-- (Before this, the velocity and document-reuse checks read the tables with
-- service_role, were refused, and silently counted nothing.)

CREATE OR REPLACE FUNCTION public.kyc_server_context(p_client uuid, p_document_number text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'full_name', (SELECT c.full_name FROM public.clients c WHERE c.id = p_client),
    'attempts_24h', (SELECT count(*) FROM public.kyc_submissions s
                      WHERE s.client_id = p_client AND s.submitted_at >= now() - interval '24 hours'),
    'document_reused', CASE WHEN coalesce(p_document_number, '') = '' THEN false ELSE EXISTS (
        SELECT 1 FROM public.kyc_submissions s
         WHERE s.document_number = p_document_number AND s.client_id <> p_client) END)
$$;

CREATE OR REPLACE FUNCTION public.kyc_record_outcome(
  p_client uuid, p_status text, p_submission jsonb, p_profile jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sid uuid;
BEGIN
  IF p_status NOT IN ('verified', 'pending_review', 'rejected') THEN
    RAISE EXCEPTION 'invalid KYC status %', p_status USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client) THEN
    RAISE EXCEPTION 'unknown client' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.kyc_submissions (
    client_id, status, provider, reference_id, risk_score, flags, details,
    mrz_valid, face_match_score, name_match_score, document_expired,
    document_type, document_number, id_document_path, selfie_path,
    proof_of_address_path, permit_path, nationality, residence_status,
    same_nationality_residence)
  VALUES (
    p_client, p_status, p_submission->>'provider', p_submission->>'reference_id',
    (p_submission->>'risk_score')::int,
    coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(p_submission->'flags', '[]'))), '{}'),
    p_submission->'details',
    (p_submission->>'mrz_valid')::boolean, (p_submission->>'face_match_score')::numeric,
    (p_submission->>'name_match_score')::int, (p_submission->>'document_expired')::boolean,
    p_submission->>'document_type', p_submission->>'document_number',
    p_submission->>'id_document_path', p_submission->>'selfie_path',
    p_submission->>'proof_of_address_path', p_submission->>'permit_path',
    p_submission->>'nationality', p_submission->>'residence_status',
    coalesce((p_submission->>'same_nationality_residence')::boolean, true))
  RETURNING id INTO sid;

  IF p_status <> 'rejected' THEN   -- a rejection is on record; the borrower may retry
    UPDATE public.clients SET
      kyc_status       = p_status::public.kyc_status,
      date_of_birth    = coalesce((p_profile->>'date_of_birth')::date, date_of_birth),
      address_line_1   = coalesce(p_profile->>'address_line_1', address_line_1),
      address_line_2   = nullif(p_profile->>'address_line_2', ''),
      city             = coalesce(p_profile->>'city', city),
      postal_code      = nullif(p_profile->>'postal_code', ''),
      country          = coalesce(p_profile->>'country', country),
      nationality      = coalesce(nullif(p_profile->>'nationality', ''), nationality),
      residence_status = coalesce(nullif(p_profile->>'residence_status', ''), residence_status)
    WHERE id = p_client;
  END IF;
  RETURN sid;
END $$;

REVOKE ALL ON FUNCTION public.kyc_server_context(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kyc_record_outcome(uuid, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kyc_server_context(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.kyc_record_outcome(uuid, text, jsonb, jsonb) TO service_role;
