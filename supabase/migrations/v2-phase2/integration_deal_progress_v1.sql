-- App DB (wixfhjlsjkiwfvqewvmt). Contract 1.7.0: the loan tracker runs on events, with no direct link to the
-- portal. Replaces the tracker's call to portal-api, which sent the borrower's account id.
--
-- 1. integration.deal_progress   latest deal.progress_updated per deal (full state). Applied only for the bid
--    the borrower ACCEPTED (requests.accepted_bid_id); anything else is refused and its inbox record rolled back.
-- 2. public.integration_deal_progress_for(client, request): the tracker, in the shape the app already renders,
--    with the bank's name taken from that bid's own event (bid_shadow), not asked of the portal.

CREATE TABLE IF NOT EXISTS integration.deal_progress (
  pipeline_id    uuid PRIMARY KEY,
  request_id     uuid        NOT NULL,
  bid_id         uuid        NOT NULL,
  client_id      uuid        NOT NULL,
  payload        jsonb       NOT NULL,
  last_event_id  text        NOT NULL,
  last_sequence  bigint      NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_progress_request_idx ON integration.deal_progress (request_id);
ALTER TABLE integration.deal_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.deal_progress FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION integration.apply_deal_progress_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; r record;
BEGIN
  IF p_env ->> 'type' <> 'deal.progress_updated' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_deal_progress_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT q.client_id, q.accepted_bid_id INTO r FROM public.requests q WHERE q.id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'deal.progress_updated for an unknown request: %', d ->> 'request_id'; END IF;
  IF r.accepted_bid_id IS DISTINCT FROM (d ->> 'bid_id')::uuid THEN
    RAISE EXCEPTION 'deal.progress_updated for a bid the borrower did not accept: %', d ->> 'bid_id';
  END IF;
  INSERT INTO integration.deal_progress (pipeline_id, request_id, bid_id, client_id, payload, last_event_id, last_sequence)
  VALUES ((d ->> 'pipeline_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'bid_id')::uuid, r.client_id, d,
          p_env ->> 'id', (p_env ->> 'sequence')::bigint)
  ON CONFLICT (pipeline_id) DO UPDATE SET payload = EXCLUDED.payload, last_event_id = EXCLUDED.last_event_id,
      last_sequence = EXCLUDED.last_sequence, updated_at = now();
  RETURN outcome;
END $$;

CREATE OR REPLACE FUNCTION public.integration_apply_deal_progress_event(p_env jsonb)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_deal_progress_event(p_env);
$$;

CREATE OR REPLACE FUNCTION public.integration_deal_progress_for(p_client_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT jsonb_build_object(
    'pipeline_id',      p.pipeline_id,
    'status',           p.payload ->> 'status',
    'institution_name', coalesce(b.payload ->> 'institution_name', ''),
    'deal_amount',      (p.payload -> 'deal' ->> 'amount')::numeric,
    'deal_rate',        (p.payload -> 'deal' ->> 'rate')::numeric,
    'deal_term_months', (p.payload -> 'deal' ->> 'term_months')::int,
    'started_at',       p.payload ->> 'started_at',
    'completed_at',     p.payload ->> 'completed_at',
    'stages', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.pipeline_id::text || ':' || (s ->> 'position'),
               'position', (s ->> 'position')::int, 'status', s ->> 'status', 'label', s ->> 'label',
               'stage_key', '', 'started_at', s ->> 'started_at', 'completed_at', s ->> 'completed_at',
               'sla_due_at', s ->> 'due_at') ORDER BY (s ->> 'position')::int)
        FROM jsonb_array_elements(p.payload -> 'stages') s), '[]'::jsonb))
  FROM integration.deal_progress p
  LEFT JOIN integration.bid_shadow b ON b.bid_id = p.bid_id
  WHERE p.client_id = p_client_id AND p.request_id = p_request_id
  ORDER BY p.updated_at DESC LIMIT 1;
$$;

REVOKE ALL ON FUNCTION integration.apply_deal_progress_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_apply_deal_progress_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_deal_progress_for(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_apply_deal_progress_event(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_deal_progress_for(uuid, uuid) TO service_role;

-- Applied separately as relist_request_through_events (2026-10-17). Relist an expired or rejected request on
-- the borrower's own side; the existing request triggers emit the contract events the portal receives (the old
-- path called a portal endpoint that never existed). Deadline first, then status: the status-change branch of
-- trg_requests_emit sends only the status, so one combined update would never send the new deadline.
CREATE OR REPLACE FUNCTION public.relist_request(p_client_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.requests%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.requests WHERE id = p_request_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RELIST_NOT_FOUND'; END IF;
  IF r.status NOT IN ('expired', 'rejected') THEN RAISE EXCEPTION 'RELIST_NOT_ALLOWED'; END IF;
  UPDATE public.requests SET decision_deadline = now() + interval '14 days', updated_at = now() WHERE id = r.id;
  UPDATE public.requests SET status = 'open', updated_at = now() WHERE id = r.id;
  RETURN jsonb_build_object('request_id', r.id, 'status', 'open', 'decision_deadline', now() + interval '14 days');
END $$;
REVOKE ALL ON FUNCTION public.relist_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relist_request(uuid, uuid) TO service_role;
