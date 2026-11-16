-- Migration ledger for the App DB.
--
-- Migrations here are applied by hand (SQL editor or the Supabase tools), and three times a merged
-- migration was never applied: the feature shipped and failed in production. From this file on,
-- every migration records itself in admin.schema_migration as its last statement, in the same
-- transaction as its changes. The deployed app compares that ledger with the migrations it was
-- built with (api/keepalive.ts) and raises an alert when one is missing.
--
-- CI (scripts/check-migrations.mjs) refuses a new migration that does not record itself.

BEGIN;

CREATE TABLE admin.schema_migration (
  version    text PRIMARY KEY CHECK (version ~ '^[0-9]{14}_[a-z0-9_]{1,80}$'),   -- the file name without .sql
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin.schema_migration ENABLE ROW LEVEL SECURITY;   -- no policies: functions only
REVOKE ALL ON admin.schema_migration FROM PUBLIC, anon, authenticated, service_role;

-- Called as the last statement of each migration. Running a migration twice records it once.
CREATE FUNCTION admin.migration_applied(p_version text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  INSERT INTO admin.schema_migration (version) VALUES (p_version) ON CONFLICT (version) DO NOTHING
$$;
REVOKE ALL ON FUNCTION admin.migration_applied(text) FROM PUBLIC, anon, authenticated, service_role;

-- What the deployed app reads to check itself. Names of applied migrations only.
CREATE FUNCTION public.admin_schema_status()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT coalesce(jsonb_agg(version ORDER BY version), '[]'::jsonb) FROM admin.schema_migration
$$;
REVOKE ALL ON FUNCTION public.admin_schema_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_schema_status() TO service_role;

-- Applied on 2026-11-16, before the ledger existed.
SELECT admin.migration_applied('20261116120000_app_release_policy');
SELECT admin.migration_applied('20261116150000_migration_ledger');

COMMIT;
