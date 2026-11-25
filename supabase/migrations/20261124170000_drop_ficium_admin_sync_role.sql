-- Drops ficium_admin_sync, the login the admin site used to connect straight to this database and
-- call admin.sync_apply. Since ficium-admin #61 the admin site delivers over HTTPS only
-- (POST /api/internal?op=admin-sync, HMAC-signed, applied through public.admin_sync_apply as the
-- service role), so no other service holds credentials to this database.
--
-- Run only after ficium-admin #61 is deployed and one change has synced over HTTPS.
--
-- compat: installed phone apps never used this role; it was a server-to-server login only.
--
-- Audit: Ficium database audit, 2026-11-24.

BEGIN;

DO $r$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ficium_admin_sync') THEN
    -- Supabase's postgres is not a superuser: it may only DROP OWNED for roles it is a member of.
    EXECUTE format('GRANT ficium_admin_sync TO %I', current_user);
    DROP OWNED BY ficium_admin_sync;   -- its grants: EXECUTE on admin.sync_apply, schema USAGE
    DROP ROLE ficium_admin_sync;
  END IF;
END $r$;

SELECT admin.migration_applied('20261124170000_drop_ficium_admin_sync_role');

COMMIT;
