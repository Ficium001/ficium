-- Supabase security advisor findings on the App DB (2026-11-14). None was exploitable as found;
-- each removed a way it could become exploitable.

-- 1. client_profile_view ran as its owner (bypassing row security) and was readable by anon.
--    It filters on auth.uid(), so callers only ever saw their own row, but that rested on one
--    WHERE clause. Now it runs as the caller (the owner-only policies on clients, client_dossier
--    and client_financial_snapshot apply too) and anon cannot read it at all.
ALTER VIEW public.client_profile_view SET (security_invoker = on);
REVOKE ALL ON public.client_profile_view FROM anon;

-- 2. SECURITY DEFINER helpers callable by signed-out visitors. They are used inside row-security
--    policies for signed-in users, so authenticated keeps EXECUTE; anon never needs them.
REVOKE EXECUTE ON FUNCTION public.current_client_email()                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_institution_id()                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_couple_member(uuid, uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ficium_admin()                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_request_participant(uuid, uuid)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_chat_is_open(uuid, uuid)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_client_email()                    TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_my_institution_id()                   TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.is_couple_member(uuid, uuid)              TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.is_ficium_admin()                         TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.is_request_participant(uuid, uuid)        TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.request_chat_is_open(uuid, uuid)          TO authenticated, service_role;

-- 3. Fix search_path on every function the advisor flagged. The value is the database default
--    made explicit (pg_catalog first, then public and extensions, pg_temp last), so name
--    resolution is unchanged but can no longer be redirected by the caller's session.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE (n.nspname, p.proname) IN (
             ('public','normalize_name'), ('public','set_updated_at'), ('public','update_updated_at'),
             ('public','set_vault_updated_at'), ('public','trg_audit_row_change'),
             ('public','compute_goal_readiness'), ('public','trg_recompute_goal_readiness'),
             ('public','write_audit'), ('public','get_my_role'),
             ('integration','_py_float'), ('integration','_py_truthy'), ('integration','_strip_top_nulls'),
             ('integration','_pa_num'), ('integration','py_round1'))
       AND p.proconfig IS NULL
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, extensions, pg_temp', f.sig);
  END LOOP;
END $$;

-- 4. public.audit_logs (legacy, unused by the app) granted anon SELECT and INSERT. Row security
--    blocked both, but an audit table must not be writable by signed-out visitors at all.
REVOKE ALL ON public.audit_logs FROM anon;
