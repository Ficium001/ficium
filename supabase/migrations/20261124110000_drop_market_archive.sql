-- Drops market_archive: four tables of seeded and fabricated market rates set aside by
-- 20261030151000_market_remove_fabricated_rates (lending, deposit and indicative FX rates, plus
-- the fabricated market_data rows). They had RLS off and no primary keys, and nothing reads them:
-- no view, function, foreign key or code path (checked 2026-11-24).
--
-- compat: the schema is not exposed to the API and no app version has ever read it.
--
-- Audit: Ficium database audit, 2026-11-24. Approved by KJ.

BEGIN;

DROP SCHEMA IF EXISTS market_archive CASCADE;   -- IF EXISTS: an environment built from supabase/baseline/ never had it

SELECT admin.migration_applied('20261124110000_drop_market_archive');

COMMIT;
