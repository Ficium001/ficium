-- Acceptance recorded atomically on the borrower side (2026-10-31).
--
-- After the bank side confirms an acceptance, api/accept-bid.ts used to write
-- bid_acceptances and requests with two fire-and-forget REST calls next to the
-- complete_acceptance RPC, and only logged a failed completion. A failure left
-- the bank with a deal while the borrower's app still showed the request open.
--
-- Now integration.complete_acceptance() writes all three in ONE transaction:
-- the identity_release audit row, requests.status/accepted_bid_id, and the
-- bid_acceptances row. It raises if the request row isn't updated, so a
-- half-recorded acceptance can't commit. The API reports a failure to the
-- borrower (503, "tap Accept again"); the retry reuses the same consent_ref
-- (prepare_acceptance returns the unfinished attempt), the bank side answers
-- from its idempotency log, and this function runs again.
--
-- bid_acceptances gets UNIQUE (request_id) so that retry can't duplicate it
-- (3 rows live, no duplicates, checked before writing this).

CREATE UNIQUE INDEX IF NOT EXISTS bid_acceptances_request_uniq
  ON public.bid_acceptances (request_id);

CREATE OR REPLACE FUNCTION integration.complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'integration', 'public' AS $function$
DECLARE r integration.identity_release%ROWTYPE; n int;
BEGIN
  UPDATE integration.identity_release SET outcome = p_outcome, institution_id = p_institution, completed_at = now()
   WHERE consent_ref = p_consent_ref AND outcome = 'prepared'
  RETURNING * INTO r;
  IF NOT FOUND OR p_outcome <> 'accepted' THEN
    RETURN;
  END IF;
  IF p_institution IS NULL THEN
    RAISE EXCEPTION 'accepted without an institution (consent %)', p_consent_ref USING ERRCODE = 'P0001';
  END IF;

  -- The deal progress and document receivers accept events only for requests.accepted_bid_id.
  UPDATE public.requests SET status = 'accepted', accepted_bid_id = r.bid_id, updated_at = now()
   WHERE id = r.request_id AND client_id = r.client_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'request % not updated on acceptance', r.request_id USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.bid_acceptances (bid_id, request_id, client_id, institution_id, accepted_at)
  VALUES (r.bid_id, r.request_id, r.client_id, p_institution, now())
  ON CONFLICT (request_id) DO NOTHING;
END $function$;

REVOKE ALL ON FUNCTION integration.complete_acceptance(text, text, uuid) FROM public, anon, authenticated;
