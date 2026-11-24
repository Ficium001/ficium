-- Policy roles, from the 2026-11-24 database audit. No change to what anyone can read or write:
--
--   1. Three duplicate policies dropped, each fully covered by a FOR ALL policy with the same
--      condition: "Users read own notifications" and "Users update own notifications"
--      (notifications_owner), "clients: users can read own record" (client_own_row).
--   2. 54 policies written for role "public" (which includes anon) now name the role that can
--      actually satisfy them: 49 need a signed-in user (auth.uid(), auth.jwt() or a helper built
--      on them) -> authenticated; 5 check auth.role() = 'service_role' -> service_role.
--      Reference data the signed-out app reads (condition true, or is_active) stays public.
--
-- Self-checking: fails and rolls back if a public-role policy still depends on a signed-in user.
-- Dry-run on live first (rolled back): 3 dropped, 49 to authenticated, 5 to service_role.
--
-- compat: installed apps only ever satisfied these policies as a signed-in user; nothing they
-- can read or write changes.

BEGIN;

DO $m$
DECLARE
  schemas text[] := array['admin', 'fico', 'finance', 'integration', 'public', 'vault_extract'];
  r record;
  e text;
  n_auth int := 0;
  n_service int := 0;
  n_dropped int := 0;
  left_over int;
BEGIN
  PERFORM set_config('search_path', '', true);

  -- 1. Exact duplicates: each is fully covered by a broader policy on the same table with the
  --    same condition (notifications_owner and client_own_row are FOR ALL on the owner's row).
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'notifications'
              AND policyname = 'notifications_owner' AND cmd = 'ALL') THEN
    DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
    n_dropped := n_dropped + 2;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'clients'
              AND policyname = 'client_own_row' AND cmd = 'ALL') THEN
    DROP POLICY IF EXISTS "clients: users can read own record" ON public.clients;
    n_dropped := n_dropped + 1;
  END IF;

  -- 2. Policies for role "public" (which includes anon) whose condition can only be true for a
  --    signed-in user, or only for the service role, now name that role. Nothing anyone can do
  --    changes: anon could never satisfy them, and service_role bypasses RLS anyway. Policies on
  --    reference data the signed-out app reads (condition true, or is_active) stay public.
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_catalog.pg_policies
     WHERE schemaname = ANY (schemas) AND roles = '{public}'
  LOOP
    e := coalesce(r.qual, '') || ' ' || coalesce(r.with_check, '');
    IF e ~ 'auth\.role\(\) AS role\) = ''service_role''' THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I TO service_role', r.policyname, r.schemaname, r.tablename);
      n_service := n_service + 1;
    ELSIF e ~ '(auth\.(uid|jwt)\(\)|is_ficium_admin\(\)|get_my_institution_id\(\)|is_couple_member\(|is_request_participant\(|auth\.role\(\) AS role\) = ''authenticated'')' THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', r.policyname, r.schemaname, r.tablename);
      n_auth := n_auth + 1;
    END IF;
  END LOOP;

  SELECT count(*) INTO left_over FROM pg_catalog.pg_policies
   WHERE schemaname = ANY (schemas) AND roles = '{public}'
     AND (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.(uid|jwt|role)\(\)';
  IF left_over > 0 THEN
    RAISE EXCEPTION '% public-role policies still depend on a signed-in user', left_over;
  END IF;

  RAISE NOTICE 'duplicates dropped: %, to authenticated: %, to service_role: %', n_dropped, n_auth, n_service;
END $m$;

SELECT admin.migration_applied('20261124160000_policy_roles_and_duplicates');

COMMIT;
