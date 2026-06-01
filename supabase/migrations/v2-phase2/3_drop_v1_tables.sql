-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 PHASE 2 — FILE 3: DROP REMAINING V1 TABLES
-- Drops public.users and institution.institution_users
-- ⚠️  Only run after:
--     ✅ All frontend references to public.users removed
--     ✅ App tested end-to-end on V2 tables
--     ✅ backup_v1 schema confirmed intact
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Safety checks ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Verify backup exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backup_v1'
  ) THEN
    RAISE EXCEPTION 'backup_v1 schema not found — cannot proceed safely';
  END IF;

  -- Verify clients table has data before dropping users
  IF (SELECT count(*) FROM public.clients) = 0 THEN
    RAISE EXCEPTION 'public.clients is empty — migration may not have run';
  END IF;

  -- Verify institution_members has data before dropping institution_users
  IF (SELECT count(*) FROM institution.institution_members) = 0 THEN
    RAISE EXCEPTION 'institution.institution_members is empty — migration may not have run';
  END IF;
END $$;

-- ── Verify all clients migrated before dropping ───────────────────────────────
SELECT
  'Clients in public.users'   AS source,
  count(*) AS count
FROM public.users WHERE role = 'client'
UNION ALL
SELECT
  'Clients in public.clients',
  count(*) FROM public.clients;

-- ── Drop institution.institution_users ────────────────────────────────────────
-- Remove FK constraints that reference institution_users first
ALTER TABLE institution.pending_actions
  DROP CONSTRAINT IF EXISTS pending_actions_maker_id_fkey;

ALTER TABLE institution.pending_actions
  DROP CONSTRAINT IF EXISTS pending_actions_checker_id_fkey;

-- Now drop the table
DROP TABLE IF EXISTS institution.institution_users CASCADE;

SELECT 'institution.institution_users dropped' AS status;

-- ── Drop public.users ─────────────────────────────────────────────────────────
-- Remove any remaining FK constraints referencing public.users
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Drop views that reference public.users
DROP VIEW IF EXISTS public.client_profile_view CASCADE;
DROP VIEW IF EXISTS public.requests_anon CASCADE;

-- Drop the table
DROP TABLE IF EXISTS public.users CASCADE;

SELECT 'public.users dropped' AS status;

-- ── Recreate client_profile_view using public.clients ─────────────────────────
CREATE OR REPLACE VIEW public.client_profile_view
WITH (security_invoker=false)
AS
SELECT
  c.id                                          AS user_id,
  c.email,
  c.full_name,
  c.first_name,
  c.last_name,
  c.kyc_status,
  c.date_of_birth,
  c.address_line_1,
  c.city,
  c.country,
  c.user_type,
  -- KYC flags
  (c.kyc_status = 'verified')                   AS kyc_verified,
  (c.address_line_1 IS NOT NULL)                AS proof_of_address_done,
  -- Dossier
  d.employment_status,
  d.monthly_income,
  d.total_net_worth,
  d.has_existing_loans,
  d.pep_declaration                             AS is_pep,
  d.tax_residency,
  d.source_of_wealth,
  d.health_score,
  d.risk_score,
  d.affordability_score,
  (d.client_id IS NOT NULL)                     AS financial_profile_done,
  (d.source_of_wealth IS NOT NULL)              AS source_of_wealth_done,
  -- Compliance
  comp.enhanced_due_diligence_required,
  -- Completion percent
  (
    20
    + CASE WHEN c.kyc_status = 'verified' THEN 20 ELSE 0 END
    + CASE WHEN c.address_line_1 IS NOT NULL THEN 15 ELSE 0 END
    + CASE WHEN d.client_id IS NOT NULL THEN 30 ELSE 0 END
    + CASE WHEN d.source_of_wealth IS NOT NULL THEN 15 ELSE 0 END
  )                                             AS completion_percent
FROM public.clients c
LEFT JOIN public.client_dossier d ON d.client_id = c.id
LEFT JOIN public.compliance_details comp ON comp.user_id = c.id
WHERE c.id = auth.uid();

-- ── Verify drops ──────────────────────────────────────────────────────────────
SELECT
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = v.table_name
  ) THEN '⚠️ STILL EXISTS' ELSE '✅ DROPPED' END AS status
FROM (VALUES ('users')) AS v(table_name)
UNION ALL
SELECT
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'institution' AND t.table_name = v.table_name
  ) THEN '⚠️ STILL EXISTS' ELSE '✅ DROPPED' END AS status
FROM (VALUES ('institution_users')) AS v(table_name);

SELECT 'Phase 2 — V1 tables dropped successfully' AS status;
