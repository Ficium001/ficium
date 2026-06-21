-- =============================================================================
-- CLEANUP — drop v2-migration rollback backups (v2 confirmed stable).
--
-- backup_v1     (32 tables) — rollback source for the v1→v2 redesign
-- backup_pre_drop (3 tables) — smaller pre-drop safety copy
--
-- Both held stale PII duplicates (old users, financial_profiles, etc.) with
-- RLS-enabled/no-policy (denied to authenticated, not in PostgREST exposed
-- schemas). With v2 stable in production these are removed: ~440 kB reclaimed
-- and the dormant PII-copy surface eliminated.
--
-- NOTE: this retires the v2 rollback path. Only run once v2 is confirmed good.
-- =============================================================================

DROP SCHEMA IF EXISTS backup_v1 CASCADE;
DROP SCHEMA IF EXISTS backup_pre_drop CASCADE;
