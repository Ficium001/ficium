-- APPLIED to the App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-03 as migration integration_bid_shadow_receiver_2026_10_03.
-- Step 4 of the integration-contract migration, BORROWER side receiver (shadow mode: nothing live reads bid_shadow).
-- The inbox record and the shadow change commit in ONE transaction (one RPC from api/_lib/integration/supabase.ts).
--
-- VERIFIED (rolled back, called exactly as Vercel does: service_role -> public wrapper):
--   placed -> apply; same event again -> duplicate; update -> applied (status + rate); an older event arriving late -> stale,
--   newer data kept; withdrawn -> status withdrawn; withdrawn for an unknown bid -> refused AND its inbox record rolled back
--   (so the sender retries); an event claiming the borrower side as source -> refused; anonymous caller -> denied.
--   service_role cannot read integration.* directly (only through the wrapper).

CREATE TABLE IF NOT EXISTS integration.bid_shadow (
  bid_id          uuid PRIMARY KEY,
  request_id      uuid        NOT NULL,
  status          text        NOT NULL CHECK (status IN ('submitted','under_review','withdrawn','expired','rejected')),
  payload         jsonb       NOT NULL,
  last_event_id   text        NOT NULL,
  last_sequence   bigint      NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bid_shadow_request_idx ON integration.bid_shadow (request_id);
ALTER TABLE integration.bid_shadow ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.bid_shadow FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION integration.apply_bid_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
DECLARE
  d jsonb := p_env -> 'data';
  t text := p_env ->> 'type';
  outcome text;
BEGIN
  IF t NOT IN ('bid.placed','bid.updated','bid.withdrawn') OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_bid_event: unexpected % from %', t, p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', t, p_env ->> 'source', p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN
    RETURN outcome;
  END IF;
  IF t IN ('bid.placed','bid.updated') THEN
    INSERT INTO integration.bid_shadow AS s (bid_id, request_id, status, payload, last_event_id, last_sequence)
    VALUES ((d ->> 'bid_id')::uuid, (d ->> 'request_id')::uuid, d ->> 'status', d, p_env ->> 'id', (p_env ->> 'sequence')::bigint)
    ON CONFLICT (bid_id) DO UPDATE SET request_id = EXCLUDED.request_id, status = EXCLUDED.status, payload = EXCLUDED.payload,
      last_event_id = EXCLUDED.last_event_id, last_sequence = EXCLUDED.last_sequence, updated_at = now();
  ELSE
    UPDATE integration.bid_shadow SET status = d ->> 'reason', last_event_id = p_env ->> 'id',
           last_sequence = (p_env ->> 'sequence')::bigint, updated_at = now()
     WHERE bid_id = (d ->> 'bid_id')::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'bid.withdrawn for a bid never placed: %', d ->> 'bid_id';
    END IF;
  END IF;
  RETURN outcome;
END $$;

CREATE OR REPLACE FUNCTION public.integration_apply_bid_event(p_env jsonb)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_bid_event(p_env);
$$;

REVOKE ALL ON FUNCTION integration.apply_bid_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_apply_bid_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_apply_bid_event(jsonb) TO service_role;
