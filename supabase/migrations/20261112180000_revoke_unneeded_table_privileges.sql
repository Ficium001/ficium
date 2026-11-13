-- Remove privileges no application path needs from the API roles — App DB.
--
-- TRUNCATE ignores RLS entirely; TRIGGER / REFERENCES / MAINTAIN are owner-level
-- operations. SELECT/INSERT/UPDATE/DELETE grants are untouched.
--
-- Found Nov 12 2026: Supabase defaults had given anon AND authenticated all four
-- on every public table (36 tables + 2 views). The REST API does not expose
-- TRUNCATE, but any bug in a SQL function/RPC would have let a caller empty a
-- table past RLS, and a bank's risk team or pen tester flags it on sight.
--
-- Applied to the live App DB on Nov 12 2026 and verified: 0 objects still carry
-- them; authenticated SELECT, replace_client_loans() and normal DML still work.
-- Idempotent.
--
-- Residual: default privileges of role supabase_admin (used for objects Supabase
-- itself creates) cannot be changed from the postgres role, so an object created
-- BY supabase_admin in public would still inherit them. Re-run this migration after any
-- table created from the Supabase dashboard.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS rel
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON %s FROM anon, authenticated', r.rel);
  END LOOP;
END $$;

-- Tables created from now on (as postgres) no longer inherit them.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon, authenticated;
