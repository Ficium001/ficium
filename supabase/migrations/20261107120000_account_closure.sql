-- Account closure ("delete my account") — App DB.
--
-- Apple requires in-app account deletion; FIAMLA requires customer due-diligence
-- records to be kept for at least 7 years after the relationship ends (see
-- 20261030150000_kyc_documents_retention.sql). So closing an account is two steps:
--
--   1. Now (close_account): the user can no longer use Ficium. Open requests are
--      closed (banks are told through the existing integration trigger), and
--      personal data that is NOT a regulated record is deleted.
--   2. After retain_until (operator task, not automated): the regulated records
--      are erased under the retention policy. account_closures_due_for_erasure
--      lists who is due.
--
-- Signing out every device and blocking sign-in happen in the API (api/account.ts),
-- which calls this function first. Never delete the auth user here: several tables
-- cascade from auth.users and would take regulated records with them.
--
-- Data classes (review with compliance before enabling):
--   DELETED NOW  fico.* (advisor memory and chats), advisor_messages, finance.*
--                (accounts, holdings, net worth), market_preferences,
--                notifications, activity_events (the in-app feed).
--   KEPT         clients, kyc_*, client_documents, requests, bids, bid_acceptances,
--                request_participant, client_vault_*, client_dossier,
--                client_loan_details, client_financial_snapshot, audit_events.

CREATE TABLE IF NOT EXISTS public.account_closures (
  client_id            uuid PRIMARY KEY,          -- no FK: this record outlives the user
  closed_at            timestamptz NOT NULL DEFAULT now(),
  retain_until         date NOT NULL,
  open_requests_closed integer NOT NULL DEFAULT 0,
  erased_at            timestamptz                 -- set by the operator after erasure
);

ALTER TABLE public.account_closures ENABLE ROW LEVEL SECURITY;  -- no policies: service role only
REVOKE ALL ON public.account_closures FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.account_closures TO service_role;

CREATE OR REPLACE VIEW public.account_closures_due_for_erasure
WITH (security_invoker = true) AS
  SELECT client_id, closed_at, retain_until
  FROM public.account_closures
  WHERE erased_at IS NULL AND retain_until <= current_date;

REVOKE ALL ON public.account_closures_due_for_erasure FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.account_closures_due_for_erasure TO service_role;

CREATE OR REPLACE FUNCTION public.close_account(p_client_id uuid, p_retain_years integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.account_closures%ROWTYPE;
  v_closed   integer;
  v_until    date;
BEGIN
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'client id required';
  END IF;
  IF p_retain_years IS NULL OR p_retain_years < 7 THEN
    RAISE EXCEPTION 'retention must be at least 7 years (FIAMLA)';
  END IF;

  -- One closure per client; serialise concurrent calls for the same client.
  PERFORM pg_advisory_xact_lock(hashtextextended('close_account:' || p_client_id::text, 0));

  SELECT * INTO v_existing FROM public.account_closures WHERE client_id = p_client_id;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'already_closed', 'retain_until', v_existing.retain_until);
  END IF;

  -- An acceptance mid-flight must finish first; closing under it would leave the
  -- bank with a half-made deal.
  IF EXISTS (SELECT 1 FROM public.requests
             WHERE client_id = p_client_id AND status::text = 'awaiting_consent') THEN
    RETURN jsonb_build_object('status', 'acceptance_in_progress');
  END IF;

  -- Close requests still out for offers. The integration trigger tells the banks.
  UPDATE public.requests SET status = 'closed'
   WHERE client_id = p_client_id AND status::text IN ('open', 'PENDING');
  GET DIAGNOSTICS v_closed = ROW_COUNT;

  -- Personal data that is not a regulated record.
  DELETE FROM fico.message           WHERE user_id = p_client_id;
  DELETE FROM fico.conversation      WHERE user_id = p_client_id;
  DELETE FROM fico.message_meter     WHERE user_id = p_client_id;
  DELETE FROM fico.profile           WHERE user_id = p_client_id;
  DELETE FROM public.advisor_messages   WHERE user_id = p_client_id;
  DELETE FROM finance.holdings          WHERE user_id = p_client_id;
  DELETE FROM finance.accounts          WHERE user_id = p_client_id;
  DELETE FROM finance.net_worth_history WHERE user_id = p_client_id;
  DELETE FROM public.market_preferences WHERE user_id = p_client_id;
  DELETE FROM public.notifications      WHERE user_id = p_client_id;
  DELETE FROM public.activity_events    WHERE client_id = p_client_id;

  v_until := (now() + make_interval(years => p_retain_years))::date;

  INSERT INTO public.account_closures (client_id, retain_until, open_requests_closed)
  VALUES (p_client_id, v_until, v_closed);

  INSERT INTO public.audit_events
    (client_id, actor_id, actor_type, action_category, event_label,
     resource_type, resource_id, state_after, outcome)
  VALUES
    (p_client_id, p_client_id, 'client_user', 'account.close', 'Account closed by client',
     'client', p_client_id,
     jsonb_build_object('retain_until', v_until, 'open_requests_closed', v_closed),
     'success');

  RETURN jsonb_build_object('status', 'closed', 'retain_until', v_until,
                            'open_requests_closed', v_closed);
END;
$$;

REVOKE ALL ON FUNCTION public.close_account(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_account(uuid, integer) TO service_role;
