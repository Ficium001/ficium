-- Applied to the App DB 2026-10-24 (Supabase migration "security_close_blanket_policies").
-- Security audit 2026-10-24.
-- 1. request_allocations: "Service role full access" was granted to PUBLIC with
--    USING/WITH CHECK true, so any signed-in borrower could read every request's
--    allocation split and insert allocations into anyone's request. service_role
--    bypasses RLS and needs no policy. Owner read/insert policies remain.
DROP POLICY IF EXISTS "Service role full access on request_allocations" ON public.request_allocations;

-- 2. audit_events: direct inserts were allowed with WITH CHECK true, so anyone
--    could forge audit rows for any client. Direct inserts (the client's fallback
--    path) must now be the caller's own, matching write_client_audit().
DROP POLICY IF EXISTS audit_insert_only ON public.audit_events;
CREATE POLICY audit_insert_own ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND actor_id = auth.uid());
