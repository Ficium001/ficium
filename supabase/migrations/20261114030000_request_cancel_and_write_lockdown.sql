-- Borrowers cancel their own open request; nothing else about a request changes from the browser.
--
-- Before this migration "Clients update own requests" let a signed-in borrower UPDATE any column
-- of their own request directly over PostgREST: status, accepted_bid_id, amount after bids were in.
-- Setting status = 'accepted' skipped the consent + contract acceptance call entirely and still
-- emitted request.status_changed to the portal. The browser never issues an UPDATE on requests
-- (checked: src/ only selects and inserts), so the right is removed rather than narrowed.
--
-- Every status change now goes through a SECURITY DEFINER function:
--   cancel_request (this file), relist_request, reject_request, close_account, the acceptance flow.

-- 1. No direct UPDATE/DELETE from the browser.
DROP POLICY IF EXISTS "Clients update own requests" ON public.requests;
REVOKE UPDATE, DELETE ON public.requests FROM authenticated, anon;

-- 2. A new request starts open, unaccepted and not a relist (relists go through relist_request).
DROP POLICY IF EXISTS "Clients create own requests" ON public.requests;
CREATE POLICY "Clients create own requests" ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND status = 'open'
    AND accepted_bid_id IS NULL
    AND relisted_from IS NULL
  );

-- 3. Cancel. Only the owner, only while open. The contract has no 'cancelled' status, so a
--    cancelled request is 'closed' — the same status account closure uses — and the existing
--    trigger sends request.status_changed(closed) to the portal, which stops further bids.
CREATE OR REPLACE FUNCTION public.cancel_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_status public.request_status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in');
  END IF;

  SELECT status INTO v_status
    FROM public.requests
   WHERE id = p_request_id AND client_id = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_open', 'status', v_status);
  END IF;

  UPDATE public.requests SET status = 'closed' WHERE id = p_request_id;

  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_before, state_after, outcome
  ) VALUES (
    v_uid, v_uid, 'client_user', 'request.cancel', 'Financing request cancelled by borrower',
    'requests', p_request_id,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'closed', 'reason', 'cancelled_by_borrower'),
    'success'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_request(uuid) TO authenticated;
