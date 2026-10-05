-- APPLIED to the App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-03 as migrations integration_identity_release_2026_10_03 and
-- integration_identity_release_retry_2026_10_03 (combined here). Step 5, BORROWER side. Inert until INTEGRATION_ACCEPTANCE_ENABLED.
-- integration.identity_release records every identity release: who, which request and bid, exactly which fields (and the exact
-- snapshot sent), the outcome and the bank. A retry of an unfinished or failed attempt returns the SAME consent_ref and the
-- IDENTICAL snapshot, so the portal (Idempotency-Key = consent_ref) replays its stored answer if it had already accepted.
-- VERIFIED (rolled back, real request and its real owner, field values never printed): released fields are the same set today's
-- flow releases; the anonymous id equals the one step 3 published for that request; audit row prepared, completed once, a later
-- completion cannot overwrite; another client is refused; anon denied; retry semantics (unfinished -> same key + same body;
-- failed -> same key; refused -> new key).
CREATE TABLE IF NOT EXISTS integration.identity_release (
  consent_ref       text PRIMARY KEY,
  client_id         uuid        NOT NULL,
  request_id        uuid        NOT NULL,
  bid_id            uuid        NOT NULL,
  fields_released   text[]      NOT NULL,
  prepared_at       timestamptz NOT NULL DEFAULT now(),
  outcome           text        NOT NULL DEFAULT 'prepared' CHECK (outcome IN ('prepared','accepted','refused','failed')),
  institution_id    uuid,
  completed_at      timestamptz,
  anon_borrower_id  uuid,
  released_identity jsonb
);
CREATE INDEX IF NOT EXISTS identity_release_client_idx ON integration.identity_release (client_id, prepared_at DESC);
ALTER TABLE integration.identity_release ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.identity_release FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION integration.prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
DECLARE owner uuid; ident jsonb; ref text; fields text[]; prev record;
BEGIN
  SELECT r.client_id INTO owner FROM public.requests r WHERE r.id = p_request;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002'; END IF;
  IF owner IS DISTINCT FROM p_client THEN RAISE EXCEPTION 'not the request owner' USING ERRCODE = '42501'; END IF;
  SELECT ir.consent_ref, ir.anon_borrower_id, ir.released_identity INTO prev
    FROM integration.identity_release ir
   WHERE ir.client_id = p_client AND ir.request_id = p_request AND ir.bid_id = p_bid AND ir.outcome IN ('prepared','failed')
     AND ir.released_identity IS NOT NULL
   ORDER BY ir.prepared_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE integration.identity_release SET outcome = 'prepared', completed_at = NULL WHERE consent_ref = prev.consent_ref;
    RETURN jsonb_build_object('anon_borrower_id', prev.anon_borrower_id, 'released_identity', prev.released_identity,
                              'consent_ref', prev.consent_ref, 'retry', true);
  END IF;
  SELECT jsonb_strip_nulls(jsonb_build_object(
           'full_name', nullif(btrim(c.full_name), ''), 'email', nullif(btrim(c.email), ''), 'phone', nullif(btrim(c.phone), ''),
           'address', nullif(concat_ws(', ', nullif(btrim(c.address_line_1), ''), nullif(btrim(c.city), ''), nullif(btrim(c.postal_code), '')), ''),
           'date_of_birth', c.date_of_birth, 'document_number', k.document_number))
    INTO ident
    FROM public.clients c
    LEFT JOIN LATERAL (SELECT ks.document_number FROM public.kyc_submissions ks
                        WHERE ks.client_id = c.id AND ks.status = 'approved' ORDER BY ks.submitted_at DESC LIMIT 1) k ON true
   WHERE c.id = p_client;
  IF ident IS NULL OR NOT (ident ? 'full_name') THEN
    RAISE EXCEPTION 'no name on file: identity cannot be released' USING ERRCODE = 'P0001';
  END IF;
  IF ident ? 'email' AND NOT (ident ->> 'email' ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    ident := ident - 'email';
  END IF;
  ref := 'consent_' || replace(gen_random_uuid()::text, '-', '');
  SELECT array_agg(k ORDER BY k) INTO fields FROM jsonb_object_keys(ident) k;
  INSERT INTO integration.identity_release (consent_ref, client_id, request_id, bid_id, fields_released, anon_borrower_id, released_identity)
  VALUES (ref, p_client, p_request, p_bid, fields, integration.anon_borrower_id(p_client), ident);
  RETURN jsonb_build_object('anon_borrower_id', integration.anon_borrower_id(p_client), 'released_identity', ident,
                            'consent_ref', ref, 'retry', false);
END $$;

CREATE OR REPLACE FUNCTION integration.complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  UPDATE integration.identity_release SET outcome = p_outcome, institution_id = p_institution, completed_at = now()
   WHERE consent_ref = p_consent_ref AND outcome = 'prepared';
$$;

CREATE OR REPLACE FUNCTION public.integration_prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.prepare_acceptance(p_client, p_request, p_bid);
$$;
CREATE OR REPLACE FUNCTION public.integration_complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.complete_acceptance(p_consent_ref, p_outcome, p_institution);
$$;
REVOKE ALL ON FUNCTION integration.prepare_acceptance(uuid, uuid, uuid), integration.complete_acceptance(text, text, uuid),
  public.integration_prepare_acceptance(uuid, uuid, uuid), public.integration_complete_acceptance(text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_prepare_acceptance(uuid, uuid, uuid), public.integration_complete_acceptance(text, text, uuid) TO service_role;
