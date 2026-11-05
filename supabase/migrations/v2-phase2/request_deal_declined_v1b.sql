-- App DB (wixfhjlsjkiwfvqewvmt). Part 2 of 2. The bank declined the deal after the borrower accepted its bid.
--
-- Flow: ask -> banks bid or decline to bid -> borrower accepts exactly one bid -> that bank's product process.
-- The bank can still decline in that process (credit, documents). Until now the borrower's request stayed
-- 'accepted' with nowhere to go. Now:
--   1. deal.progress_updated with status 'declined' moves the request accepted -> deal_declined and tells the
--      borrower which bank declined (name from that bid's own event, never asked of the portal).
--   2. relist_request on a deal_declined request creates a NEW request (same ask, fresh 14-day window), linked by
--      relisted_from. The declined one stays as history. Reusing the same id would carry an acceptance and a
--      revealed identity into a new round of bids; old offers are never revived (closed at acceptance, stale price).
--   3. deal_declined is never sent as request.status_changed: the decision came from the portal, and the
--      contract's request_status has no such value.

ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS relisted_from uuid REFERENCES public.requests(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS requests_relisted_from_uniq ON public.requests (relisted_from) WHERE relisted_from IS NOT NULL;

-- 3. Status changes to the portal, except deal_declined.
CREATE OR REPLACE FUNCTION integration.trg_requests_emit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public', 'integration'
AS $function$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      PERFORM integration.publish_request(NEW.id);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      -- deal_declined (and its reversal back to accepted) mirror a portal decision: nothing to tell the portal.
      IF NEW.status::text <> 'deal_declined' AND OLD.status::text <> 'deal_declined' THEN
        PERFORM integration.publish_status(NEW.id, NEW.status::text);
      END IF;
    ELSIF (NEW.amount, NEW.preferred_term_months, NEW.purpose, NEW.product_answers, NEW.max_rate, NEW.decision_deadline, NEW.allocation_mode, NEW.product_type)
          IS DISTINCT FROM
          (OLD.amount, OLD.preferred_term_months, OLD.purpose, OLD.product_answers, OLD.max_rate, OLD.decision_deadline, OLD.allocation_mode, OLD.product_type) THEN
      PERFORM integration.publish_request(NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO integration.emit_error (request_id, stage, error) VALUES (NEW.id, 'requests ' || TG_OP, left(SQLERRM, 500));
  END;
  RETURN NULL;
END $function$;

-- 1. Deal progress: store it, then mirror a decline (or its reversal) on the request.
CREATE OR REPLACE FUNCTION integration.apply_deal_progress_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; r record; v_bank text;
BEGIN
  IF p_env ->> 'type' <> 'deal.progress_updated' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_deal_progress_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT q.client_id, q.accepted_bid_id, q.status INTO r FROM public.requests q
   WHERE q.id = (d ->> 'request_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deal.progress_updated for an unknown request: %', d ->> 'request_id'; END IF;
  IF r.accepted_bid_id IS DISTINCT FROM (d ->> 'bid_id')::uuid THEN
    RAISE EXCEPTION 'deal.progress_updated for a bid the borrower did not accept: %', d ->> 'bid_id';
  END IF;
  INSERT INTO integration.deal_progress (pipeline_id, request_id, bid_id, client_id, payload, last_event_id, last_sequence)
  VALUES ((d ->> 'pipeline_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'bid_id')::uuid, r.client_id, d,
          p_env ->> 'id', (p_env ->> 'sequence')::bigint)
  ON CONFLICT (pipeline_id) DO UPDATE SET payload = EXCLUDED.payload, last_event_id = EXCLUDED.last_event_id,
      last_sequence = EXCLUDED.last_sequence, updated_at = now();

  IF d ->> 'status' = 'declined' AND r.status = 'accepted' THEN
    SELECT nullif(btrim(b.payload ->> 'institution_name'), '') INTO v_bank
      FROM integration.bid_shadow b WHERE b.bid_id = (d ->> 'bid_id')::uuid;
    UPDATE public.requests SET status = 'deal_declined', updated_at = now() WHERE id = (d ->> 'request_id')::uuid;
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (r.client_id, 'request_rejected',
            'Declined by ' || coalesce(v_bank, 'the bank'),
            coalesce(v_bank, 'The bank') || ' declined this deal. You can relist the same request to get new offers.',
            '/requests/' || (d ->> 'request_id'),
            jsonb_build_object('request_id', d ->> 'request_id', 'bid_id', d ->> 'bid_id', 'reason', 'deal_declined'));
  ELSIF d ->> 'status' IN ('active', 'completed') AND r.status = 'deal_declined'
        AND NOT EXISTS (SELECT 1 FROM public.requests c WHERE c.relisted_from = (d ->> 'request_id')::uuid) THEN
    -- The bank reversed its decline before the borrower relisted.
    UPDATE public.requests SET status = 'accepted', updated_at = now() WHERE id = (d ->> 'request_id')::uuid;
  END IF;
  RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION integration.apply_deal_progress_event(jsonb) FROM PUBLIC, anon, authenticated;

-- 2. Relist: in place for expired/rejected (unchanged), as a new linked request after a declined deal.
CREATE OR REPLACE FUNCTION public.relist_request(p_client_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.requests%ROWTYPE; v_new uuid; v_deadline timestamptz := now() + interval '14 days';
BEGIN
  SELECT * INTO r FROM public.requests WHERE id = p_request_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RELIST_NOT_FOUND'; END IF;

  IF r.status = 'deal_declined' THEN
    IF EXISTS (SELECT 1 FROM public.requests WHERE relisted_from = r.id) THEN
      RAISE EXCEPTION 'RELIST_ALREADY_DONE';
    END IF;
    IF EXISTS (SELECT 1 FROM public.request_participant WHERE request_id = r.id AND NOT is_initiator) THEN
      RAISE EXCEPTION 'RELIST_JOINT_NOT_SUPPORTED';  -- co-applicants must consent to a new request themselves
    END IF;
    INSERT INTO public.requests (client_id, product_type, amount, purpose, preferred_term_months, max_rate,
                                 decision_deadline, status, anonymized_brief, allocation_mode, product_answers, relisted_from)
    VALUES (r.client_id, r.product_type, r.amount, r.purpose, r.preferred_term_months, r.max_rate,
            v_deadline, 'open', r.anonymized_brief, r.allocation_mode, r.product_answers, r.id)
    RETURNING id INTO v_new;
    INSERT INTO public.request_allocations (request_id, product_type, amount, sort_order)
    SELECT v_new, a.product_type, a.amount, a.sort_order FROM public.request_allocations a WHERE a.request_id = r.id;
    INSERT INTO public.request_participant (request_id, client_id, role, liability_type, ownership_bps, consent_state,
                                            is_initiator, consented_at)
    SELECT v_new, p.client_id, p.role, p.liability_type, p.ownership_bps, p.consent_state, p.is_initiator, p.consented_at
      FROM public.request_participant p WHERE p.request_id = r.id AND p.is_initiator;
    RETURN jsonb_build_object('request_id', v_new, 'relisted_from', r.id, 'status', 'open', 'decision_deadline', v_deadline);
  END IF;

  IF r.status NOT IN ('expired', 'rejected') THEN RAISE EXCEPTION 'RELIST_NOT_ALLOWED'; END IF;
  UPDATE public.requests SET decision_deadline = v_deadline, updated_at = now() WHERE id = r.id;
  UPDATE public.requests SET status = 'open', updated_at = now() WHERE id = r.id;
  RETURN jsonb_build_object('request_id', r.id, 'status', 'open', 'decision_deadline', v_deadline);
END $$;
REVOKE ALL ON FUNCTION public.relist_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relist_request(uuid, uuid) TO service_role;
