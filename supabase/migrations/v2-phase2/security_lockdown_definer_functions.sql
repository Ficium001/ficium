-- APPLIED to App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-02 as migration
-- security_lockdown_definer_functions_2026_10_02.
--
-- Before: 44 SECURITY DEFINER functions executable by anon via /rest/v1/rpc,
-- including create_notification, write_audit, get_or_create_couple_link and the
-- invitation functions. After: 6, all read-only RLS-policy helpers that only
-- answer about the caller (current_client_email, get_my_institution_id,
-- is_couple_member, is_ficium_admin, is_request_participant, request_chat_is_open).
--
-- Callers verified first: browser (src) uses get_my_role + write_client_audit;
-- Vercel (service_role) uses the invitation + couple-document functions;
-- portal-api (postgres), pg_cron (postgres), triggers and other DEFINER
-- functions run as owner and are unaffected. EXECUTE is not checked when a
-- trigger fires (verified in a rolled-back test).
--
-- Verified after apply (rolled-back test, 9/9): triggers still fire for
-- authenticated users; write_client_audit accepts own id, refuses others;
-- create_notification, get_or_create_couple_link, v_request_patterns refused
-- for authenticated; get_my_role and write_client_audit refused for anon.

REVOKE EXECUTE ON FUNCTION
  public.handle_bid_received(), public.handle_kyc_change(), public.handle_new_user(),
  public.handle_request_created(), public.on_bid_accepted(), public.on_bid_submitted(),
  public.on_new_client_request(), public.request_messages_enforce(), public.trg_audit_bid_accepted(),
  public.trg_audit_institution_change(), public.trg_audit_kyc_change(), public.trg_audit_request_created(),
  public.trg_audit_row_change(), public.trg_recompute_goal_readiness(), public.rls_auto_enable()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION
  public.create_notification(uuid, public.notification_kind, text, text, text),
  public.enqueue_webhook_events(uuid, text, jsonb),
  public.expire_overdue_requests(), public.expire_pending_actions(),
  public.expire_stale_bids(), public.expire_stale_requests(), public.notify_expiring_requests(),
  public.get_or_create_couple_link(uuid, uuid, uuid),
  public.write_audit(uuid, uuid, uuid, public.actor_type, text, inet, public.action_category_type, text, text, uuid, jsonb, jsonb, text, text),
  admin.write_admin_audit(text, text, uuid, text, uuid, jsonb, jsonb, text, text, inet),
  public.can_release_request(uuid), public.has_institution_role(text),
  public.institution_has_module(uuid, text), public.institution_is_active(uuid),
  public.is_institution_member(uuid), public.request_chat_is_winner(uuid, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION
  public.create_request_invitation(uuid, uuid, text, bytea, text, public.invitation_channel, public.participant_role, public.liability_type, integer, integer),
  public.accept_request_invitation(bytea, uuid),
  public.decline_request_invitation(bytea),
  public.revoke_request_invitation(uuid, uuid),
  public.submit_couple_relationship_document(uuid, uuid, uuid, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.create_request_invitation(uuid, uuid, text, bytea, text, public.invitation_channel, public.participant_role, public.liability_type, integer, integer),
  public.accept_request_invitation(bytea, uuid),
  public.decline_request_invitation(bytea),
  public.revoke_request_invitation(uuid, uuid),
  public.submit_couple_relationship_document(uuid, uuid, uuid, text)
TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.write_client_audit(p_client_id uuid, p_action_category text, p_event_label text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_state_before jsonb DEFAULT NULL::jsonb, p_state_after jsonb DEFAULT NULL::jsonb, p_outcome text DEFAULT 'success'::text, p_outcome_note text DEFAULT NULL::text, p_actor_ip inet DEFAULT NULL::inet, p_actor_device text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_audit_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_client_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'write_client_audit: callers may only write their own audit events'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, actor_role, actor_ip, actor_device, action_category, event_label,
    resource_type, resource_id, state_before, state_after, outcome, outcome_note
  ) VALUES (
    p_client_id, auth.uid(), 'client_user', 'client', p_actor_ip, p_actor_device, p_action_category, p_event_label,
    p_resource_type, p_resource_id, p_state_before, p_state_after, p_outcome, p_outcome_note
  ) RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.write_client_audit(uuid, text, text, text, uuid, jsonb, jsonb, text, text, inet, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.write_client_audit(uuid, text, text, text, uuid, jsonb, jsonb, text, text, inet, text) TO authenticated;

REVOKE SELECT ON public.v_request_patterns FROM anon, authenticated;
