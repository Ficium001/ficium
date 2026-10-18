-- App DB (wixfhjlsjkiwfvqewvmt), applied 2026-10-17. Contract 1.8.0: one institution declined a request.
-- Anonymous notice to the borrower; the request's status is unchanged and it stays open to every other
-- institution. Replaces the portal calling public.reject_request directly, which closed the borrower's request
-- (and cancelled it for every institution) on the first decline.
CREATE OR REPLACE FUNCTION integration.apply_request_declined_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; v_client uuid;
BEGIN
  IF p_env ->> 'type' <> 'request.declined' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_request_declined_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT client_id INTO v_client FROM public.requests WHERE id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'request.declined for an unknown request: %', d ->> 'request_id'; END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (v_client, 'request_declined_by_provider', 'A provider declined your request',
          coalesce(nullif(btrim(d ->> 'reason'), ''), 'One provider won''t make an offer on this request. It stays open to every other provider.'),
          '/requests/' || (d ->> 'request_id'),
          jsonb_build_object('request_id', d ->> 'request_id', 'declined_at', d ->> 'declined_at'));
  RETURN outcome;
END $$;
CREATE OR REPLACE FUNCTION public.integration_apply_request_declined_event(p_env jsonb)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_request_declined_event(p_env);
$$;
REVOKE ALL ON FUNCTION integration.apply_request_declined_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_apply_request_declined_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_apply_request_declined_event(jsonb) TO service_role;
