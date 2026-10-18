-- App DB (wixfhjlsjkiwfvqewvmt). Contract 1.9.1: per-lender chat through the contract only. The portal used to
-- read and write public.request_messages directly (with the bank staff member's id as sender_id).
--
-- 1. sender_id is the borrower's id on borrower messages only; bank messages carry no person's identity.
-- 2. Borrowers no longer insert from the browser (the body was rendered there and never checked). The server
--    renders with the contract library, then integration_send_borrower_message() records it (the existing
--    request_messages_enforce trigger applies the rules) and emits chat.message in the same transaction.
-- 3. integration_apply_chat_message_event(): a bank's chat.message. The rules trigger still decides; a message
--    that breaks a rule (thread closed, free text before acceptance) or whose body doesn't match its template
--    is recorded in integration.chat_refused and acknowledged, not retried forever.

ALTER TABLE public.request_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.request_messages DROP CONSTRAINT IF EXISTS request_messages_borrower_sender_ck;
ALTER TABLE public.request_messages ADD CONSTRAINT request_messages_borrower_sender_ck
  CHECK (sender_type <> 'client' OR sender_id IS NOT NULL);

DROP POLICY IF EXISTS request_messages_client_write ON public.request_messages;

CREATE TABLE IF NOT EXISTS integration.chat_refused (
  event_id    text PRIMARY KEY,
  message_id  uuid,
  request_id  uuid,
  institution_id uuid,
  reason      text NOT NULL,
  refused_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integration.chat_refused ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.chat_refused FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.integration_send_borrower_message(
    p_client_id uuid, p_request_id uuid, p_institution_id uuid,
    p_template_code text, p_params jsonb, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
DECLARE m public.request_messages%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.requests WHERE id = p_request_id AND client_id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_NOT_YOURS'; END IF;
  IF p_body IS NULL OR char_length(btrim(p_body)) = 0 OR char_length(p_body) > 2000 THEN
    RAISE EXCEPTION 'CHAT_BODY_INVALID';
  END IF;
  INSERT INTO public.request_messages (request_id, institution_id, sender_type, sender_id, body, kind, template_code, params)
  VALUES (p_request_id, p_institution_id, 'client', p_client_id, p_body,
          CASE WHEN p_template_code IS NULL THEN 'free' ELSE 'structured' END, p_template_code,
          coalesce(p_params, '{}'::jsonb))
  RETURNING * INTO m;
  -- Never the borrower's account id: the thread is (request_id, institution_id).
  PERFORM integration.enqueue('chat.message', m.request_id::text, jsonb_strip_nulls(jsonb_build_object(
    'message_id', m.id, 'request_id', m.request_id, 'institution_id', m.institution_id, 'sender_side', 'borrower',
    'template_code', m.template_code, 'params', m.params, 'body', m.body, 'sent_at', m.created_at)), 'borrower');
  RETURN jsonb_build_object('id', m.id, 'request_id', m.request_id, 'institution_id', m.institution_id,
    'sender_type', m.sender_type, 'body', m.body, 'kind', m.kind, 'template_code', m.template_code,
    'params', m.params, 'created_at', m.created_at);
END $$;

CREATE OR REPLACE FUNCTION integration.apply_chat_message_event(p_env jsonb, p_refuse text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; v_reason text := p_refuse;
BEGIN
  IF p_env ->> 'type' <> 'chat.message' OR p_env ->> 'source' <> 'institution'
     OR d ->> 'sender_side' <> 'institution' THEN
    RAISE EXCEPTION 'apply_chat_message_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  IF v_reason IS NULL THEN
    PERFORM 1 FROM public.requests WHERE id = (d ->> 'request_id')::uuid;
    IF NOT FOUND THEN v_reason := 'unknown request'; END IF;
  END IF;
  IF v_reason IS NULL THEN
    BEGIN
      INSERT INTO public.request_messages (id, request_id, institution_id, sender_type, sender_id, body, kind,
                                           template_code, params, created_at)
      VALUES ((d ->> 'message_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'institution_id')::uuid, 'institution',
              NULL, d ->> 'body', CASE WHEN d ->> 'template_code' IS NULL THEN 'free' ELSE 'structured' END,
              d ->> 'template_code', coalesce(d -> 'params', '{}'::jsonb), (d ->> 'sent_at')::timestamptz)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN raise_exception OR check_violation THEN
      v_reason := left(SQLERRM, 300);  -- request_messages_enforce: closed thread, free text before acceptance...
    END;
  END IF;
  IF v_reason IS NOT NULL THEN
    INSERT INTO integration.chat_refused (event_id, message_id, request_id, institution_id, reason)
    VALUES (p_env ->> 'id', (d ->> 'message_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'institution_id')::uuid, v_reason)
    ON CONFLICT (event_id) DO NOTHING;
    RETURN 'refused';
  END IF;
  RETURN outcome;
END $$;

CREATE OR REPLACE FUNCTION public.integration_apply_chat_message_event(p_env jsonb, p_refuse text DEFAULT NULL)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_chat_message_event(p_env, p_refuse);
$$;

REVOKE ALL ON FUNCTION public.integration_send_borrower_message(uuid, uuid, uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION integration.apply_chat_message_event(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_apply_chat_message_event(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_send_borrower_message(uuid, uuid, uuid, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_apply_chat_message_event(jsonb, text) TO service_role;
