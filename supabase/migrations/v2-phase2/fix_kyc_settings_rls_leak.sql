-- =============================================================================
-- SECURITY FIX — kyc_settings was world-readable AND world-writable.
--
-- The "Admin read/update kyc_settings" policies used USING(true) with NO admin
-- check, so any authenticated client could read fraud-check configuration and,
-- critically, UPDATE it — disabling their own KYC checks (face_match,
-- liveness_check, duplicate_face, mrz_validation, ...) before submitting a
-- fraudulent verification.
--
-- The KYC serverless functions (api/_kyc/settings.ts, api/_kyc/verify.ts) use
-- the SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS, so gating these policies
-- to ficium_admin does NOT affect the verification flow.
--
-- Verified: regular client now sees 0 rows and cannot update; ficium_admin
-- retains full access; service_role unaffected.
-- =============================================================================

DROP POLICY IF EXISTS "Admin read kyc_settings"   ON public.kyc_settings;
DROP POLICY IF EXISTS "Admin update kyc_settings" ON public.kyc_settings;

CREATE POLICY kyc_settings_admin_read ON public.kyc_settings
  FOR SELECT TO authenticated
  USING (public.is_ficium_admin());

CREATE POLICY kyc_settings_admin_update ON public.kyc_settings
  FOR UPDATE TO authenticated
  USING (public.is_ficium_admin())
  WITH CHECK (public.is_ficium_admin());
