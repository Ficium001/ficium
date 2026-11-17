/**
 * Migrations the deployed app expects to find applied (api/keepalive.ts compares this with the
 * database's ledger). Generated: run `node scripts/check-migrations.mjs --write`. CI fails if it
 * does not match supabase/migrations/.
 */
export const EXPECTED_MIGRATIONS: readonly string[] = [
  "20261116120000_app_release_policy",
  "20261116150000_migration_ledger",
  "20261116160000_app_error_reports",
  "20261117090000_api_traffic",
];
