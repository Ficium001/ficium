-- pg_trgm leaves schema public; the last storage policy on role public moves to authenticated.
-- From the database audit, open items 10 and 11 (2026-11-26).
--
-- 1. pg_trgm moves to schema extensions (Supabase's convention; advisor 0014). No index uses
--    it. Its one caller, public.submit_couple_relationship_document (SECURITY DEFINER), calls
--    similarity() unqualified with search_path=public, so its search_path gains extensions
--    first. No app code calls pg_trgm directly.
-- 2. storage.objects policy documents_storage_policy targeted role public (anon included);
--    its auth.uid() check refused anon, but every other Ficium policy names authenticated.
-- pg_net stays in public: the extension does not support SET SCHEMA; the production build
-- creates it in extensions.
--
-- Self-checking; dry-run on live first (rolled back).
-- compat: no behaviour change for installed apps.

BEGIN;

ALTER FUNCTION public.submit_couple_relationship_document(uuid, uuid, uuid, text)
  SET search_path = public, extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER POLICY documents_storage_policy ON storage.objects TO authenticated;

DO $check$
BEGIN
  IF (SELECT extnamespace::regnamespace::text FROM pg_extension WHERE extname = 'pg_trgm') <> 'extensions' THEN
    RAISE EXCEPTION 'self-check: pg_trgm not in schema extensions';
  END IF;
  IF extensions.similarity('ficium', 'ficum') <= 0 THEN
    RAISE EXCEPTION 'self-check: similarity() does not work';
  END IF;
  IF NOT (SELECT polroles = ARRAY['authenticated'::regrole::oid] FROM pg_policy WHERE polname = 'documents_storage_policy') THEN
    RAISE EXCEPTION 'self-check: documents_storage_policy not on authenticated';
  END IF;
END $check$;

SELECT admin.migration_applied('20261126090000_pg_trgm_schema_and_storage_policy');

COMMIT;
