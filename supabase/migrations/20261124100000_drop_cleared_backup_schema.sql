-- Drops _cleared_20261112: the copy of test data taken before the Nov 12 2026 reset (25 tables,
-- including auth.users with password hashes, kyc_submissions, clients and requests). It had RLS
-- off and no primary keys, travelled in every dump and backup, and nothing reads it: no view,
-- function, foreign key or code path refers to it (checked 2026-11-24; only its own TOAST tables
-- depend on it). There is no real customer data in this database.
--
-- compat: the schema is not exposed to the API and no app version has ever read it.
--
-- Audit: Ficium database audit, 2026-11-24. Approved by KJ.

BEGIN;

DROP SCHEMA IF EXISTS _cleared_20261112 CASCADE;   -- IF EXISTS: an environment built from supabase/baseline/ never had it

SELECT admin.migration_applied('20261124100000_drop_cleared_backup_schema');

COMMIT;
