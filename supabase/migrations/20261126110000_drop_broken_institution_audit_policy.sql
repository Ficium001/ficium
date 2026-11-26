-- Drops the last policy and helper left over from when bank users lived in this database.
--
-- public.audit_logs had a SELECT policy inst_read_audit USING (institution_id = get_my_institution_id()).
-- get_my_institution_id() reads institution_users, which no longer exists (bank users moved to the
-- Portal DB and ficium-auth), and with search_path '' it could not have resolved even when it did.
-- Postgres evaluates every permissive SELECT policy, so any signed-in session reading audit_logs
-- failed with 'relation "institution_users" does not exist' instead of seeing its own rows.
-- Reproduced on live 2026-11-26 as authenticated (rolled back).
--
-- No other policy, function or view references get_my_institution_id(); no app code calls it.
-- client_read_own_audit and admin_read_audit_logs are unchanged.
--
-- compat: installed apps never called get_my_institution_id and do not read audit_logs.

BEGIN;

DROP POLICY IF EXISTS inst_read_audit ON public.audit_logs;
DROP FUNCTION IF EXISTS public.get_my_institution_id();

-- Self-check: a signed-in session can read audit_logs again (sees only its own rows).
DO $c$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM count(*) FROM public.audit_logs;
  RESET ROLE;
END $c$;

SELECT admin.migration_applied('20261126110000_drop_broken_institution_audit_policy');

COMMIT;
