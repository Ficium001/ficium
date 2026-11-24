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
  "20261119120000_admin_marketplace_stats",
  "20261124090000_revoke_anon_sensitive_grants",
  "20261124100000_drop_cleared_backup_schema",
  "20261124110000_drop_market_archive",
  "20261124140000_drop_ficium_admin_sync_role",
];
