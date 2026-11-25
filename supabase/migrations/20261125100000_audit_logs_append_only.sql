-- public.audit_logs becomes append-only for everyone. From the 2026-11-24 database audit.
--
-- Before: "audit_logs_no_update" / "audit_logs_no_delete" were PERMISSIVE with USING (false),
-- which blocks nothing, and admin_all_audit_logs (FOR ALL, is_ficium_admin()) let any Ficium
-- admin session update or delete rows. service_role bypasses RLS and held UPDATE, DELETE and
-- TRUNCATE. So the log could be edited by the people and services it records.
--
-- After:
--   1. A trigger refuses UPDATE, DELETE and TRUNCATE for every role, service_role and postgres
--      included (only session_replication_role = replica, i.e. a superuser restore, skips it).
--   2. UPDATE, DELETE and TRUNCATE are revoked from anon, authenticated and service_role.
--   3. Admins keep read and insert (admin_read_audit_logs, admin_insert_audit_logs); the FOR ALL
--      policy and the two no-op policies are dropped, and RESTRICTIVE no-update / no-delete
--      policies make the intent visible to the policy advisor.
-- Nothing updates or deletes audit rows today: no foreign keys, functions, cron jobs or app code,
-- and 0 updates / 0 deletes in pg_stat. Writers (write_audit, trg_audit_row_change) only insert.
--
-- Self-checking: fails and rolls back unless an UPDATE and a DELETE are refused after the change.
-- Dry-run on live first (rolled back).
--
-- compat: installed apps only insert and read audit rows; nothing they do changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.audit_logs_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $f$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $f$;
REVOKE ALL ON FUNCTION public.audit_logs_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_logs_append_only_row ON public.audit_logs;
CREATE TRIGGER audit_logs_append_only_row BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_append_only();
DROP TRIGGER IF EXISTS audit_logs_append_only_truncate ON public.audit_logs;
CREATE TRIGGER audit_logs_append_only_truncate BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_logs_append_only();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated, service_role;

DROP POLICY IF EXISTS admin_all_audit_logs ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE POLICY admin_read_audit_logs ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT public.is_ficium_admin()));
CREATE POLICY admin_insert_audit_logs ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_ficium_admin()));
CREATE POLICY audit_logs_no_update ON public.audit_logs AS RESTRICTIVE FOR UPDATE USING (false);
CREATE POLICY audit_logs_no_delete ON public.audit_logs AS RESTRICTIVE FOR DELETE USING (false);

DO $check$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.audit_logs (event_type, actor_type) VALUES ('migration.self_check', 'system') RETURNING audit_logs.id INTO v_id;
  BEGIN
    UPDATE public.audit_logs SET event_type = 'x' WHERE audit_logs.id = v_id;
    RAISE EXCEPTION 'self-check failed: UPDATE was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.audit_logs WHERE audit_logs.id = v_id;
    RAISE EXCEPTION 'self-check failed: DELETE was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- The probe row stays: it cannot be deleted, which is the point. It records this migration.
END $check$;

SELECT admin.migration_applied('20261125100000_audit_logs_append_only');

COMMIT;
