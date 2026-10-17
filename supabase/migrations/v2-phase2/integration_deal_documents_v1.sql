-- App DB (wixfhjlsjkiwfvqewvmt). Contract 1.5.0, borrower side of document requests.
--
-- When a bank requests documents for a deal the borrower accepted, the borrower either shares a matching
-- copy from their vault or uploads a new one. A vault copy older than the item's max_age_days, or with no
-- known date, can't be shared: the borrower must upload new.
--
-- 1. integration.deal_documents      latest checklist per deal (deal.documents_updated, full state).
--    Applied only if the event's bid is the bid this borrower ACCEPTED (requests.accepted_bid_id).
-- 2. integration.document_submission  every share / upload attempt, for idempotency and the borrower's record.
-- 3. Service-role wrappers (integration.* is not exposed): apply the event; read a borrower's checklist;
--    record a submission start / finish. Sharing a vault copy also writes the vault access log ('share').

CREATE TABLE IF NOT EXISTS integration.deal_documents (
  pipeline_id    uuid PRIMARY KEY,
  request_id     uuid        NOT NULL,
  bid_id         uuid        NOT NULL,
  client_id      uuid        NOT NULL,
  documents      jsonb       NOT NULL,
  last_event_id  text        NOT NULL,
  last_sequence  bigint      NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_documents_request_idx ON integration.deal_documents (request_id);
ALTER TABLE integration.deal_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.deal_documents FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS integration.document_submission (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id        uuid        NOT NULL,
  requirement_id     uuid        NOT NULL,
  client_id          uuid        NOT NULL,
  source             text        NOT NULL CHECK (source IN ('vault', 'new')),
  vault_document_id  uuid        REFERENCES public.client_vault_document(id),
  document_date      date,
  upload_id          uuid,
  sha256             text        CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  status             text        NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  CHECK (source = 'new' OR (vault_document_id IS NOT NULL AND document_date IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS document_submission_deal_idx ON integration.document_submission (pipeline_id, requirement_id);
ALTER TABLE integration.document_submission ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.document_submission FROM PUBLIC, anon, authenticated;

-- ── 1. receive the checklist ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION integration.apply_deal_documents_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE
  d jsonb := p_env -> 'data';
  outcome text;
  r record;
BEGIN
  IF p_env ->> 'type' <> 'deal.documents_updated' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_deal_documents_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN
    RETURN outcome;
  END IF;

  SELECT q.client_id, q.accepted_bid_id INTO r FROM public.requests q WHERE q.id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deal.documents_updated for an unknown request: %', d ->> 'request_id';
  END IF;
  -- Phase 2 only exists for the bid the borrower accepted. Anything else is refused, and the inbox record
  -- rolls back with it, so a corrected event can still be applied.
  IF r.accepted_bid_id IS DISTINCT FROM (d ->> 'bid_id')::uuid THEN
    RAISE EXCEPTION 'deal.documents_updated for a bid the borrower did not accept: %', d ->> 'bid_id';
  END IF;

  INSERT INTO integration.deal_documents AS s
      (pipeline_id, request_id, bid_id, client_id, documents, last_event_id, last_sequence)
  VALUES ((d ->> 'pipeline_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'bid_id')::uuid, r.client_id,
          d -> 'documents', p_env ->> 'id', (p_env ->> 'sequence')::bigint)
  ON CONFLICT (pipeline_id) DO UPDATE SET documents = EXCLUDED.documents, last_event_id = EXCLUDED.last_event_id,
      last_sequence = EXCLUDED.last_sequence, updated_at = now();
  RETURN outcome;
END $$;

CREATE OR REPLACE FUNCTION public.integration_apply_deal_documents_event(p_env jsonb)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_deal_documents_event(p_env);
$$;

-- ── 2. a borrower's checklist (the API route has already checked who the caller is) ──
CREATE OR REPLACE FUNCTION public.integration_deal_documents_for(p_client_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT jsonb_build_object('pipeline_id', s.pipeline_id, 'request_id', s.request_id, 'bid_id', s.bid_id,
                            'documents', s.documents, 'updated_at', s.updated_at)
    FROM integration.deal_documents s
   WHERE s.client_id = p_client_id AND s.request_id = p_request_id;
$$;

-- ── 3. submissions ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.integration_start_document_submission(
    p_client_id uuid, p_pipeline_id uuid, p_requirement_id uuid, p_source text,
    p_vault_document_id uuid, p_document_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE v_id uuid; v_item jsonb;
BEGIN
  SELECT e INTO v_item FROM integration.deal_documents s, jsonb_array_elements(s.documents) e
   WHERE s.pipeline_id = p_pipeline_id AND s.client_id = p_client_id
     AND e ->> 'requirement_id' = p_requirement_id::text;
  IF v_item IS NULL THEN RAISE EXCEPTION 'DOC_NOT_REQUESTED'; END IF;
  IF v_item ->> 'provided_by' <> 'borrower' THEN RAISE EXCEPTION 'DOC_NOT_FROM_BORROWER'; END IF;
  IF v_item ->> 'status' IN ('verified', 'waived') THEN RAISE EXCEPTION 'DOC_ALREADY_DONE'; END IF;

  IF p_source = 'vault' THEN
    PERFORM 1 FROM public.client_vault_document v
     WHERE v.id = p_vault_document_id AND v.client_id = p_client_id AND v.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'DOC_VAULT_NOT_FOUND'; END IF;
    -- The age rule, enforced here as well as in the app: undated or too old -> upload new.
    IF p_document_date IS NULL THEN RAISE EXCEPTION 'DOC_VAULT_UNDATED'; END IF;
    IF (v_item ->> 'max_age_days') IS NOT NULL
       AND p_document_date < current_date - (v_item ->> 'max_age_days')::int THEN
      RAISE EXCEPTION 'DOC_VAULT_TOO_OLD';
    END IF;
  END IF;

  INSERT INTO integration.document_submission
      (pipeline_id, requirement_id, client_id, source, vault_document_id, document_date)
  VALUES (p_pipeline_id, p_requirement_id, p_client_id, p_source, p_vault_document_id, p_document_date)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.integration_finish_document_submission(
    p_submission_id uuid, p_ok boolean, p_upload_id uuid, p_sha256 text, p_error text, p_bank_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE s integration.document_submission%ROWTYPE;
BEGIN
  UPDATE integration.document_submission
     SET status = CASE WHEN p_ok THEN 'completed' ELSE 'failed' END, upload_id = p_upload_id,
         sha256 = p_sha256, error = left(p_error, 500), completed_at = now()
   WHERE id = p_submission_id AND status = 'started'
  RETURNING * INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOC_SUBMISSION_NOT_OPEN'; END IF;
  -- The vault promised documents don't leave Ficium; a share is the borrower's explicit exception. Record it.
  IF p_ok AND s.source = 'vault' THEN
    INSERT INTO public.client_vault_access_log (document_id, client_id, action, actor_id)
    VALUES (s.vault_document_id, s.client_id, 'share:' || coalesce(p_bank_name, 'bank') || ':' || s.pipeline_id, s.client_id);
  END IF;
END $$;

REVOKE ALL ON FUNCTION integration.apply_deal_documents_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_apply_deal_documents_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_deal_documents_for(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_start_document_submission(uuid, uuid, uuid, text, uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_finish_document_submission(uuid, boolean, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_apply_deal_documents_event(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_deal_documents_for(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_start_document_submission(uuid, uuid, uuid, text, uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_finish_document_submission(uuid, boolean, uuid, text, text, text) TO service_role;
