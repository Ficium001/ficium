-- App DB (wixfhjlsjkiwfvqewvmt). Tell the borrower when a bank makes an offer.
-- The old handle_bid_received trigger lived on the pre-contract bids table and was lost when bids moved to
-- events (bid_shadow): since then no 'bid_received' notification was ever created. One alert per offer, on the
-- first bid.placed for that bid (a re-placed bid after a withdrawal alerts again). bid.updated stays silent.
-- The bank's name comes from the bid's own event, as everywhere else on this side.

CREATE OR REPLACE FUNCTION integration.apply_bid_event(p_env jsonb)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'integration'
AS $function$
DECLARE
  d jsonb := p_env -> 'data';
  t text := p_env ->> 'type';
  outcome text;
  prev_status text;
  v_client uuid;
  v_bank text;
BEGIN
  IF t NOT IN ('bid.placed','bid.updated','bid.withdrawn') OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_bid_event: unexpected % from %', t, p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', t, p_env ->> 'source', p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN
    RETURN outcome;
  END IF;
  IF t IN ('bid.placed','bid.updated') THEN
    SELECT s.status INTO prev_status FROM integration.bid_shadow s WHERE s.bid_id = (d ->> 'bid_id')::uuid;
    INSERT INTO integration.bid_shadow AS s (bid_id, request_id, status, payload, last_event_id, last_sequence)
    VALUES ((d ->> 'bid_id')::uuid, (d ->> 'request_id')::uuid, d ->> 'status', d, p_env ->> 'id', (p_env ->> 'sequence')::bigint)
    ON CONFLICT (bid_id) DO UPDATE SET request_id = EXCLUDED.request_id, status = EXCLUDED.status, payload = EXCLUDED.payload,
      last_event_id = EXCLUDED.last_event_id, last_sequence = EXCLUDED.last_sequence, updated_at = now();

    -- New offer: never seen, or seen only as withdrawn before.
    IF t = 'bid.placed' AND (prev_status IS NULL OR prev_status IN ('withdrawn', 'rejected', 'expired')) THEN
      SELECT q.client_id INTO v_client FROM public.requests q WHERE q.id = (d ->> 'request_id')::uuid;
      IF v_client IS NOT NULL THEN
        v_bank := nullif(btrim(d ->> 'institution_name'), '');
        INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
        VALUES (v_client, 'bid_received',
                'New offer from ' || coalesce(v_bank, 'a provider'),
                coalesce(v_bank, 'A provider') || ' made an offer on your request. Compare offers before the window closes.',
                '/requests/' || (d ->> 'request_id'),
                jsonb_build_object('request_id', d ->> 'request_id', 'bid_id', d ->> 'bid_id'));
      END IF;
    END IF;
  ELSE
    UPDATE integration.bid_shadow SET status = d ->> 'reason', last_event_id = p_env ->> 'id',
           last_sequence = (p_env ->> 'sequence')::bigint, updated_at = now()
     WHERE bid_id = (d ->> 'bid_id')::uuid;
    IF NOT FOUND THEN
      -- ordered delivery makes this impossible normally; failing rolls back the inbox record so the sender retries
      RAISE EXCEPTION 'bid.withdrawn for a bid never placed: %', d ->> 'bid_id';
    END IF;
  END IF;
  RETURN outcome;
END $function$;
REVOKE ALL ON FUNCTION integration.apply_bid_event(jsonb) FROM PUBLIC, anon, authenticated;
