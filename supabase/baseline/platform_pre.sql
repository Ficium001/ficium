-- Ficium App DB baseline. GENERATED: do not edit by hand.
-- Through 20261124110000_drop_market_archive. Regenerate with the schema-baseline workflow on a
-- schema-baseline/* branch; see supabase/baseline/README.md.

-- Extensions

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Ficium roles (created NOLOGIN; give a login and password by hand where one is needed)

DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ficium_admin_sync') THEN CREATE ROLE ficium_admin_sync NOLOGIN; END IF; END $r$;
