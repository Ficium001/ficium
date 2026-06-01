-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 PHASE 2 — FILE 4: VERIFY PHASE 2
-- Run after files 1, 2, 3 to confirm everything is correct
-- ══════════════════════════════════════════════════════════════════════════════

-- ── CHECK 1: All audit tables exist ──────────────────────────────────────────
SELECT
  'CHECK 1 — Audit tables exist' AS check_name,
  count(*) AS found,
  3 AS expected,
  CASE WHEN count(*) = 3 THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM information_schema.tables
WHERE (table_schema = 'public'      AND table_name = 'audit_events')
   OR (table_schema = 'admin'       AND table_name = 'audit_events')
   OR (table_schema = 'institution' AND table_name = 'audit_events');

-- ── CHECK 2: All audit tables are WORM (no UPDATE/DELETE policies) ────────────
SELECT
  'CHECK 2 — WORM: no UPDATE/DELETE on audit_events' AS check_name,
  count(*) AS dangerous_policies,
  CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'audit_events'
AND p.polcmd IN ('w', 'd');  -- w=UPDATE, d=DELETE

-- ── CHECK 3: V1 tables dropped ────────────────────────────────────────────────
SELECT
  'CHECK 3 — public.users dropped' AS check_name,
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN '✅ PASS' ELSE '❌ FAIL — public.users still exists' END AS result;

SELECT
  'CHECK 3b — institution.institution_users dropped' AS check_name,
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'institution' AND table_name = 'institution_users'
  ) THEN '✅ PASS' ELSE '❌ FAIL — institution_users still exists' END AS result;

-- ── CHECK 4: client_profile_view rebuilt ─────────────────────────────────────
SELECT
  'CHECK 4 — client_profile_view rebuilt' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'client_profile_view'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END AS result;

-- ── CHECK 5: unified_audit view exists ────────────────────────────────────────
SELECT
  'CHECK 5 — admin.unified_audit view exists' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'admin' AND viewname = 'unified_audit'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END AS result;

-- ── CHECK 6: Triggers exist ───────────────────────────────────────────────────
SELECT
  'CHECK 6 — Audit triggers' AS check_name,
  count(*) AS found,
  3 AS expected,
  CASE WHEN count(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM information_schema.triggers
WHERE trigger_name IN (
  'on_client_kyc_change',
  'on_request_created_audit',
  'on_bid_accepted_audit'
);

-- ── CHECK 7: Data integrity post-drop ────────────────────────────────────────
SELECT
  'CHECK 7 — All data intact' AS check_name,
  (SELECT count(*) FROM public.clients)                  AS clients,
  (SELECT count(*) FROM public.requests)                 AS requests,
  (SELECT count(*) FROM public.bid_acceptances)          AS bid_acceptances,
  (SELECT count(*) FROM institution.institution_members) AS inst_members,
  (SELECT count(*) FROM institution.institution_bids)    AS inst_bids,
  (SELECT count(*) FROM institution.institutions)        AS institutions;

-- ── Final summary ─────────────────────────────────────────────────────────────
SELECT
  '═══ PHASE 2 COMPLETE ═══' AS summary,
  (SELECT count(*) FROM public.audit_events)       AS public_audit_rows,
  (SELECT count(*) FROM admin.audit_events)        AS admin_audit_rows,
  (SELECT count(*) FROM institution.audit_events)  AS institution_audit_rows;
