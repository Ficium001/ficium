-- API traffic: per-channel counters, pause state, and the reads/writes the admin site needs. App DB side.
--
-- Every API call into or out of the borrower app belongs to a CHANNEL (catalogue in
-- api/_lib/api-traffic.ts). Staff see how each channel is doing in the app admin site (ficium-admin,
-- "API traffic") and can pause one. A pause arrives here as an admin-sync event (topic
-- api.channel_policy_changed) and the servers obey it within seconds; a resume is four-eyes on the
-- admin side.
--
--   1. admin.api_channel_policy   pause state per channel, versioned (only a newer version applies)
--   2. admin.api_traffic_hour     counts per channel per hour: outcomes + 8 latency buckets (35 days)
--   3. admin.api_channel_status   last success / last (scrubbed) error per channel
--   4. public.api_traffic_record  servers add a batch of counts (service_role only)
--   5. public.api_channel_policies  servers read the pause state (service_role only)
--   6. public.admin_api_traffic_stats  last 24 hours per channel for the admin site (service_role only)
--   7. public.integration_defer   a peer that is PAUSED is not a failed delivery: hold the event
--   8. admin.sync_apply           routes the new topic
--
-- Write load depends on the number of channels and servers, never on request volume: servers batch
-- counts in memory and write at most one batch per ~10 s each. Nothing here is customer data: no
-- borrower, request or document appears in any column.

BEGIN;

-- 1-3. Tables (private schema; RLS on, no policies, no direct grants) ───────────────────────────
CREATE TABLE admin.api_channel_policy (
  channel    text PRIMARY KEY CHECK (channel ~ '^[a-z][a-z0-9_.]{2,59}$'),
  state      text NOT NULL CHECK (state IN ('enabled', 'paused')),
  version    bigint NOT NULL CHECK (version >= 1),
  reason     text CHECK (reason IS NULL OR length(reason) <= 2000),
  changed_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE admin.api_channel_policy IS
  'Pause state per API channel. Written only by admin-sync (api.channel_policy_changed). No row = enabled, version 0.';

CREATE TABLE admin.api_traffic_hour (
  channel        text        NOT NULL CHECK (channel ~ '^[a-z][a-z0-9_.]{2,59}$'),
  hour           timestamptz NOT NULL,
  total          bigint NOT NULL DEFAULT 0,
  ok             bigint NOT NULL DEFAULT 0,
  client_errors  bigint NOT NULL DEFAULT 0,   -- 4xx: the caller's mistake, shown as "refused"
  server_errors  bigint NOT NULL DEFAULT 0,   -- 5xx: counted as a failure
  network_errors bigint NOT NULL DEFAULT 0,   -- no answer / timeout: counted as a failure
  blocked        bigint NOT NULL DEFAULT 0,   -- refused or held here because the channel is paused
  lat_b0 bigint NOT NULL DEFAULT 0,           -- <=50 ms
  lat_b1 bigint NOT NULL DEFAULT 0,           -- <=100
  lat_b2 bigint NOT NULL DEFAULT 0,           -- <=250
  lat_b3 bigint NOT NULL DEFAULT 0,           -- <=500
  lat_b4 bigint NOT NULL DEFAULT 0,           -- <=1000
  lat_b5 bigint NOT NULL DEFAULT 0,           -- <=2500
  lat_b6 bigint NOT NULL DEFAULT 0,           -- <=5000
  lat_b7 bigint NOT NULL DEFAULT 0,           -- slower
  PRIMARY KEY (channel, hour),
  CHECK (hour = date_trunc('hour', hour))
);
CREATE INDEX api_traffic_hour_hour_idx ON admin.api_traffic_hour (hour);

CREATE TABLE admin.api_channel_status (
  channel       text PRIMARY KEY CHECK (channel ~ '^[a-z][a-z0-9_.]{2,59}$'),
  last_ok_at    timestamptz,
  last_error_at timestamptz,
  last_error    text CHECK (last_error IS NULL OR length(last_error) <= 300)
);

ALTER TABLE admin.api_channel_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.api_traffic_hour   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.api_channel_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin.api_channel_policy, admin.api_traffic_hour, admin.api_channel_status
  FROM PUBLIC, anon, authenticated, service_role;

-- 4. Servers add a batch of counts ──────────────────────────────────────────────────────────────
-- p_rows:   [{channel, hour, total, ok, client_errors, server_errors, network_errors, blocked, lat:[8]}]
-- p_status: [{channel, ok_at, error_at, error}]
-- Bounded and validated: a bug or a hostile caller with the service key can add noise to counters,
-- never reach other data.
CREATE FUNCTION public.api_traffic_record(p_rows jsonb, p_status jsonb DEFAULT '[]')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r jsonb; s jsonb; n integer := 0; lat bigint[];
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 200
     OR jsonb_typeof(coalesce(p_status, '[]')) <> 'array' OR jsonb_array_length(coalesce(p_status, '[]')) > 50 THEN
    RAISE EXCEPTION 'invalid traffic batch' USING ERRCODE = '22023';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    SELECT array_agg(x::bigint) INTO lat FROM jsonb_array_elements_text(r->'lat') x;
    IF coalesce(array_length(lat, 1), 0) <> 8 THEN
      RAISE EXCEPTION 'invalid latency buckets' USING ERRCODE = '22023';
    END IF;
    INSERT INTO admin.api_traffic_hour AS t
      (channel, hour, total, ok, client_errors, server_errors, network_errors, blocked,
       lat_b0, lat_b1, lat_b2, lat_b3, lat_b4, lat_b5, lat_b6, lat_b7)
    VALUES (r->>'channel', date_trunc('hour', (r->>'hour')::timestamptz),
            greatest((r->>'total')::bigint, 0), greatest((r->>'ok')::bigint, 0),
            greatest((r->>'client_errors')::bigint, 0), greatest((r->>'server_errors')::bigint, 0),
            greatest((r->>'network_errors')::bigint, 0), greatest((r->>'blocked')::bigint, 0),
            greatest(lat[1], 0), greatest(lat[2], 0), greatest(lat[3], 0), greatest(lat[4], 0),
            greatest(lat[5], 0), greatest(lat[6], 0), greatest(lat[7], 0), greatest(lat[8], 0))
    ON CONFLICT (channel, hour) DO UPDATE SET
      total = t.total + EXCLUDED.total, ok = t.ok + EXCLUDED.ok,
      client_errors = t.client_errors + EXCLUDED.client_errors,
      server_errors = t.server_errors + EXCLUDED.server_errors,
      network_errors = t.network_errors + EXCLUDED.network_errors, blocked = t.blocked + EXCLUDED.blocked,
      lat_b0 = t.lat_b0 + EXCLUDED.lat_b0, lat_b1 = t.lat_b1 + EXCLUDED.lat_b1,
      lat_b2 = t.lat_b2 + EXCLUDED.lat_b2, lat_b3 = t.lat_b3 + EXCLUDED.lat_b3,
      lat_b4 = t.lat_b4 + EXCLUDED.lat_b4, lat_b5 = t.lat_b5 + EXCLUDED.lat_b5,
      lat_b6 = t.lat_b6 + EXCLUDED.lat_b6, lat_b7 = t.lat_b7 + EXCLUDED.lat_b7;
    n := n + 1;
  END LOOP;

  FOR s IN SELECT * FROM jsonb_array_elements(coalesce(p_status, '[]')) LOOP
    INSERT INTO admin.api_channel_status AS t (channel, last_ok_at, last_error_at, last_error)
    VALUES (s->>'channel', (s->>'ok_at')::timestamptz, (s->>'error_at')::timestamptz, left(s->>'error', 300))
    ON CONFLICT (channel) DO UPDATE SET
      last_ok_at = greatest(t.last_ok_at, EXCLUDED.last_ok_at),
      last_error_at = CASE WHEN EXCLUDED.last_error_at IS NOT NULL
                            AND (t.last_error_at IS NULL OR EXCLUDED.last_error_at >= t.last_error_at)
                           THEN EXCLUDED.last_error_at ELSE t.last_error_at END,
      last_error    = CASE WHEN EXCLUDED.last_error_at IS NOT NULL
                            AND (t.last_error_at IS NULL OR EXCLUDED.last_error_at >= t.last_error_at)
                           THEN EXCLUDED.last_error ELSE t.last_error END;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.api_traffic_record(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_traffic_record(jsonb, jsonb) TO service_role;

-- 5. Servers read the pause state ───────────────────────────────────────────────────────────────
CREATE FUNCTION public.api_channel_policies()
RETURNS TABLE (channel text, state text, version bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT p.channel, p.state, p.version FROM admin.api_channel_policy p
$$;
REVOKE ALL ON FUNCTION public.api_channel_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_channel_policies() TO service_role;

-- 6. Last 24 hours per channel, for the admin site ──────────────────────────────────────────────
-- The channel catalogue lives in the app's code and is passed in, so this stays generic. Latency is
-- reported as the upper bound of the bucket the percentile falls in (honest about its resolution).
CREATE FUNCTION public.admin_api_traffic_stats(p_channels text[])
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_now   timestamptz := now();
  v_first timestamptz := date_trunc('hour', now()) - interval '23 hours';
  v_out   jsonb := '[]'::jsonb;
  ch text; a record; st record; pol record; lat bigint[]; tot bigint; seen bigint; i int;
  p50 int; p95 int; hot jsonb; err jsonb;
  bounds constant int[] := ARRAY[50, 100, 250, 500, 1000, 2500, 5000, 30000];
BEGIN
  IF p_channels IS NULL OR cardinality(p_channels) > 50 THEN
    RAISE EXCEPTION 'invalid channel list' USING ERRCODE = '22023';
  END IF;
  FOREACH ch IN ARRAY p_channels LOOP
    SELECT coalesce(sum(total), 0) AS total, coalesce(sum(ok), 0) AS ok,
           coalesce(sum(client_errors), 0) AS client_errors, coalesce(sum(server_errors), 0) AS server_errors,
           coalesce(sum(network_errors), 0) AS network_errors, coalesce(sum(blocked), 0) AS blocked,
           ARRAY[coalesce(sum(lat_b0),0), coalesce(sum(lat_b1),0), coalesce(sum(lat_b2),0), coalesce(sum(lat_b3),0),
                 coalesce(sum(lat_b4),0), coalesce(sum(lat_b5),0), coalesce(sum(lat_b6),0), coalesce(sum(lat_b7),0)] AS lat
      INTO a FROM admin.api_traffic_hour WHERE channel = ch AND hour >= v_first;
    lat := a.lat;
    tot := (SELECT sum(x) FROM unnest(lat) x);
    p50 := NULL; p95 := NULL; seen := 0;
    IF tot > 0 THEN
      FOR i IN 1..8 LOOP
        seen := seen + lat[i];
        IF p50 IS NULL AND seen >= 0.50 * tot THEN p50 := bounds[i]; END IF;
        IF p95 IS NULL AND seen >= 0.95 * tot THEN p95 := bounds[i]; END IF;
      END LOOP;
    END IF;
    SELECT * INTO st  FROM admin.api_channel_status WHERE channel = ch;
    SELECT * INTO pol FROM admin.api_channel_policy WHERE channel = ch;
    SELECT jsonb_agg(coalesce(h.total, 0) ORDER BY g.hr), jsonb_agg(coalesce(h.server_errors + h.network_errors, 0) ORDER BY g.hr)
      INTO hot, err
      FROM generate_series(v_first, date_trunc('hour', v_now), interval '1 hour') AS g(hr)
      LEFT JOIN admin.api_traffic_hour h ON h.channel = ch AND h.hour = g.hr;
    v_out := v_out || jsonb_build_object(
      'key', ch, 'total', a.total, 'ok', a.ok, 'client_errors', a.client_errors,
      'server_errors', a.server_errors, 'network_errors', a.network_errors, 'blocked', a.blocked,
      'p50_ms', p50, 'p95_ms', p95,
      'last_ok_at', st.last_ok_at, 'last_error_at', st.last_error_at, 'last_error', st.last_error,
      'applied_state', coalesce(pol.state, 'enabled'), 'applied_version', coalesce(pol.version, 0),
      'hourly_total', hot, 'hourly_errors', err);
  END LOOP;
  RETURN jsonb_build_object('generated_at', v_now, 'window_hours', 24, 'channels', v_out);
END $$;
REVOKE ALL ON FUNCTION public.admin_api_traffic_stats(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_api_traffic_stats(text[]) TO service_role;

-- 7. Hold an event whose receiver is PAUSED ─────────────────────────────────────────────────────
-- integration.mark_failed dead-letters a row 24 h after it was created. A deliberate pause on the
-- other side is not a failure: put the row back without using an attempt, so a long pause cannot
-- lose events. The row keeps its created_at, so order is kept.
CREATE FUNCTION public.integration_defer(p_id text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE integration.outbox
     SET status = 'pending', attempts = greatest(attempts - 1, 0), lease_until = NULL,
         next_attempt_at = now() + interval '1 minute' * (1 + random() * 0.2),
         last_error = 'held: the receiving side has paused this channel'
   WHERE id = p_id AND status = 'sending';
$$;
REVOKE ALL ON FUNCTION public.integration_defer(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_defer(text) TO service_role;

-- 8. Apply a policy change from admin-sync ──────────────────────────────────────────────────────
-- The admin database already enforces these rules; they are checked again here because this is the
-- copy the servers obey. The admin channel can never be paused: it is the only way to resume.
CREATE FUNCTION admin._sync_api_channel(p jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_channel text := p->>'channel';
  v_state   text := p->>'state';
  v_reason  text := nullif(p->>'reason', '');
BEGIN
  IF v_channel IS NULL OR v_channel !~ '^[a-z][a-z0-9_.]{2,59}$'
     OR v_state IS NULL OR v_state NOT IN ('enabled', 'paused')
     OR (p->>'version')::bigint < 1
     OR (v_reason IS NOT NULL AND length(v_reason) > 2000) THEN
    RAISE EXCEPTION 'invalid api channel event' USING ERRCODE = '22023';
  END IF;
  IF v_state = 'paused' AND v_channel = 'admin.channel' THEN
    RAISE EXCEPTION 'the admin channel cannot be paused' USING ERRCODE = '22023';
  END IF;
  INSERT INTO admin.api_channel_policy AS t (channel, state, version, reason, changed_at)
  VALUES (v_channel, v_state, (p->>'version')::bigint, v_reason, now())
  ON CONFLICT (channel) DO UPDATE
     SET state = EXCLUDED.state, version = EXCLUDED.version, reason = EXCLUDED.reason, changed_at = now()
   WHERE t.version < EXCLUDED.version;
END $$;
REVOKE ALL ON FUNCTION admin._sync_api_channel(jsonb) FROM PUBLIC, anon, authenticated;

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
          AND p_aggregate_id = p_payload->>'platform' AND (p_payload->>'version')::bigint = p_version)
    OR (p_topic = 'api.channel_policy_changed' AND p_aggregate_type = 'api_channel'
          AND p_aggregate_id = p_payload->>'channel' AND (p_payload->>'version')::bigint = p_version)) THEN
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
      WHEN 'api.channel_policy_changed' THEN PERFORM admin._sync_api_channel(p_payload);
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

-- Counts older than 35 days are not needed. Daily, where the scheduler is installed (the App DB).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('api-traffic-purge', '37 2 * * *',
      $job$DELETE FROM admin.api_traffic_hour WHERE hour < now() - interval '35 days'$job$);
  END IF;
END $$;

SELECT admin.migration_applied('20261117090000_api_traffic');

COMMIT;
