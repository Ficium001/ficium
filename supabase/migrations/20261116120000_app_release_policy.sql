-- Mobile app release policy and version monitoring, App DB side.
--
-- The iOS and Android apps carry their screens inside the installed binary, so old versions stay
-- in use after a new one ships. Ficium staff decide in the app admin site (ficium-admin, four-eyes,
-- audited) which versions may still run. That decision arrives here as an admin-sync event (topic
-- app.release_policy_changed) and the apps read it from public.app_release_policy.
--
--   1. public.app_release_policy     what the apps read: the lowest version allowed to run
--   2. public.app_client_seen        which app version each signed-in borrower last used
--   3. public.report_app_client      the app reports its own version (signed-in users only)
--   4. public.admin_app_release_stats  counts for the admin site (service_role, signed channel)
--   5. admin.sync_apply              routes the new topic
--
-- Nothing here is a security boundary. The gate in the app is a rollout control; the server still
-- authorises every request itself. Versions in app_client_seen are self-reported and are used for
-- counting only, never for a decision about one user.

BEGIN;

-- 1. The policy the apps read ───────────────────────────────────────────────────────────────────
CREATE TABLE public.app_release_policy (
  platform       text PRIMARY KEY CHECK (platform IN ('ios', 'android')),
  min_version    text NOT NULL CHECK (min_version    ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'),
  latest_version text NOT NULL CHECK (latest_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'),
  store_url      text NOT NULL DEFAULT '',
  version        bigint NOT NULL DEFAULT 0,          -- the admin site's version of this row; 0 = as seeded
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (string_to_array(min_version, '.')::int[] <= string_to_array(latest_version, '.')::int[])
);
COMMENT ON TABLE public.app_release_policy IS
  'Lowest mobile app version allowed to run, per platform. Written only by admin-sync (app.release_policy_changed). Public read.';

-- Same starting values as the admin database's seed, so both sides agree before the first change.
INSERT INTO public.app_release_policy (platform, min_version, latest_version, store_url) VALUES
  ('ios',     '1.0.0', '1.0.0', ''),
  ('android', '1.0.0', '1.0.0', 'https://play.google.com/store/apps/details?id=net.ficium.app');

-- Readable by everyone, including before sign-in: an unsupported app must find out at the login
-- screen. It holds two version numbers and a store link per platform, nothing else.
ALTER TABLE public.app_release_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_release_policy_read ON public.app_release_policy FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.app_release_policy FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.app_release_policy TO anon, authenticated, service_role;

-- 2. Which version each borrower last used ──────────────────────────────────────────────────────
-- One row per borrower and platform, so the table grows with users, not with app opens.
CREATE TABLE public.app_client_seen (
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform      text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version   text NOT NULL CHECK (app_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'),
  app_build     text NOT NULL DEFAULT '' CHECK (app_build ~ '^[0-9]{0,10}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, platform)
);
CREATE INDEX app_client_seen_recent_idx ON public.app_client_seen (last_seen_at);
COMMENT ON TABLE public.app_client_seen IS
  'Mobile app version each borrower last used (self-reported). Counting only. Written by report_app_client; no direct access.';

ALTER TABLE public.app_client_seen ENABLE ROW LEVEL SECURITY;   -- no policies: functions only
REVOKE ALL ON public.app_client_seen FROM PUBLIC, anon, authenticated, service_role;

-- Not a record we must keep: it goes when the account is closed.
CREATE FUNCTION public._app_client_seen_forget() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  DELETE FROM public.app_client_seen WHERE client_id = NEW.client_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._app_client_seen_forget() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER account_closures_forget_app_client
  AFTER INSERT ON public.account_closures
  FOR EACH ROW EXECUTE FUNCTION public._app_client_seen_forget();

-- 3. The app reports its version ────────────────────────────────────────────────────────────────
-- Called by the phone app after sign-in. Writes at most once per 6 hours per borrower and
-- platform unless the version changed, so a chatty or hostile client cannot cause write load.
CREATE FUNCTION public.report_app_client(p_platform text, p_version text, p_build text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_build text := coalesce(p_build, '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_platform IS NULL OR p_platform NOT IN ('ios', 'android')
     OR p_version IS NULL OR p_version !~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'
     OR v_build !~ '^[0-9]{0,10}$' THEN
    RAISE EXCEPTION 'invalid app version report' USING ERRCODE = '22023';
  END IF;
  -- Borrowers only. Other signed-in roles have no row in clients and are ignored.
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_uid) THEN
    RETURN;
  END IF;

  INSERT INTO public.app_client_seen AS s (client_id, platform, app_version, app_build)
  VALUES (v_uid, p_platform, p_version, v_build)
  ON CONFLICT (client_id, platform) DO UPDATE
     SET app_version = EXCLUDED.app_version, app_build = EXCLUDED.app_build, last_seen_at = now()
   WHERE s.app_version <> EXCLUDED.app_version
      OR s.app_build   <> EXCLUDED.app_build
      OR s.last_seen_at < now() - interval '6 hours';
END $$;
REVOKE ALL ON FUNCTION public.report_app_client(text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.report_app_client(text, text, text) TO authenticated;

-- 4. Counts for the admin site ──────────────────────────────────────────────────────────────────
-- Reached only through the signed admin channel (/api/internal?op=admin-app). Totals per platform
-- and version: no borrower is identified.
CREATE FUNCTION public.admin_app_release_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'policy', (SELECT jsonb_agg(jsonb_build_object(
                        'platform', p.platform, 'min_version', p.min_version, 'latest_version', p.latest_version,
                        'store_url', p.store_url, 'version', p.version, 'updated_at', p.updated_at)
                      ORDER BY p.platform)
                 FROM public.app_release_policy p),
    'versions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'platform', v.platform, 'app_version', v.app_version,
               'active_7d', v.active_7d, 'active_30d', v.active_30d)
             ORDER BY v.platform, string_to_array(v.app_version, '.')::int[] DESC)
        FROM (SELECT s.platform, s.app_version,
                     count(*) FILTER (WHERE s.last_seen_at > now() - interval '7 days') AS active_7d,
                     count(*) AS active_30d
                FROM public.app_client_seen s
               WHERE s.last_seen_at > now() - interval '30 days'
               GROUP BY s.platform, s.app_version) v), '[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.admin_app_release_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_app_release_stats() TO service_role;

-- 5. Apply a policy change from admin-sync ──────────────────────────────────────────────────────
-- The admin database already enforces these rules. They are checked again here because this is
-- the copy the apps obey: a bad row would lock customers out or point them at the wrong place.
CREATE FUNCTION admin._sync_app_release(p jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_platform text := p->>'platform';
  v_min      text := p->>'min_version';
  v_latest   text := p->>'latest_version';
  v_url      text := coalesce(p->>'store_url', '');
  v_ok       constant text := '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$';
BEGIN
  IF v_platform IS NULL OR v_platform NOT IN ('ios', 'android')
     OR v_min IS NULL OR v_min !~ v_ok OR v_latest IS NULL OR v_latest !~ v_ok
     OR string_to_array(v_min, '.')::int[] > string_to_array(v_latest, '.')::int[] THEN
    RAISE EXCEPTION 'invalid app release event' USING ERRCODE = '22023';
  END IF;
  IF v_url <> '' AND NOT (length(v_url) <= 300 AND v_url !~ '[[:space:]]' AND CASE v_platform
       WHEN 'ios'     THEN v_url ~ '^https://apps\.apple\.com/[A-Za-z0-9/._?=&%-]+$'
       WHEN 'android' THEN v_url ~ '^https://play\.google\.com/store/apps/details\?id=[A-Za-z0-9._]+$'
     END) THEN
    RAISE EXCEPTION 'invalid store link in app release event' USING ERRCODE = '22023';
  END IF;

  UPDATE public.app_release_policy
     SET min_version = v_min, latest_version = v_latest, store_url = v_url,
         version = (p->>'version')::bigint, updated_at = now()
   WHERE platform = v_platform;
END $$;
REVOKE ALL ON FUNCTION admin._sync_app_release(jsonb) FROM PUBLIC, anon, authenticated;

-- Same function as before with one more topic. Everything else is unchanged.
CREATE OR REPLACE FUNCTION admin.sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE cur bigint; outcome text;
BEGIN
  IF p_event_id IS NULL OR p_version IS NULL OR p_version < 1 OR p_payload IS NULL THEN
    RAISE EXCEPTION 'invalid sync event' USING ERRCODE = '22023';
  END IF;
  -- topic, aggregate and payload must agree: no cross-wiring
  IF NOT (
       (p_topic IN ('offer.listing_upserted','offer.listing_removed') AND p_aggregate_type = 'offer'
          AND p_aggregate_id = p_payload->>'id')
    OR (p_topic = 'kyc.policy_changed' AND p_aggregate_type = 'kyc_policy' AND p_aggregate_id = 'global'
          AND (p_payload->>'version')::bigint = p_version)
    OR (p_topic = 'config.setting_changed' AND p_aggregate_type = 'setting' AND p_aggregate_id = p_payload->>'key'
          AND (p_payload->>'version')::bigint = p_version)
    OR (p_topic = 'kyc.case_decided' AND p_aggregate_type = 'kyc_submission'
          AND p_aggregate_id = p_payload->>'submission_id' AND p_version = 1)
    OR (p_topic = 'client.access_changed' AND p_aggregate_type = 'client'
          AND p_aggregate_id = p_payload->>'client_id' AND (p_payload->>'version')::bigint = p_version)
    OR (p_topic = 'app.release_policy_changed' AND p_aggregate_type = 'app_release'
          AND p_aggregate_id = p_payload->>'platform' AND (p_payload->>'version')::bigint = p_version)) THEN
    RAISE EXCEPTION 'unknown topic or inconsistent event %', p_topic USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM admin.sync_log WHERE event_id = p_event_id) THEN RETURN 'duplicate'; END IF;

  INSERT INTO admin.sync_state (aggregate_type, aggregate_id, applied_version, last_event_id)
  VALUES (p_aggregate_type, p_aggregate_id, 0, p_event_id) ON CONFLICT DO NOTHING;
  SELECT applied_version INTO cur FROM admin.sync_state
   WHERE aggregate_type = p_aggregate_type AND aggregate_id = p_aggregate_id FOR UPDATE;

  IF p_version <= cur THEN
    outcome := 'stale';
  ELSE
    CASE p_topic
      WHEN 'offer.listing_upserted' THEN PERFORM admin._sync_offer_upsert(p_payload);
      WHEN 'offer.listing_removed'  THEN DELETE FROM public.offer_listing WHERE id = (p_payload->>'id')::uuid;
      WHEN 'kyc.policy_changed'     THEN PERFORM admin._sync_kyc(p_event_id, p_payload);
      WHEN 'config.setting_changed' THEN PERFORM admin._sync_config(p_payload);
      WHEN 'kyc.case_decided'       THEN PERFORM admin._sync_kyc_decision(p_payload);
      WHEN 'client.access_changed'  THEN PERFORM admin._sync_client_access(p_payload);
      WHEN 'app.release_policy_changed' THEN PERFORM admin._sync_app_release(p_payload);
    END CASE;
    UPDATE admin.sync_state SET applied_version = p_version, last_event_id = p_event_id, applied_at = now()
     WHERE aggregate_type = p_aggregate_type AND aggregate_id = p_aggregate_id;
    outcome := 'applied';
  END IF;

  INSERT INTO admin.sync_log (event_id, topic, aggregate_type, aggregate_id, aggregate_version, outcome)
  VALUES (p_event_id, p_topic, p_aggregate_type, p_aggregate_id, p_version, outcome)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN outcome;
END $function$;

COMMIT;
