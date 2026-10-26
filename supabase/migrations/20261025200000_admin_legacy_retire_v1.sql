-- APPLIED to the App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-25 as migration admin_legacy_retire_v1.
-- The admin pages moved to the admin DB (Neon); retire the old App DB write path so nothing can
-- bypass it. Only admin.sync_apply (role ficium_admin_sync) may now change offer listings, KYC
-- settings and platform config. Supersedes the write side of 20261022120000_offers_v1.sql
-- (public.offer_listing stays: it is the borrower read model). No CASCADE anywhere.

DROP POLICY admin_app_read ON public.kyc_settings;
DROP POLICY admin_app_read ON admin.kyc_settings_change;

DO $$ DECLARE f regprocedure; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'admin' AND p.proname IN ('offer_save','offer_approve','offer_publish','offer_withdraw','offer_reverify','set_kyc_check')
  LOOP EXECUTE format('DROP FUNCTION %s', f); END LOOP;
END $$;

DROP TABLE admin.offer_change;
DROP TABLE admin.offer;
DO $$ DECLARE f regprocedure; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'admin' AND p.proname IN ('_offer_log','_offer_change_worm')
  LOOP EXECUTE format('DROP FUNCTION %s', f); END LOOP;
END $$;

REVOKE ALL ON admin.kyc_settings_change, public.kyc_settings FROM ficium_admin_app;
REVOKE ALL ON SCHEMA admin FROM ficium_admin_app;
REVOKE ALL ON SCHEMA public FROM ficium_admin_app;
DROP ROLE ficium_admin_app;
