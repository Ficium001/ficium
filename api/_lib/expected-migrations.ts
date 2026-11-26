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
  "20261124130000_cron_urls_from_vault",
  "20261124150000_fk_indexes_and_policy_initplan",
  "20261124160000_policy_roles_and_duplicates",
  "20261124170000_drop_ficium_admin_sync_role",
  "20261125100000_audit_logs_append_only",
  "20261126090000_pg_trgm_schema_and_storage_policy",
  "20261126110000_drop_broken_institution_audit_policy",
  "20261126180000_login_otp",
];
