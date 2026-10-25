-- APPLIED to the App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-25 as migration admin_sync_v1.
-- admin_sync_v1 — App DB side of the admin-DB publish path.
-- The admin DB (Neon, app_admin) is the master for offers, KYC policy and
-- platform settings. Its outbox worker calls ONE function here,
-- admin.sync_apply, connecting as ficium_admin_sync, which can do nothing else.
--
-- Guarantees: idempotent (event_id dedupe), order-independent (per-aggregate
-- version; older or equal versions are recorded as 'stale' and skipped),
-- consistent (topic, aggregate and payload must agree), audited
-- (admin.sync_log is append-only; KYC changes also land in
-- admin.kyc_settings_change through the existing guard trigger).

CREATE TABLE admin.sync_state (
  aggregate_type  text   NOT NULL,
  aggregate_id    text   NOT NULL,
  applied_version bigint NOT NULL,
  last_event_id   uuid   NOT NULL,
  applied_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aggregate_type, aggregate_id)
);

CREATE TABLE admin.sync_log (
  event_id          uuid PRIMARY KEY,
  topic             text   NOT NULL,
  aggregate_type    text   NOT NULL,
  aggregate_id      text   NOT NULL,
  aggregate_version bigint NOT NULL,
  outcome           text   NOT NULL CHECK (outcome IN ('applied','stale')),
  received_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sync_log_aggregate_idx ON admin.sync_log (aggregate_type, aggregate_id, aggregate_version DESC);

CREATE FUNCTION admin._sync_log_worm() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'admin.sync_log is append-only' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER sync_log_worm BEFORE UPDATE OR DELETE ON admin.sync_log
  FOR EACH ROW EXECUTE FUNCTION admin._sync_log_worm();
CREATE TRIGGER sync_log_worm_trunc BEFORE TRUNCATE ON admin.sync_log
  FOR EACH STATEMENT EXECUTE FUNCTION admin._sync_log_worm();

-- Deny-all to API roles; only SECURITY DEFINER code below touches these.
ALTER TABLE admin.sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.sync_state FORCE ROW LEVEL SECURITY;
ALTER TABLE admin.sync_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.sync_log   FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin.sync_state, admin.sync_log FROM PUBLIC, anon, authenticated;

CREATE FUNCTION admin._sync_offer_upsert(p jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.offer_listing (id, institution_name, category, product_type, caption, headline, terms,
    image_tag, image_url, image_alt, is_launch, launch_window_ends, published_at, verified_at, live_until)
  VALUES ((p->>'id')::uuid, p->>'institution_name', p->>'category', (p->>'product_type')::public.product_type,
    p->>'caption', p->>'headline', p->>'terms', p->>'image_tag', p->>'image_url', p->>'image_alt',
    (p->>'is_launch')::boolean, (p->>'launch_window_ends')::timestamptz, (p->>'published_at')::timestamptz,
    (p->>'verified_at')::timestamptz, (p->>'live_until')::timestamptz)
  ON CONFLICT (id) DO UPDATE SET
    institution_name = EXCLUDED.institution_name, category = EXCLUDED.category,
    product_type = EXCLUDED.product_type, caption = EXCLUDED.caption, headline = EXCLUDED.headline,
    terms = EXCLUDED.terms, image_tag = EXCLUDED.image_tag, image_url = EXCLUDED.image_url,
    image_alt = EXCLUDED.image_alt, is_launch = EXCLUDED.is_launch,
    launch_window_ends = EXCLUDED.launch_window_ends, published_at = EXCLUDED.published_at,
    verified_at = EXCLUDED.verified_at, live_until = EXCLUDED.live_until
$$;

CREATE FUNCTION admin._sync_kyc(p_event_id uuid, p jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE k text; v jsonb; sets text[] := '{}';
  allowed constant text[] := ARRAY['ai_analysis','face_match','duplicate_face','ocr_name_match','proof_of_address',
                                   'velocity_check','document_reuse','liveness_check','mrz_validation','permit_check'];
BEGIN
  IF jsonb_typeof(p->'checks') <> 'object' THEN RAISE EXCEPTION 'kyc payload has no checks' USING ERRCODE = '22023'; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(p->'checks') LOOP
    IF NOT (k = ANY (allowed)) THEN RAISE EXCEPTION 'unknown KYC check: %', k USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(v) <> 'boolean' THEN RAISE EXCEPTION 'KYC check % is not boolean', k USING ERRCODE = '22023'; END IF;
    sets := sets || format('%I = %L', k, v::text::boolean);
  END LOOP;
  IF cardinality(sets) = 0 THEN RETURN; END IF;
  PERFORM set_config('ficium.kyc_change_actor', 'admin-db:' || p_event_id, true);
  PERFORM set_config('ficium.kyc_change_reason', 'applied from admin DB, policy version ' || (p->>'version'), true);
  EXECUTE format('UPDATE public.kyc_settings SET %s, updated_at = now() WHERE id = 1', array_to_string(sets, ', '));
  PERFORM set_config('ficium.kyc_change_actor', '', true);
  PERFORM set_config('ficium.kyc_change_reason', '', true);
END $$;

CREATE FUNCTION admin._sync_config(p jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE admin.platform_config SET value = p->'value', updated_at = now() WHERE key = p->>'key';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown platform setting %', p->>'key' USING ERRCODE = '22023'; END IF;
END $$;

CREATE FUNCTION admin.sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text,
  p_version bigint, p_payload jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
          AND (p_payload->>'version')::bigint = p_version)) THEN
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
    END CASE;
    UPDATE admin.sync_state SET applied_version = p_version, last_event_id = p_event_id, applied_at = now()
     WHERE aggregate_type = p_aggregate_type AND aggregate_id = p_aggregate_id;
    outcome := 'applied';
  END IF;

  INSERT INTO admin.sync_log (event_id, topic, aggregate_type, aggregate_id, aggregate_version, outcome)
  VALUES (p_event_id, p_topic, p_aggregate_type, p_aggregate_id, p_version, outcome)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN outcome;
END $$;

REVOKE ALL ON FUNCTION admin._sync_offer_upsert(jsonb), admin._sync_kyc(uuid, jsonb), admin._sync_config(jsonb),
  admin.sync_apply(uuid, text, text, text, bigint, jsonb), admin._sync_log_worm() FROM PUBLIC, anon, authenticated;

-- The worker's role. NOLOGIN until KJ sets a password in the Supabase SQL editor:
--   ALTER ROLE ficium_admin_sync LOGIN PASSWORD '<password manager>';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ficium_admin_sync') THEN
    CREATE ROLE ficium_admin_sync NOLOGIN NOINHERIT CONNECTION LIMIT 3;
  END IF;
END $$;
ALTER ROLE ficium_admin_sync SET statement_timeout = '10s';
ALTER ROLE ficium_admin_sync SET idle_in_transaction_session_timeout = '30s';
GRANT USAGE ON SCHEMA admin TO ficium_admin_sync;
GRANT EXECUTE ON FUNCTION admin.sync_apply(uuid, text, text, text, bigint, jsonb) TO ficium_admin_sync;
