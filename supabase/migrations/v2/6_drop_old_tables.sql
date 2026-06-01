-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 6: DROP OLD TABLES
-- ⚠️  POINT OF NO RETURN — Only run after:
--     ✅ File 4 verification passed (0 issues on all checks)
--     ✅ File 5 swap complete
--     ✅ Frontend updated to use new V2 queries (file 7)
--     ✅ App tested end-to-end on V2 tables
--     ✅ backup_v1 schema confirmed intact
-- ══════════════════════════════════════════════════════════════════════════════

-- Confirm backup exists before proceeding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backup_v1'
  ) THEN
    RAISE EXCEPTION 'backup_v1 schema not found — run file 1 first!';
  END IF;
  IF (SELECT count(*) FROM backup_v1.users) = 0 THEN
    RAISE EXCEPTION 'backup_v1.users is empty — backup may have failed!';
  END IF;
END $$;

-- ── DROP empty/duplicate tables (safe — verified 0 rows) ─────────────────────
DROP TABLE IF EXISTS public.client_requests;  -- 0 rows, duplicate of requests
DROP TABLE IF EXISTS public.bids;             -- 0 rows, legacy (replaced by institution_bids)

-- ── DROP V1 tables that have been fully migrated to V2 ───────────────────────

-- financial_profiles → merged into public.client_dossier
DROP TABLE IF EXISTS public.financial_profiles;

-- loan_details → moved to public.client_loan_details
-- Note: this was in public schema (user_id FK) not institution
DROP TABLE IF EXISTS public.loan_details;

-- bank_profiles → merged into institution.institution_members
DROP TABLE IF EXISTS public.bank_profiles;

-- institution_users → replaced by institution.institution_members
-- Keep for now as fallback during transition — drop in Phase 2
-- DROP TABLE IF EXISTS institution.institution_users;

-- ── NOTE: public.users is NOT dropped yet ────────────────────────────────────
-- public.users stays during transition because:
-- 1. AuthContext still reads from it (until frontend is updated)
-- 2. RLS policies reference it
-- 3. Webhooks and triggers may reference it
-- Drop public.users ONLY after frontend is fully updated to use get_my_role()
-- and all references to public.users are removed from the codebase

-- ── Verify drops successful ───────────────────────────────────────────────────
SELECT
  table_name,
  'DROPPED' AS status
FROM (VALUES
  ('client_requests'),
  ('bids'),
  ('financial_profiles'),
  ('loan_details'),
  ('bank_profiles')
) AS dropped(table_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_name = dropped.table_name
);

SELECT 'Old tables dropped successfully' AS status;

-- ── PHASE 2 REMINDER ─────────────────────────────────────────────────────────
SELECT '
PHASE 2 TODO:
1. Add public.audit_events (client actions WORM table)
2. Add admin.audit_events (platform admin actions WORM table)
3. Drop institution.institution_users (after frontend fully migrated)
4. Drop public.users (after all references removed from frontend)
5. Update AuthContext to call get_my_role() instead of querying public.users
' AS phase_2_reminder;
