-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 8: FULL ROLLBACK
-- Use this if anything goes wrong after files 2-6
-- Restores all V1 tables from backup_v1 schema
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Safety check ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backup_v1'
  ) THEN
    RAISE EXCEPTION 'backup_v1 schema not found — cannot rollback!';
  END IF;
END $$;

-- ── Drop V2 new tables ────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.client_dossier CASCADE;
DROP TABLE IF EXISTS public.client_loan_details CASCADE;
DROP TABLE IF EXISTS institution.institution_members CASCADE;

-- ── Restore public schema from backup ────────────────────────────────────────
-- Restore financial_profiles
CREATE TABLE IF NOT EXISTS public.financial_profiles AS 
  SELECT * FROM backup_v1.financial_profiles;

-- Restore loan_details
CREATE TABLE IF NOT EXISTS public.loan_details AS
  SELECT * FROM backup_v1.loan_details;

-- Restore bank_profiles
CREATE TABLE IF NOT EXISTS public.bank_profiles AS
  SELECT * FROM backup_v1.bank_profiles;

-- Restore client_requests
CREATE TABLE IF NOT EXISTS public.client_requests AS
  SELECT * FROM backup_v1.client_requests;

-- Restore bids
CREATE TABLE IF NOT EXISTS public.bids AS
  SELECT * FROM backup_v1.bids;

-- ── Restore handle_new_user trigger to V1 ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, full_name, first_name, last_name, phone, title,
    role, kyc_status, user_type, company_name, company_registration
  ) VALUES (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    NULLIF(new.raw_user_meta_data->>'title', '')::public.title_type,
    coalesce(new.raw_user_meta_data->>'role', 'client')::public.user_role,
    'pending'::public.kyc_status,
    coalesce(new.raw_user_meta_data->>'user_type', 'individual'),
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'company_registration'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END; $$;

-- ── Restore get_my_institution_id to V1 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION institution.get_my_institution_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT institution_id
  FROM institution.institution_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ── Drop get_my_role (V2 only) ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS institution.get_my_member_id();

-- ── Verify rollback ───────────────────────────────────────────────────────────
SELECT
  'public.users'            AS table_name,
  (SELECT count(*) FROM public.users) AS row_count,
  (SELECT count(*) FROM backup_v1.users) AS backup_count
UNION ALL
SELECT
  'institution.institution_users',
  (SELECT count(*) FROM institution.institution_users),
  (SELECT count(*) FROM backup_v1.institution_users)
UNION ALL
SELECT
  'public.financial_profiles',
  (SELECT count(*) FROM public.financial_profiles),
  (SELECT count(*) FROM backup_v1.financial_profiles);

SELECT 'Rollback complete — V1 restored from backup_v1' AS status;

-- ── Cleanup backup after confirmed rollback ───────────────────────────────────
-- Only run this line when you're sure rollback worked and V1 is stable:
-- DROP SCHEMA backup_v1 CASCADE;
