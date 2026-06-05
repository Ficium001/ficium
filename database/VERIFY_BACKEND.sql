-- =============================================================
-- FICIUM — Backend Verification Script
-- Run this in Supabase SQL Editor to verify everything is wired.
-- =============================================================

-- ── 1. CHECK ALL REQUIRED TABLES EXIST ───────────────────────
SELECT
  table_name,
  CASE WHEN table_name IN (
    'clients','requests','bids','bid_acceptances',
    'client_goals','client_journeys','journey_tasks',
    'client_documents','client_financial_snapshot','kyc_settings'
  ) THEN '✅' ELSE '⚠️' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ── 2. CHECK ALL REQUIRED VIEWS EXIST ────────────────────────
SELECT
  table_name as view_name,
  CASE WHEN table_name IN (
    'client_profile_view','v_market_rates','v_request_patterns',
    'v_acceptance_intelligence','v_market_competitiveness'
  ) THEN '✅' ELSE 'ℹ️' END as status
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ── 3. CHECK client_profile_view HAS SNAPSHOT COLUMNS ────────
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_profile_view'
ORDER BY ordinal_position;

-- ── 4. CHECK client_financial_snapshot COLUMNS ───────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_financial_snapshot'
ORDER BY ordinal_position;

-- ── 5. CHECK RLS IS ENABLED ON ALL CLIENT TABLES ─────────────
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅' ELSE '❌ MISSING RLS' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'client_goals','client_journeys','journey_tasks',
    'client_documents','client_financial_snapshot'
  )
ORDER BY tablename;

-- ── 6. CHECK RLS POLICIES EXIST ──────────────────────────────
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'client_goals','client_journeys','journey_tasks',
    'client_documents','client_financial_snapshot'
  )
ORDER BY tablename, cmd;

-- ── 7. VERIFY CLIENT DATA (your own row) ─────────────────────
SELECT
  user_id,
  first_name,
  full_name,
  kyc_status,
  kyc_verified,
  financial_profile_done,
  health_score,
  affordability_score,
  completion_percent,
  monthly_income,
  total_net_worth,
  total_assets,
  total_liabilities
FROM client_profile_view;

-- ── 8. CHECK GOALS ────────────────────────────────────────────
SELECT id, type, title, target_amount, saved_amount, status
FROM client_goals
ORDER BY created_at DESC;

-- ── 9. CHECK JOURNEYS ─────────────────────────────────────────
SELECT id, type, title, status, created_at
FROM client_journeys
ORDER BY created_at DESC;

-- ── 10. CHECK FINANCIAL SNAPSHOT ─────────────────────────────
SELECT
  client_id,
  monthly_income,
  total_assets,
  total_liabilities,
  net_worth,
  debt_to_income_ratio,
  snapshot_date
FROM client_financial_snapshot;

-- ── 11. CHECK REQUESTS ────────────────────────────────────────
SELECT
  id,
  product_type,
  amount,
  status,
  created_at
FROM requests
ORDER BY created_at DESC
LIMIT 10;

-- ── 12. CHECK MARKET INTELLIGENCE VIEWS ──────────────────────
SELECT * FROM v_market_rates LIMIT 5;
SELECT * FROM v_request_patterns LIMIT 5;

-- ── 13. VERIFY STORAGE BUCKET EXISTS ─────────────────────────
SELECT id, name, public
FROM storage.buckets
WHERE id = 'documents';

-- ── 14. SUMMARY ───────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM client_goals)           as goals_count,
  (SELECT COUNT(*) FROM client_journeys)         as journeys_count,
  (SELECT COUNT(*) FROM journey_tasks)           as tasks_count,
  (SELECT COUNT(*) FROM client_documents)        as documents_count,
  (SELECT COUNT(*) FROM client_financial_snapshot) as snapshots_count,
  (SELECT COUNT(*) FROM requests)                as requests_count;
