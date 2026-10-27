-- Admin sync over HTTPS (architecture rule: services talk through APIs, never
-- through each other's databases).
--
-- Until now the admin site's outbox worker connected straight to this
-- database as ficium_admin_sync. From now on it calls this app's API
-- (POST /api/internal?op=admin-sync, HMAC-signed), and the app's own server
-- applies the event through this wrapper. Same single function, same
-- idempotency and versioning (admin.sync_apply does all of that).
--
-- Callable by the app server's service role ONLY. Supabase grants EXECUTE on
-- new public functions to anon and authenticated by default: revoked below.
-- ficium_admin_sync keeps its LOGIN until the admin site is switched over;
-- a follow-up migration removes it.

CREATE OR REPLACE FUNCTION public.admin_sync_apply(
  p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text,
  p_version bigint, p_payload jsonb)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT admin.sync_apply(p_event_id, p_topic, p_aggregate_type, p_aggregate_id, p_version, p_payload)
$$;

REVOKE ALL ON FUNCTION public.admin_sync_apply(uuid, text, text, text, bigint, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_apply(uuid, text, text, text, bigint, jsonb)
  TO service_role;
