-- Ficium App DB baseline. GENERATED: do not edit by hand.
-- Through 20261125100000_audit_logs_append_only. Regenerate with the schema-baseline workflow on a
-- schema-baseline/* branch; see supabase/baseline/README.md.

--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: admin; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA admin;

--
-- Name: fico; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA fico;

--
-- Name: finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA finance;

--
-- Name: integration; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA integration;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';

--
-- Name: vault_extract; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault_extract;

--
-- Name: action_category_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.action_category_type AS ENUM (
    'institution.approve',
    'institution.suspend',
    'institution.modules_update',
    'institution.deployment_change',
    'onboarding.stage_advance',
    'compliance.status_update',
    'bid.submit',
    'bid.withdraw',
    'webhook.create',
    'webhook.update',
    'webhook.delete',
    'api_key.create',
    'api_key.revoke',
    'user.invite',
    'user.role_change',
    'user.remove',
    'sla.update',
    'request.submit',
    'request.cancel',
    'bid.accept'
);

--
-- Name: action_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.action_status_type AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired',
    'cancelled'
);

--
-- Name: actor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.actor_type AS ENUM (
    'institution_user',
    'client_user',
    'ficium_admin',
    'system'
);

--
-- Name: bid_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bid_status AS ENUM (
    'submitted',
    'accepted',
    'rejected',
    'expired',
    'withdrawn'
);

--
-- Name: bid_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bid_status_type AS ENUM (
    'draft',
    'submitted',
    'accepted',
    'rejected',
    'expired',
    'withdrawn'
);

--
-- Name: compliance_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compliance_status_type AS ENUM (
    'not_submitted',
    'under_review',
    'passed',
    'failed',
    'expired'
);

--
-- Name: consent_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consent_state AS ENUM (
    'invited',
    'consented',
    'declined',
    'revoked'
);

--
-- Name: couple_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.couple_status AS ENUM (
    'pending_verification',
    'verified',
    'dissolved'
);

--
-- Name: deployment_model_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deployment_model_type AS ENUM (
    'saas',
    'paas',
    'on_prem'
);

--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender_type AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
);

--
-- Name: id_document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.id_document_type AS ENUM (
    'national_id',
    'passport',
    'drivers_license',
    'other'
);

--
-- Name: institution_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.institution_type AS ENUM (
    'bank',
    'fintech',
    'micro_credit',
    'insurance',
    'investment_firm',
    'other'
);

--
-- Name: integration_mode_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.integration_mode_type AS ENUM (
    'portal',
    'webhook',
    'api_pull',
    'core_banking'
);

--
-- Name: invitation_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invitation_channel AS ENUM (
    'email',
    'sms'
);

--
-- Name: invitation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'revoked'
);

--
-- Name: kyc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyc_status AS ENUM (
    'pending',
    'verified',
    'rejected',
    'pending_review',
    'under_review'
);

--
-- Name: liability_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.liability_type AS ENUM (
    'joint_and_several',
    'several',
    'guarantor'
);

--
-- Name: notification_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_kind AS ENUM (
    'kyc_verified',
    'kyc_rejected',
    'request_created',
    'request_expiring',
    'bid_received',
    'bid_accepted',
    'bid_expired',
    'system'
);

--
-- Name: onboarding_stage_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.onboarding_stage_type AS ENUM (
    'registered',
    'commercial_review',
    'deployment_selected',
    'modules_assigned',
    'technical_setup',
    'compliance_review',
    'pending_approval',
    'approved',
    'suspended'
);

--
-- Name: outcome_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outcome_type AS ENUM (
    'success',
    'rejected',
    'expired',
    'error'
);

--
-- Name: participant_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.participant_role AS ENUM (
    'primary',
    'co_applicant',
    'guarantor'
);

--
-- Name: plan_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_tier AS ENUM (
    'starter',
    'pro',
    'enterprise'
);

--
-- Name: product_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_type AS ENUM (
    'sme_loan',
    'personal_loan',
    'mortgage',
    'fixed_deposit',
    'savings_account',
    'credit_card',
    'business_account',
    'investment_account',
    'leasing',
    'overdraft',
    'business_loan',
    'equities',
    'unit_trust',
    'savings_plan',
    'government_bonds',
    'offshore_investment',
    'mixed_portfolio'
);

--
-- Name: relationship_doc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.relationship_doc_status AS ENUM (
    'pending_ocr',
    'verified',
    'rejected'
);

--
-- Name: relationship_match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.relationship_match_status AS ENUM (
    'pending',
    'both_matched',
    'partial_match',
    'no_match'
);

--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'open',
    'closed',
    'accepted',
    'expired',
    'rejected',
    'awaiting_consent',
    'deal_declined'
);

--
-- Name: request_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status_type AS ENUM (
    'open',
    'bidding',
    'accepted',
    'cancelled',
    'expired'
);

--
-- Name: title_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.title_type AS ENUM (
    'mr',
    'mrs',
    'ms',
    'miss',
    'dr',
    'prof',
    'other'
);

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'client',
    'bank',
    'admin'
);

--
-- Name: user_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_type_enum AS ENUM (
    'individual',
    'business'
);

--
-- Name: vault_doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vault_doc_type AS ENUM (
    'nic',
    'passport',
    'birth_certificate',
    'driving_licence',
    'title_deed',
    'valuation_report',
    'land_registry_extract',
    'payslip',
    'employment_letter',
    'tax_return',
    'bank_statement',
    'loan_statement',
    'credit_card_statement',
    'brn_certificate',
    'audited_accounts',
    'insurance_policy',
    'other',
    'marriage_certificate'
);

--
-- Name: vault_extract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vault_extract_status AS ENUM (
    'pending',
    'processing',
    'extracted',
    'attested',
    'failed',
    'manual_review'
);

--
-- Name: webhook_event_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.webhook_event_status_type AS ENUM (
    'pending',
    'delivered',
    'failed',
    'retrying'
);

--
-- Name: _offer_actor(text); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._offer_actor(p_actor text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $_$
BEGIN
  IF coalesce(btrim(p_actor), '') !~ '^[^@\s]+@[^@\s]+$' THEN
    RAISE EXCEPTION 'actor must be a staff email' USING ERRCODE = '22023';
  END IF;
  RETURN lower(btrim(p_actor));
END $_$;

--
-- Name: _sync_api_channel(jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_api_channel(p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
END $_$;

--
-- Name: _sync_app_release(jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_app_release(p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
END $_$;

--
-- Name: _sync_client_access(jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_client_access(p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_client  uuid := (p->>'client_id')::uuid;
  v_suspend boolean := (p->>'suspended')::boolean;
  v_closed  integer := 0;
BEGIN
  IF v_suspend IS NULL OR coalesce(length(p->>'reason'), 0) < 10 THEN
    RAISE EXCEPTION 'invalid client access event' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client) THEN
    RAISE EXCEPTION 'unknown client' USING ERRCODE = 'P0002';
  END IF;

  UPDATE auth.users SET banned_until = CASE WHEN v_suspend THEN 'infinity'::timestamptz ELSE NULL END,
                        updated_at = now()
   WHERE id = v_client;

  IF v_suspend THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = v_client::text;
    DELETE FROM auth.sessions WHERE user_id = v_client;
    UPDATE public.requests SET status = 'closed'
     WHERE client_id = v_client AND status::text = 'open';
    GET DIAGNOSTICS v_closed = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_events
    (client_id, actor_id, actor_type, action_category, event_label,
     resource_type, resource_id, state_after, outcome, outcome_note)
  VALUES
    (v_client, coalesce((p->>'approved_by_id')::uuid, v_client), 'ficium_admin',
     CASE WHEN v_suspend THEN 'account.suspend' ELSE 'account.reinstate' END,
     CASE WHEN v_suspend THEN 'Account suspended by Ficium' ELSE 'Account reinstated by Ficium' END,
     'client', v_client,
     jsonb_build_object('requested_by', p->>'requested_by', 'approved_by', p->>'approved_by',
                        'open_requests_closed', v_closed),
     'success', left(p->>'reason', 500));
END $$;

--
-- Name: _sync_config(jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_config(p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE admin.platform_config SET value = p->'value', updated_at = now() WHERE key = p->>'key';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown platform setting %', p->>'key' USING ERRCODE = '22023'; END IF;
END $$;

--
-- Name: _sync_kyc(uuid, jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_kyc(p_event_id uuid, p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

--
-- Name: _sync_kyc_decision(jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_kyc_decision(p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE sub public.kyc_submissions; d text := p->>'decision'; latest boolean;
BEGIN
  IF d NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'invalid KYC decision %', d USING ERRCODE = '22023';
  END IF;
  SELECT * INTO sub FROM public.kyc_submissions WHERE id = (p->>'submission_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown KYC submission' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.kyc_submissions
     SET status = d, reviewed_at = coalesce((p->>'decided_at')::timestamptz, now()),
         review_note = left(format('%s (%s)', p->>'reason', p->>'reviewer'), 2000)
   WHERE id = sub.id;

  latest := NOT EXISTS (SELECT 1 FROM public.kyc_submissions n
                         WHERE n.client_id = sub.client_id AND n.submitted_at > sub.submitted_at);
  IF latest THEN
    UPDATE public.clients SET kyc_status = d::public.kyc_status
     WHERE id = sub.client_id AND kyc_status IN ('pending_review', 'under_review');
    IF FOUND THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
      VALUES (sub.client_id, 'kyc_decision',
              CASE d WHEN 'verified' THEN 'Identity verified' ELSE 'Identity check unsuccessful' END,
              CASE d WHEN 'verified' THEN 'Your identity has been verified. You can now send requests to banks.'
                     ELSE 'We could not verify your identity from the documents provided. Please submit them again.' END,
              CASE d WHEN 'verified' THEN '/requests/new' ELSE '/onboarding/kyc' END,
              jsonb_build_object('submission_id', sub.id));
    END IF;
  END IF;
END $$;

--
-- Name: _sync_log_worm(); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_log_worm() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN RAISE EXCEPTION 'admin.sync_log is append-only' USING ERRCODE = '42501'; END $$;

--
-- Name: _sync_offer_upsert(jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin._sync_offer_upsert(p jsonb) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

--
-- Name: guard_kyc_settings(); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin.guard_kyc_settings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE actor text := coalesce(current_setting('ficium.kyc_change_actor', true), '');
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'kyc_settings rows cannot be inserted or deleted' USING ERRCODE = '42501';
  END IF;
  IF actor = '' THEN
    RAISE EXCEPTION 'kyc_settings can only be changed through admin.set_kyc_check (audited)' USING ERRCODE = '42501';
  END IF;
  INSERT INTO admin.kyc_settings_change (check_key, old_value, new_value, actor, reason)
  SELECT k, (to_jsonb(OLD) ->> k)::boolean, (to_jsonb(NEW) ->> k)::boolean, actor, current_setting('ficium.kyc_change_reason', true)
    FROM jsonb_object_keys(to_jsonb(NEW)) k
   WHERE k NOT IN ('id','updated_at') AND (to_jsonb(OLD) -> k) IS DISTINCT FROM (to_jsonb(NEW) -> k);
  RETURN NEW;
END $$;

--
-- Name: migration_applied(text); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin.migration_applied(p_version text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  INSERT INTO admin.schema_migration (version) VALUES (p_version) ON CONFLICT (version) DO NOTHING
$$;

--
-- Name: sync_apply(uuid, text, text, text, bigint, jsonb); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin.sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
END $$;

--
-- Name: trigger_outbox_dispatch(); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin.trigger_outbox_dispatch() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE v_url text; v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'admin_outbox_dispatch_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'admin_outbox_cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RETURN; END IF;
  PERFORM net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000);
END $$;

--
-- Name: write_admin_audit(text, text, uuid, text, uuid, jsonb, jsonb, text, text, inet); Type: FUNCTION; Schema: admin; Owner: -
--

CREATE FUNCTION admin.write_admin_audit(p_action_category text, p_event_label text, p_institution_id uuid DEFAULT NULL::uuid, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_state_before jsonb DEFAULT NULL::jsonb, p_state_after jsonb DEFAULT NULL::jsonb, p_outcome text DEFAULT 'success'::text, p_outcome_note text DEFAULT NULL::text, p_actor_ip inet DEFAULT NULL::inet) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO admin.audit_events (
    admin_id, institution_id, actor_id, actor_type, actor_ip,
    action_category, event_label, resource_type, resource_id,
    state_before, state_after, outcome, outcome_note
  ) VALUES (
    auth.uid(), p_institution_id, auth.uid(), 'ficium_admin', p_actor_ip,
    p_action_category, p_event_label, p_resource_type, p_resource_id,
    p_state_before, p_state_after, p_outcome, p_outcome_note
  ) RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END; $$;

--
-- Name: consume_message(uuid, integer); Type: FUNCTION; Schema: fico; Owner: -
--

CREATE FUNCTION fico.consume_message(p_user_id uuid, p_free_quota integer DEFAULT 3) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'fico', 'pg_temp'
    AS $$
declare
  v_period date := date_trunc('month', now())::date;
  v_used   integer;
begin
  insert into fico.message_meter (user_id, period, messages_used)
  values (p_user_id, v_period, 1)
  on conflict (user_id, period)
  do update set messages_used = fico.message_meter.messages_used + 1
    where fico.message_meter.messages_used < p_free_quota
  returning messages_used into v_used;

  if v_used is null then
    return -1;
  end if;

  return p_free_quota - v_used;
end;
$$;

--
-- Name: messages_remaining(uuid, integer); Type: FUNCTION; Schema: fico; Owner: -
--

CREATE FUNCTION fico.messages_remaining(p_user_id uuid, p_free_quota integer DEFAULT 3) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'fico', 'pg_temp'
    AS $$
  select p_free_quota - coalesce(
    (select messages_used from fico.message_meter
      where user_id = p_user_id
        and period = date_trunc('month', now())::date),
    0
  );
$$;

--
-- Name: convert_amount(numeric, text, text); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.convert_amount(p_amount numeric, p_from_ccy text, p_to_ccy text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
declare
  v_from_mur numeric; -- 1 p_from_ccy = v_from_mur MUR
  v_to_mur   numeric; -- 1 p_to_ccy   = v_to_mur MUR
begin
  if p_from_ccy = p_to_ccy then
    return p_amount;
  end if;

  -- MUR itself has an implicit rate of 1
  if p_from_ccy = 'MUR' then
    v_from_mur := 1;
  else
    select avg((buy_rate + sell_rate) / 2.0) into v_from_mur
    from public.market_fx_rates
    where currency_pair = p_from_ccy || '/MUR'
      and fetched_at = (select max(fetched_at) from public.market_fx_rates where currency_pair = p_from_ccy || '/MUR');
  end if;

  if p_to_ccy = 'MUR' then
    v_to_mur := 1;
  else
    select avg((buy_rate + sell_rate) / 2.0) into v_to_mur
    from public.market_fx_rates
    where currency_pair = p_to_ccy || '/MUR'
      and fetched_at = (select max(fetched_at) from public.market_fx_rates where currency_pair = p_to_ccy || '/MUR');
  end if;

  -- pivot: amount -> MUR -> target currency
  if v_from_mur is not null and v_to_mur is not null and v_to_mur != 0 then
    return p_amount * v_from_mur / v_to_mur;
  end if;

  -- no rate available for one leg: fail safe, return unconverted rather than silently zeroing net worth
  return p_amount;
end;
$$;

--
-- Name: get_accounts_summary(text); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_accounts_summary(p_reporting_currency text DEFAULT NULL::text) RETURNS TABLE(id uuid, institution_name text, account_type text, currency text, balance numeric, balance_reporting numeric, notes text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
declare
  v_ccy text;
begin
  if p_reporting_currency is not null then
    v_ccy := p_reporting_currency;
  else
    select coalesce(s.currency, 'MUR') into v_ccy
    from public.client_financial_snapshot s where s.client_id = auth.uid();
    v_ccy := coalesce(v_ccy, 'MUR');
  end if;

  return query
    select a.id, a.institution_name, a.account_type, a.currency,
           a.balance, finance.convert_amount(a.balance, a.currency, v_ccy),
           a.notes, a.created_at, a.updated_at
    from finance.accounts a
    where a.user_id = auth.uid()
    order by a.account_type, a.institution_name;
end;
$$;

--
-- Name: get_holdings_summary(text); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_holdings_summary(p_reporting_currency text DEFAULT NULL::text) RETURNS TABLE(id uuid, asset_type text, symbol text, exchange text, quantity numeric, currency text, cost_basis numeric, price numeric, price_currency text, price_fetched_at timestamp with time zone, market_value_native numeric, market_value_reporting numeric, cost_basis_reporting numeric, unrealized_pl_reporting numeric, unrealized_pl_pct numeric, notes text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
declare
  v_ccy text;
begin
  if p_reporting_currency is not null then
    v_ccy := p_reporting_currency;
  else
    select coalesce(s.currency, 'MUR') into v_ccy
    from public.client_financial_snapshot s where s.client_id = auth.uid();
    v_ccy := coalesce(v_ccy, 'MUR');
  end if;

  return query
    select
      h.id, h.asset_type, h.symbol, h.exchange, h.quantity, h.currency, h.cost_basis,
      p.price, p.currency as price_currency, p.fetched_at,
      h.quantity * coalesce(p.price, 0) as market_value_native,
      finance.convert_amount(h.quantity * coalesce(p.price, 0), coalesce(p.currency, h.currency), v_ccy) as market_value_reporting,
      case when h.cost_basis is not null
        then finance.convert_amount(h.cost_basis, h.currency, v_ccy)
        else null
      end as cost_basis_reporting,
      case when h.cost_basis is not null
        then finance.convert_amount(h.quantity * coalesce(p.price, 0), coalesce(p.currency, h.currency), v_ccy)
             - finance.convert_amount(h.cost_basis, h.currency, v_ccy)
        else null
      end as unrealized_pl_reporting,
      case when h.cost_basis is not null and h.cost_basis != 0
        then round((
          (finance.convert_amount(h.quantity * coalesce(p.price, 0), coalesce(p.currency, h.currency), v_ccy)
           - finance.convert_amount(h.cost_basis, h.currency, v_ccy))
          / finance.convert_amount(h.cost_basis, h.currency, v_ccy) * 100
        ), 2)
        else null
      end as unrealized_pl_pct,
      h.notes
    from finance.holdings h
    left join finance.holding_prices p
      on p.symbol = h.symbol and p.exchange = coalesce(h.exchange, '')
    where h.user_id = auth.uid()
    order by h.asset_type, h.symbol;
end;
$$;

--
-- Name: recompute_snapshot(uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.recompute_snapshot(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'finance', 'pg_temp'
    AS $$
DECLARE
  s public.client_financial_snapshot%ROWTYPE;
BEGIN
  INSERT INTO public.client_financial_snapshot (client_id)
  VALUES (p_user_id)
  ON CONFLICT (client_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO s;

  INSERT INTO finance.net_worth_history
    (user_id, snapshot_date, cash_savings, fixed_deposits, investments_value,
     total_assets, total_liabilities, net_worth, currency)
  VALUES
    (p_user_id, current_date, s.cash_savings, s.fixed_deposits, s.investments_value,
     s.total_assets, s.total_liabilities, s.net_worth, s.currency)
  ON CONFLICT (user_id, snapshot_date) DO UPDATE
    SET cash_savings      = excluded.cash_savings,
        fixed_deposits    = excluded.fixed_deposits,
        investments_value = excluded.investments_value,
        total_assets      = excluded.total_assets,
        total_liabilities = excluded.total_liabilities,
        net_worth         = excluded.net_worth,
        currency          = excluded.currency,
        captured_at       = now();
END $$;

--
-- Name: trg_recompute_on_account_change(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.trg_recompute_on_account_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'finance'
    AS $$
begin
  perform finance.recompute_snapshot(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

--
-- Name: trg_recompute_on_price_change(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.trg_recompute_on_price_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'finance'
    AS $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct user_id from finance.holdings
    where symbol = new.symbol and coalesce(exchange, '') = new.exchange
  loop
    perform finance.recompute_snapshot(v_user_id);
  end loop;
  return new;
end;
$$;

--
-- Name: _pa_num(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration._pa_num(j jsonb) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN CASE jsonb_typeof(j)
    WHEN 'number'  THEN (j #>> '{}')::double precision
    WHEN 'string'  THEN integration._py_float(j #>> '{}')
    WHEN 'boolean' THEN CASE WHEN j = 'true'::jsonb THEN 1::double precision ELSE 0::double precision END
    ELSE NULL END;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

--
-- Name: _py_float(text); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration._py_float(p text) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $_$
BEGIN
  IF p IS NOT NULL AND btrim(p) ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$' THEN
    RETURN btrim(p)::double precision;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $_$;

--
-- Name: _py_truthy(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration._py_truthy(j jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT j IS NOT NULL AND j <> 'null'::jsonb AND j <> '""'::jsonb AND j <> '0'::jsonb AND j <> 'false'::jsonb
         AND j <> '[]'::jsonb AND j <> '{}'::jsonb
$$;

--
-- Name: _strip_top_nulls(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration._strip_top_nulls(j jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) FROM jsonb_each(j) e WHERE e.value <> 'null'::jsonb
$$;

--
-- Name: anon_borrower_id(uuid); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.anon_borrower_id(p_client uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'extensions'
    AS $$
DECLARE k text; h bytea;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'borrower_anon_key';
  IF k IS NULL THEN RAISE EXCEPTION 'borrower_anon_key missing'; END IF;
  h := extensions.hmac(p_client::text, k, 'sha256');
  RETURN encode(substring(h FROM 1 FOR 16), 'hex')::uuid;
END $$;

--
-- Name: apply_bid_event(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_bid_event(p_env jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
DECLARE
  d jsonb := p_env -> 'data';
  t text := p_env ->> 'type';
  outcome text;
  prev_status text;
  v_client uuid;
  v_bank text;
BEGIN
  IF t NOT IN ('bid.placed','bid.updated','bid.withdrawn') OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_bid_event: unexpected % from %', t, p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', t, p_env ->> 'source', p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN
    RETURN outcome;
  END IF;
  IF t IN ('bid.placed','bid.updated') THEN
    SELECT s.status INTO prev_status FROM integration.bid_shadow s WHERE s.bid_id = (d ->> 'bid_id')::uuid;
    INSERT INTO integration.bid_shadow AS s (bid_id, request_id, status, payload, last_event_id, last_sequence)
    VALUES ((d ->> 'bid_id')::uuid, (d ->> 'request_id')::uuid, d ->> 'status', d, p_env ->> 'id', (p_env ->> 'sequence')::bigint)
    ON CONFLICT (bid_id) DO UPDATE SET request_id = EXCLUDED.request_id, status = EXCLUDED.status, payload = EXCLUDED.payload,
      last_event_id = EXCLUDED.last_event_id, last_sequence = EXCLUDED.last_sequence, updated_at = now();

    IF t = 'bid.placed' AND (prev_status IS NULL OR prev_status IN ('withdrawn', 'rejected', 'expired')) THEN
      SELECT q.client_id INTO v_client FROM public.requests q WHERE q.id = (d ->> 'request_id')::uuid;
      IF v_client IS NOT NULL THEN
        v_bank := nullif(btrim(d ->> 'institution_name'), '');
        INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
        VALUES (v_client, 'bid_received',
                'New offer from ' || coalesce(v_bank, 'a provider'),
                coalesce(v_bank, 'A provider') || ' made an offer on your request. Compare offers before the window closes.',
                '/requests/' || (d ->> 'request_id'),
                jsonb_build_object('request_id', d ->> 'request_id', 'bid_id', d ->> 'bid_id'));
      END IF;
    END IF;
  ELSE
    UPDATE integration.bid_shadow SET status = d ->> 'reason', last_event_id = p_env ->> 'id',
           last_sequence = (p_env ->> 'sequence')::bigint, updated_at = now()
     WHERE bid_id = (d ->> 'bid_id')::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'bid.withdrawn for a bid never placed: %', d ->> 'bid_id';
    END IF;
  END IF;
  RETURN outcome;
END $$;

--
-- Name: apply_chat_message_event(jsonb, text); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_chat_message_event(p_env jsonb, p_refuse text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; v_reason text := p_refuse;
BEGIN
  IF p_env ->> 'type' <> 'chat.message' OR p_env ->> 'source' <> 'institution'
     OR d ->> 'sender_side' <> 'institution' THEN
    RAISE EXCEPTION 'apply_chat_message_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  IF v_reason IS NULL THEN
    PERFORM 1 FROM public.requests WHERE id = (d ->> 'request_id')::uuid;
    IF NOT FOUND THEN v_reason := 'unknown request'; END IF;
  END IF;
  IF v_reason IS NULL THEN
    BEGIN
      INSERT INTO public.request_messages (id, request_id, institution_id, sender_type, sender_id, body, kind,
                                           template_code, params, created_at)
      VALUES ((d ->> 'message_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'institution_id')::uuid, 'institution',
              NULL, d ->> 'body', CASE WHEN d ->> 'template_code' IS NULL THEN 'free' ELSE 'structured' END,
              d ->> 'template_code', coalesce(d -> 'params', '{}'::jsonb), (d ->> 'sent_at')::timestamptz)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN raise_exception OR check_violation THEN
      v_reason := left(SQLERRM, 300);
    END;
  END IF;
  IF v_reason IS NOT NULL THEN
    INSERT INTO integration.chat_refused (event_id, message_id, request_id, institution_id, reason)
    VALUES (p_env ->> 'id', (d ->> 'message_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'institution_id')::uuid, v_reason)
    ON CONFLICT (event_id) DO NOTHING;
    RETURN 'refused';
  END IF;
  RETURN outcome;
END $$;

--
-- Name: apply_deal_documents_event(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_deal_documents_event(p_env jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE
  d jsonb := p_env -> 'data';
  outcome text;
  r record;
BEGIN
  IF p_env ->> 'type' <> 'deal.documents_updated' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_deal_documents_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN
    RETURN outcome;
  END IF;
  SELECT q.client_id, q.accepted_bid_id INTO r FROM public.requests q WHERE q.id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deal.documents_updated for an unknown request: %', d ->> 'request_id';
  END IF;
  IF r.accepted_bid_id IS DISTINCT FROM (d ->> 'bid_id')::uuid THEN
    RAISE EXCEPTION 'deal.documents_updated for a bid the borrower did not accept: %', d ->> 'bid_id';
  END IF;
  INSERT INTO integration.deal_documents AS s
      (pipeline_id, request_id, bid_id, client_id, documents, last_event_id, last_sequence)
  VALUES ((d ->> 'pipeline_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'bid_id')::uuid, r.client_id,
          d -> 'documents', p_env ->> 'id', (p_env ->> 'sequence')::bigint)
  ON CONFLICT (pipeline_id) DO UPDATE SET documents = EXCLUDED.documents, last_event_id = EXCLUDED.last_event_id,
      last_sequence = EXCLUDED.last_sequence, updated_at = now();
  RETURN outcome;
END $$;

--
-- Name: apply_deal_progress_event(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_deal_progress_event(p_env jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; r record; v_bank text;
BEGIN
  IF p_env ->> 'type' <> 'deal.progress_updated' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_deal_progress_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT q.client_id, q.accepted_bid_id, q.status INTO r FROM public.requests q
   WHERE q.id = (d ->> 'request_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deal.progress_updated for an unknown request: %', d ->> 'request_id'; END IF;
  IF r.accepted_bid_id IS DISTINCT FROM (d ->> 'bid_id')::uuid THEN
    RAISE EXCEPTION 'deal.progress_updated for a bid the borrower did not accept: %', d ->> 'bid_id';
  END IF;
  INSERT INTO integration.deal_progress (pipeline_id, request_id, bid_id, client_id, payload, last_event_id, last_sequence)
  VALUES ((d ->> 'pipeline_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'bid_id')::uuid, r.client_id, d,
          p_env ->> 'id', (p_env ->> 'sequence')::bigint)
  ON CONFLICT (pipeline_id) DO UPDATE SET payload = EXCLUDED.payload, last_event_id = EXCLUDED.last_event_id,
      last_sequence = EXCLUDED.last_sequence, updated_at = now();

  IF d ->> 'status' = 'declined' AND r.status = 'accepted' THEN
    SELECT nullif(btrim(b.payload ->> 'institution_name'), '') INTO v_bank
      FROM integration.bid_shadow b WHERE b.bid_id = (d ->> 'bid_id')::uuid;
    UPDATE public.requests SET status = 'deal_declined', updated_at = now() WHERE id = (d ->> 'request_id')::uuid;
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (r.client_id, 'request_rejected',
            'Declined by ' || coalesce(v_bank, 'the bank'),
            coalesce(v_bank, 'The bank') || ' declined this deal. You can relist the same request to get new offers.',
            '/requests/' || (d ->> 'request_id'),
            jsonb_build_object('request_id', d ->> 'request_id', 'bid_id', d ->> 'bid_id', 'reason', 'deal_declined'));
  ELSIF d ->> 'status' IN ('active', 'completed') AND r.status = 'deal_declined'
        AND NOT EXISTS (SELECT 1 FROM public.requests c WHERE c.relisted_from = (d ->> 'request_id')::uuid) THEN
    UPDATE public.requests SET status = 'accepted', updated_at = now() WHERE id = (d ->> 'request_id')::uuid;
  END IF;
  RETURN outcome;
END $$;

--
-- Name: apply_market_intelligence_event(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_market_intelligence_event(p_env jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
DECLARE outcome text;
BEGIN
  IF p_env ->> 'type' <> 'market.intelligence' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_market_intelligence_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  INSERT INTO integration.market_snapshot (id, as_of, payload, last_event_id)
  VALUES (1, (p_env -> 'data' ->> 'as_of')::date, p_env -> 'data', p_env ->> 'id')
  ON CONFLICT (id) DO UPDATE SET as_of = EXCLUDED.as_of, payload = EXCLUDED.payload,
      last_event_id = EXCLUDED.last_event_id, updated_at = now();
  RETURN outcome;
END $$;

--
-- Name: apply_request_declined_event(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_request_declined_event(p_env jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; v_client uuid;
BEGIN
  IF p_env ->> 'type' <> 'request.declined' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_request_declined_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT client_id INTO v_client FROM public.requests WHERE id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'request.declined for an unknown request: %', d ->> 'request_id'; END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (v_client, 'request_declined_by_provider', 'A provider declined your request',
          coalesce(nullif(btrim(d ->> 'reason'), ''), 'One provider won''t make an offer on this request. It stays open to every other provider.'),
          '/requests/' || (d ->> 'request_id'),
          jsonb_build_object('request_id', d ->> 'request_id', 'declined_at', d ->> 'declined_at'));
  RETURN outcome;
END $$;

--
-- Name: apply_request_window_closed_event(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.apply_request_window_closed_event(p_env jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; v_client uuid; n int := (d ->> 'offer_count')::int;
BEGIN
  IF p_env ->> 'type' <> 'request.window_closed' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_request_window_closed_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT client_id INTO v_client FROM public.requests WHERE id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'request.window_closed for an unknown request: %', d ->> 'request_id'; END IF;
  IF d ->> 'outcome' = 'no_offers' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (v_client, 'bid_expired', 'Your request closed with no offers',
            'No lenders placed a bid before your window closed. You can post a new request at any time.',
            '/requests/' || (d ->> 'request_id'), jsonb_build_object('request_id', d ->> 'request_id'));
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (v_client, 'bidding_closed', 'Bidding closed: ' || n || CASE WHEN n = 1 THEN ' offer' ELSE ' offers' END || ' to compare',
            'Compare the offers and accept the one that suits you.',
            '/requests/' || (d ->> 'request_id'), jsonb_build_object('request_id', d ->> 'request_id', 'offer_count', n));
  END IF;
  RETURN outcome;
END $$;

--
-- Name: backfill_request_events(); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.backfill_request_events() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id, status::text AS status FROM public.requests ORDER BY created_at LOOP
    IF NOT EXISTS (SELECT 1 FROM integration.outbox WHERE aggregate_id = r.id::text AND type = 'request.published') THEN
      PERFORM integration.publish_request(r.id);
      IF r.status <> 'open' THEN PERFORM integration.publish_status(r.id, r.status); END IF;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

--
-- Name: build_request_published(uuid); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.build_request_published(p_request_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
DECLARE row_ jsonb := integration.request_row(p_request_id);
BEGIN
  IF row_ IS NULL THEN RETURN NULL; END IF;
  RETURN integration._strip_top_nulls(jsonb_build_object(
    'request_id', row_ -> 'id',
    'anon_borrower_id', to_jsonb(integration.anon_borrower_id((row_ ->> 'client_id')::uuid)),
    'product_type', row_ -> 'product_type', 'amount', row_ -> 'amount', 'currency', 'MUR',
    'term_months', row_ -> 'preferred_term_months', 'max_rate', row_ -> 'max_rate',
    'decision_deadline', row_ -> 'decision_deadline', 'allocation_mode', row_ -> 'allocation_mode',
    'allocations', coalesce(row_ -> 'allocations', '[]'::jsonb),
    'phase1', integration.phase1_from_row(row_), 'created_at', row_ -> 'created_at'));
END $$;

--
-- Name: claim_batch(integer, integer); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.claim_batch(p_limit integer DEFAULT 20, p_lease_seconds integer DEFAULT 60) RETURNS TABLE(id text, envelope jsonb, attempts integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
BEGIN
  RETURN QUERY
  UPDATE integration.outbox o
     SET status = 'sending',
         lease_until = now() + make_interval(secs => p_lease_seconds),
         attempts = o.attempts + 1
   WHERE o.id IN (
     SELECT x.id FROM integration.outbox x
      WHERE ((x.status = 'pending' AND x.next_attempt_at <= now())
          OR (x.status = 'sending' AND x.lease_until < now()))
        AND NOT EXISTS (SELECT 1 FROM integration.outbox e
                         WHERE e.aggregate_id = x.aggregate_id AND e.sequence < x.sequence AND e.status <> 'delivered')
      ORDER BY x.created_at
      LIMIT greatest(1, least(p_limit, 100))
      FOR UPDATE SKIP LOCKED)
  RETURNING o.id, o.envelope, o.attempts;
END $$;

--
-- Name: complete_acceptance(text, text, uuid); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE r integration.identity_release%ROWTYPE; n int;
BEGIN
  UPDATE integration.identity_release SET outcome = p_outcome, institution_id = p_institution, completed_at = now()
   WHERE consent_ref = p_consent_ref AND outcome = 'prepared'
  RETURNING * INTO r;
  IF NOT FOUND OR p_outcome <> 'accepted' THEN
    RETURN;
  END IF;
  IF p_institution IS NULL THEN
    RAISE EXCEPTION 'accepted without an institution (consent %)', p_consent_ref USING ERRCODE = 'P0001';
  END IF;

  -- The deal progress and document receivers accept events only for requests.accepted_bid_id.
  UPDATE public.requests SET status = 'accepted', accepted_bid_id = r.bid_id, updated_at = now()
   WHERE id = r.request_id AND client_id = r.client_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'request % not updated on acceptance', r.request_id USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.bid_acceptances (bid_id, request_id, client_id, institution_id, accepted_at)
  VALUES (r.bid_id, r.request_id, r.client_id, p_institution, now())
  ON CONFLICT (request_id) DO NOTHING;
END $$;

--
-- Name: enqueue(text, text, jsonb, text); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.enqueue(p_type text, p_aggregate_id text, p_data jsonb, p_source text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
DECLARE
  v_seq bigint;
  v_id  text := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_env jsonb;
BEGIN
  IF p_source NOT IN ('borrower','institution') THEN
    RAISE EXCEPTION 'integration.enqueue: bad source %', p_source;
  END IF;
  INSERT INTO integration.aggregate_sequence AS s (aggregate_id, last_sequence)
  VALUES (p_aggregate_id, 1)
  ON CONFLICT (aggregate_id) DO UPDATE SET last_sequence = s.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_env := jsonb_build_object(
    'id', v_id, 'type', p_type, 'version', 1, 'source', p_source,
    'occurred_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'aggregate_id', p_aggregate_id, 'sequence', v_seq, 'data', coalesce(p_data, '{}'::jsonb));

  INSERT INTO integration.outbox (id, type, aggregate_id, sequence, envelope)
  VALUES (v_id, p_type, p_aggregate_id, v_seq, v_env);
  RETURN v_env;
END $$;

--
-- Name: mark_delivered(text); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.mark_delivered(p_id text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  UPDATE integration.outbox
     SET status = 'delivered', delivered_at = now(), lease_until = NULL, last_error = NULL
   WHERE id = p_id;
$$;

--
-- Name: mark_failed(text, text); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.mark_failed(p_id text, p_error text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
DECLARE
  v_attempts integer; v_created timestamptz; v_delay interval; v_status text;
BEGIN
  SELECT o.attempts, o.created_at INTO v_attempts, v_created FROM integration.outbox o WHERE o.id = p_id;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  v_delay := CASE v_attempts WHEN 1 THEN interval '30 seconds' WHEN 2 THEN interval '2 minutes'
                             WHEN 3 THEN interval '10 minutes' ELSE interval '1 hour' END;
  v_delay := v_delay * (1 + random() * 0.1);
  v_status := CASE WHEN now() + v_delay > v_created + interval '24 hours' THEN 'dead' ELSE 'pending' END;
  UPDATE integration.outbox
     SET status = v_status, next_attempt_at = now() + v_delay, lease_until = NULL,
         last_error = left(p_error, 1000)
   WHERE id = p_id;
  RETURN v_status;
END $$;

--
-- Name: phase1_from_row(jsonb); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.phase1_from_row(p jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog', 'integration'
    AS $_$
DECLARE
  rawpt text := p ->> 'product_type';
  pt text := lower(coalesce(p ->> 'product_type', ''));
  amount double precision := ((p ->> 'amount')::numeric)::double precision;
  term int := nullif(p ->> 'preferred_term_months', '')::int;
  parsed jsonb := '{}'::jsonb;
  income double precision; networth double precision; px double precision; existing double precision;
  col_type text; col_sub text; prop text; asset_val double precision; ltv double precision;
  dsr_cur double precision; dsr_post double precision; lb numeric; loan_balance double precision;
  band text; tier text; rs int; age int; yrs numeric; ph jsonb; pa jsonb; inv jsonb := '{}'::jsonb;
  verified boolean := coalesce((p ->> 'kyc_status') = 'verified', false);
BEGIN
  IF coalesce(p ->> 'purpose', '') <> '' THEN
    SELECT coalesce(jsonb_object_agg(z.k, z.v), '{}'::jsonb) INTO parsed FROM (
      SELECT DISTINCT ON (s.k) s.k, s.v FROM (
        SELECT t.ord,
               lower(replace(regexp_replace(split_part(t.sp, ':', 1), '^\s+|\s+$', '', 'g'), ' ', '_')) AS k,
               regexp_replace(substr(t.sp, strpos(t.sp, ':') + 1), '^\s+|\s+$', '', 'g') AS v
          FROM (SELECT regexp_replace(x.part, '^\s+|\s+$', '', 'g') AS sp, x.ord
                  FROM regexp_split_to_table(p ->> 'purpose', '\|') WITH ORDINALITY AS x(part, ord)) t
         WHERE strpos(t.sp, ':') > 0
      ) s ORDER BY s.k, s.ord DESC) z;
  END IF;

  income    := coalesce(nullif((p ->> 'monthly_income')::numeric, 0), nullif((p ->> 'snap_income')::numeric, 0))::double precision;
  networth  := coalesce(nullif((p ->> 'snap_net_worth')::numeric, 0), nullif((p ->> 'total_net_worth')::numeric, 0))::double precision;
  px        := nullif((p ->> 'monthly_loan_payments')::numeric, 0)::double precision;

  IF pt IN ('mortgage', 'home_loan') THEN
    prop := lower(coalesce(parsed ->> 'property_type', ''));
    col_sub := parsed ->> 'property_type';
    col_type := CASE WHEN position('land' IN prop) > 0 THEN 'land' ELSE 'residential_property' END;
  ELSIF pt IN ('auto', 'vehicle', 'car_loan') THEN
    col_type := 'vehicle';
    col_sub := coalesce(nullif(parsed ->> 'vehicle_make', ''), parsed ->> 'vehicle_type');
  ELSIF pt IN ('business', 'business_loan') THEN
    col_type := 'business_asset'; col_sub := NULL;
  ELSE
    col_type := 'none'; col_sub := NULL;
  END IF;

  IF col_type <> 'none' THEN
    asset_val := integration._py_float(coalesce(nullif(parsed ->> 'property_value', ''), nullif(parsed ->> 'vehicle_value', ''), '0'));
    IF asset_val IS NOT NULL AND asset_val > 0 THEN
      ltv := integration.py_round1((amount / asset_val) * 100);
    END IF;
  END IF;

  IF income IS NOT NULL THEN
    existing := px;
    IF existing IS NULL THEN
      existing := integration._py_float(coalesce(nullif(parsed ->> 'monthly_debt', ''), '0'));
    END IF;
    existing := coalesce(existing, 0);
    dsr_cur := integration.py_round1((existing / income) * 100);
    IF term IS NOT NULL AND term <> 0 THEN
      dsr_post := integration.py_round1(((existing + amount / term::double precision) / income) * 100);
    END IF;
  END IF;

  lb := coalesce((p ->> 'mortgage_balance')::numeric, 0) + coalesce((p ->> 'personal_loan_balance')::numeric, 0)
      + coalesce((p ->> 'credit_card_balance')::numeric, 0) + coalesce((p ->> 'vehicle_loan_balance')::numeric, 0);
  loan_balance := nullif(lb, 0)::double precision;

  band := CASE WHEN networth IS NULL THEN NULL WHEN networth < 0 THEN 'negative' WHEN networth < 500000 THEN '< 500k'
               WHEN networth < 1000000 THEN '500k-1M' WHEN networth < 5000000 THEN '1M-5M' ELSE '> 5M' END;
  rs := nullif(p ->> 'risk_score', '')::int;
  tier := CASE WHEN rs IS NULL THEN NULL WHEN rs < 20 THEN 'A' WHEN rs < 40 THEN 'B' WHEN rs < 60 THEN 'C' ELSE 'D' END;
  age := nullif(p ->> 'client_age', '')::int;  IF age = 0 THEN age := NULL; END IF;
  yrs := nullif((p ->> 'years_of_employment')::numeric, 0);

  ph := jsonb_build_object(
    'loan_purpose', parsed -> 'purpose', 'collateral_type', to_jsonb(col_type), 'collateral_sub', to_jsonb(col_sub),
    'ltv_pct', to_jsonb(ltv), 'kyc_verified', to_jsonb(verified),
    'employment_status', p -> 'employment_status', 'employment_type', p -> 'employment_type',
    'years_employed', to_jsonb(yrs::double precision), 'gross_monthly_income', to_jsonb(income),
    'income_verified', to_jsonb(verified), 'dsr_current_pct', to_jsonb(dsr_cur), 'dsr_post_pct', to_jsonb(dsr_post),
    'net_worth_band', to_jsonb(band), 'has_existing_loans', p -> 'has_existing_loans',
    'existing_monthly_repayment', to_jsonb(px), 'existing_loan_balance', to_jsonb(loan_balance),
    'loan_breakdown', p -> 'loan_breakdown', 'health_score', p -> 'health_score', 'risk_score', p -> 'risk_score',
    'affordability_score', p -> 'affordability_score', 'risk_tier', to_jsonb(tier), 'age', to_jsonb(age));

  pa := p -> 'product_answers';
  IF NOT (rawpt = ANY (ARRAY['sme_loan','personal_loan','mortgage','credit_card','business_loan','leasing','overdraft']))
     AND pa IS NOT NULL AND jsonb_typeof(pa) = 'object' AND pa <> '{}'::jsonb THEN
    inv := integration._strip_top_nulls(jsonb_build_object(
      'risk_appetite', pa -> 'risk_appetite', 'investment_horizon', pa -> 'investment_horizon',
      'liquidity_pref', CASE WHEN integration._py_truthy(pa -> 'liquidity') THEN pa -> 'liquidity'
                             WHEN integration._py_truthy(pa -> 'withdrawal') THEN pa -> 'withdrawal'
                             ELSE pa -> 'flexibility' END,
      'investment_style', pa -> 'investment_style',
      'target_amount', to_jsonb(integration._pa_num(pa -> 'target_amount')),
      'monthly_contribution', to_jsonb(integration._pa_num(pa -> 'monthly_contribution')),
      'investment_objective', pa -> 'objective', 'investment_product_answers', pa));
  END IF;

  RETURN integration._strip_top_nulls(ph || inv);
END $_$;

--
-- Name: prepare_acceptance(uuid, uuid, uuid); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $_$
DECLARE owner uuid; ident jsonb; ref text; fields text[]; prev record;
BEGIN
  SELECT r.client_id INTO owner FROM public.requests r WHERE r.id = p_request;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002'; END IF;
  IF owner IS DISTINCT FROM p_client THEN RAISE EXCEPTION 'not the request owner' USING ERRCODE = '42501'; END IF;

  -- Retry of an unfinished attempt: return exactly what was prepared before (same key, same body).
  SELECT ir.consent_ref, ir.anon_borrower_id, ir.released_identity INTO prev
    FROM integration.identity_release ir
   WHERE ir.client_id = p_client AND ir.request_id = p_request AND ir.bid_id = p_bid AND ir.outcome IN ('prepared','failed')
     AND ir.released_identity IS NOT NULL
   ORDER BY ir.prepared_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE integration.identity_release SET outcome = 'prepared', completed_at = NULL WHERE consent_ref = prev.consent_ref;
    RETURN jsonb_build_object('anon_borrower_id', prev.anon_borrower_id, 'released_identity', prev.released_identity,
                              'consent_ref', prev.consent_ref, 'retry', true);
  END IF;

  SELECT jsonb_strip_nulls(jsonb_build_object(
           'full_name', nullif(btrim(c.full_name), ''), 'email', nullif(btrim(c.email), ''), 'phone', nullif(btrim(c.phone), ''),
           'address', nullif(concat_ws(', ', nullif(btrim(c.address_line_1), ''), nullif(btrim(c.city), ''), nullif(btrim(c.postal_code), '')), ''),
           'date_of_birth', c.date_of_birth, 'document_number', k.document_number))
    INTO ident
    FROM public.clients c
    LEFT JOIN LATERAL (SELECT ks.document_number FROM public.kyc_submissions ks
                        WHERE ks.client_id = c.id AND ks.status = 'approved' ORDER BY ks.submitted_at DESC LIMIT 1) k ON true
   WHERE c.id = p_client;
  IF ident IS NULL OR NOT (ident ? 'full_name') THEN
    RAISE EXCEPTION 'no name on file: identity cannot be released' USING ERRCODE = 'P0001';
  END IF;
  IF ident ? 'email' AND NOT (ident ->> 'email' ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    ident := ident - 'email';
  END IF;
  ref := 'consent_' || replace(gen_random_uuid()::text, '-', '');
  SELECT array_agg(k ORDER BY k) INTO fields FROM jsonb_object_keys(ident) k;
  INSERT INTO integration.identity_release (consent_ref, client_id, request_id, bid_id, fields_released, anon_borrower_id, released_identity)
  VALUES (ref, p_client, p_request, p_bid, fields, integration.anon_borrower_id(p_client), ident);
  RETURN jsonb_build_object('anon_borrower_id', integration.anon_borrower_id(p_client), 'released_identity', ident,
                            'consent_ref', ref, 'retry', false);
END $_$;

--
-- Name: publish_request(uuid); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.publish_request(p_request_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
DECLARE d jsonb; n int;
BEGIN
  d := integration.build_request_published(p_request_id);
  IF d IS NULL THEN RETURN; END IF;
  UPDATE integration.outbox SET envelope = jsonb_set(envelope, '{data}', d)
   WHERE id = (SELECT o.id FROM integration.outbox o
                WHERE o.aggregate_id = p_request_id::text AND o.type = 'request.published' AND o.status = 'pending' AND o.attempts = 0
                ORDER BY o.sequence DESC LIMIT 1);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN PERFORM integration.enqueue('request.published', p_request_id::text, d, 'borrower'); END IF;
END $$;

--
-- Name: publish_status(uuid, text); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.publish_status(p_request_id uuid, p_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM integration.outbox WHERE aggregate_id = p_request_id::text AND type = 'request.published') THEN
    PERFORM integration.publish_request(p_request_id);      -- the receiver refuses a status for a request it never saw
  END IF;
  PERFORM integration.enqueue('request.status_changed', p_request_id::text,
          jsonb_build_object('request_id', p_request_id, 'status', p_status, 'changed_at', now()), 'borrower');
END $$;

--
-- Name: py_round1(double precision); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.py_round1(x double precision) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  b bytea; neg boolean; expo int; mant bigint; m numeric; e int; n numeric; d numeric; q numeric; rem numeric;
BEGIN
  IF x IS NULL THEN RETURN NULL; END IF;
  IF x = 0 THEN RETURN x; END IF;
  b := float8send(x);
  neg := get_byte(b, 0) >= 128;
  expo := ((get_byte(b, 0) & 127) << 4) | (get_byte(b, 1) >> 4);
  mant := ((get_byte(b, 1) & 15)::bigint << 48) | (get_byte(b, 2)::bigint << 40) | (get_byte(b, 3)::bigint << 32)
        | (get_byte(b, 4)::bigint << 24) | (get_byte(b, 5)::bigint << 16) | (get_byte(b, 6)::bigint << 8) | get_byte(b, 7)::bigint;
  IF expo = 0 THEN m := mant; e := -1074; ELSE m := mant + 4503599627370496; e := expo - 1075; END IF;
  IF e >= 0 THEN n := m * (2::numeric ^ e) * 10; d := 1;
  ELSE n := m * 10 * (5::numeric ^ (-e)); d := 10::numeric ^ (-e); END IF;
  q := div(n, d); rem := n - q * d;
  IF rem * 2 > d OR (rem * 2 = d AND mod(q, 2) = 1) THEN q := q + 1; END IF;
  RETURN ((CASE WHEN neg THEN -q ELSE q END) / 10)::double precision;
END $$;

--
-- Name: record_inbox(text, text, text, text, bigint); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
DECLARE v_last bigint; v_outcome text;
BEGIN
  PERFORM 1 FROM integration.inbox i WHERE i.event_id = p_event_id;
  IF FOUND THEN RETURN 'duplicate'; END IF;

  SELECT w.last_sequence INTO v_last FROM integration.inbox_watermark w
   WHERE w.aggregate_id = p_aggregate_id FOR UPDATE;
  IF v_last IS NOT NULL AND p_sequence <= v_last THEN
    v_outcome := 'stale';
  ELSE
    v_outcome := 'apply';
    INSERT INTO integration.inbox_watermark (aggregate_id, last_sequence)
    VALUES (p_aggregate_id, p_sequence)
    ON CONFLICT (aggregate_id) DO UPDATE SET last_sequence = excluded.last_sequence;
  END IF;

  INSERT INTO integration.inbox (event_id, type, source, aggregate_id, sequence, outcome)
  VALUES (p_event_id, p_type, p_source, p_aggregate_id, p_sequence, v_outcome)
  ON CONFLICT (event_id) DO NOTHING;
  IF NOT FOUND THEN RETURN 'duplicate'; END IF;
  RETURN v_outcome;
END $$;

--
-- Name: request_row(uuid); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.request_row(p_request_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
  SELECT to_jsonb(q) FROM (
    SELECT r.id, r.client_id, r.product_type::text AS product_type, r.amount, r.preferred_term_months, r.purpose,
           r.product_answers, r.max_rate, r.decision_deadline, r.status::text AS status, r.created_at, r.allocation_mode,
           (SELECT json_agg(json_build_object('product_type', ra.product_type::text, 'amount', ra.amount, 'sort_order', ra.sort_order) ORDER BY ra.sort_order)
              FROM public.request_allocations ra WHERE ra.request_id = r.id) AS allocations,
           c.kyc_status::text AS kyc_status, EXTRACT(YEAR FROM AGE(c.date_of_birth))::int AS client_age,
           cd.employment_status, cd.monthly_income, cd.total_net_worth, cd.has_existing_loans, cd.health_score, cd.risk_score, cd.affordability_score,
           ed.employment_type, ed.years_of_employment,
           s.monthly_loan_payments, s.monthly_income AS snap_income, s.net_worth AS snap_net_worth, s.mortgage_balance,
           s.personal_loan_balance, s.credit_card_balance, s.vehicle_loan_balance,
           (SELECT json_agg(json_build_object('type', l.loan_type, 'outstanding', l.outstanding_amount, 'monthly', l.monthly_repayment,
                                              'bank', l.bank_name, 'months_left', l.remaining_months) ORDER BY l.outstanding_amount DESC)
              FROM public.client_loan_details l WHERE l.client_id = r.client_id) AS loan_breakdown
    FROM public.requests r
    LEFT JOIN public.clients c ON c.id = r.client_id
    LEFT JOIN public.client_dossier cd ON cd.client_id = r.client_id
    LEFT JOIN public.employment_details ed ON ed.user_id = r.client_id
    LEFT JOIN public.client_financial_snapshot s ON s.client_id = r.client_id
    WHERE r.id = p_request_id LIMIT 1) q
$$;

--
-- Name: trg_allocations_emit(); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.trg_allocations_emit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
DECLARE rid uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.request_id ELSE NEW.request_id END;
BEGIN
  BEGIN
    PERFORM integration.publish_request(rid);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO integration.emit_error (request_id, stage, error) VALUES (rid, 'allocations ' || TG_OP, left(SQLERRM, 500));
  END;
  RETURN NULL;
END $$;

--
-- Name: trg_requests_emit(); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.trg_requests_emit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      PERFORM integration.publish_request(NEW.id);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status::text <> 'deal_declined' AND OLD.status::text <> 'deal_declined' THEN
        PERFORM integration.publish_status(NEW.id, NEW.status::text);
      END IF;
    ELSIF (NEW.amount, NEW.preferred_term_months, NEW.purpose, NEW.product_answers, NEW.max_rate, NEW.decision_deadline, NEW.allocation_mode, NEW.product_type)
          IS DISTINCT FROM
          (OLD.amount, OLD.preferred_term_months, OLD.purpose, OLD.product_answers, OLD.max_rate, OLD.decision_deadline, OLD.allocation_mode, OLD.product_type) THEN
      PERFORM integration.publish_request(NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO integration.emit_error (request_id, stage, error) VALUES (NEW.id, 'requests ' || TG_OP, left(SQLERRM, 500));
  END;
  RETURN NULL;
END $$;

--
-- Name: trigger_dispatch(); Type: FUNCTION; Schema: integration; Owner: -
--

CREATE FUNCTION integration.trigger_dispatch() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
DECLARE v_url text; v_secret text; v_pending int;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'integration_dispatch_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'integration_cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO v_pending FROM integration.outbox o
   WHERE (o.status = 'pending' AND o.next_attempt_at <= now())
      OR (o.status = 'sending' AND o.lease_until < now());
  IF v_pending = 0 THEN RETURN; END IF;   -- nothing due: don't wake Vercel
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000);
END $$;

--
-- Name: _app_client_seen_forget(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._app_client_seen_forget() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  DELETE FROM public.app_client_seen WHERE client_id = NEW.client_id;
  DELETE FROM public.app_error_report WHERE client_id = NEW.client_id;
  RETURN NEW;
END $$;

--
-- Name: _scrub_error_text(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._scrub_error_text(p_text text, p_max integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT left(btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(p_text, ''),
           '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
           'eyJ[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)*', '[token]', 'g'),
           '[0-9]{6,}', '[number]', 'g'),
           '[[:space:]]+', ' ', 'g')), p_max)
$$;

--
-- Name: accept_request_invitation(bytea, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_request_invitation(p_token_hash bytea, p_client_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_inv public.request_invitation;
  v_kyc public.kyc_status;
  v_participant_id uuid;
  v_couple_id uuid;
begin
  select * into v_inv from public.request_invitation where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_inv.expires_at < now() then
    update public.request_invitation set status='expired', updated_at=now() where id=v_inv.id;
    raise exception 'invitation_expired';
  end if;
  select kyc_status into v_kyc from public.clients where id = p_client_id;
  if v_kyc is distinct from 'verified'::public.kyc_status then raise exception 'kyc_required'; end if;

  insert into public.request_participant
    (request_id, client_id, role, liability_type, ownership_bps, consent_state, consented_at)
  values
    (v_inv.request_id, p_client_id, v_inv.proposed_role, v_inv.proposed_liability,
     v_inv.proposed_ownership_bps, 'consented', now())
  on conflict (request_id, client_id) do update
    set consent_state='consented', consented_at=now(), updated_at=now()
  returning id into v_participant_id;

  update public.request_invitation
    set status='accepted', invited_client_id=p_client_id, responded_at=now(), updated_at=now()
    where id = v_inv.id;

  v_couple_id := public.get_or_create_couple_link(v_inv.inviter_client_id, p_client_id, v_inv.inviter_client_id);

  insert into public.notifications (user_id, kind, title, link, metadata)
  values (v_inv.inviter_client_id, 'joint_invitation_accepted', 'Your co-applicant accepted',
          '/requests/' || v_inv.request_id,
          jsonb_build_object('request_id', v_inv.request_id, 'participant_id', v_participant_id, 'couple_link_id', v_couple_id));

  return v_participant_id;
end $$;

--
-- Name: admin_api_traffic_stats(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_api_traffic_stats(p_channels text[]) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

--
-- Name: admin_app_release_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_app_release_stats() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
               GROUP BY s.platform, s.app_version) v), '[]'::jsonb),
    'errors', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'platform', e.platform, 'app_version', e.app_version, 'fingerprint', e.fingerprint,
               'kind', e.kind, 'message', e.message, 'location', e.location, 'route', e.route,
               'borrowers_7d', e.borrowers, 'occurrences_7d', e.occurrences, 'last_seen_at', e.last_seen_at)
             ORDER BY e.borrowers DESC, e.occurrences DESC, e.fingerprint)
        FROM (SELECT r.platform, r.app_version, r.fingerprint,
                     min(r.kind) AS kind, max(r.message) AS message, max(r.location) AS location, max(r.route) AS route,
                     count(DISTINCT r.client_id) AS borrowers, sum(r.occurrences) AS occurrences,
                     max(r.last_seen_at) AS last_seen_at
                FROM public.app_error_report r
               WHERE r.day > (now() AT TIME ZONE 'utc')::date - 7
               GROUP BY r.platform, r.app_version, r.fingerprint
               ORDER BY count(DISTINCT r.client_id) DESC, sum(r.occurrences) DESC
               LIMIT 50) e), '[]'::jsonb))
$$;

--
-- Name: admin_client_search(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_client_search(p_q text, p_limit integer DEFAULT 25) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  q   text := btrim(coalesce(p_q, ''));
  pat text;
BEGIN
  IF length(q) < 3 THEN
    RAISE EXCEPTION 'search needs at least 3 characters' USING ERRCODE = '22023';
  END IF;
  pat := replace(replace(replace(lower(q), '\', '\\'), '%', '\%'), '_', '\_');
  RETURN coalesce((
    SELECT jsonb_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT c.id AS client_id, c.full_name, c.email, c.kyc_status::text AS kyc_status, c.created_at,
             (u.banned_until IS NOT NULL AND u.banned_until > now()) AS suspended,
             (ac.client_id IS NOT NULL) AS closed
        FROM public.clients c
        LEFT JOIN auth.users u ON u.id = c.id
        LEFT JOIN public.account_closures ac ON ac.client_id = c.id
       WHERE c.id::text = lower(q)
          OR lower(c.email) LIKE pat || '%'
          OR lower(c.full_name) LIKE '%' || pat || '%'
       ORDER BY c.created_at DESC
       LIMIT least(greatest(coalesce(p_limit, 25), 1), 50)) r), '[]'::jsonb);
END $$;

--
-- Name: admin_client_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_client_summary(p_client_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
    'client_id', c.id, 'full_name', c.full_name, 'email', c.email,
    'phone_last4', nullif(right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 4), ''),
    'user_type', c.user_type, 'country', c.country,
    'kyc_status', c.kyc_status::text, 'kyc_submitted_at', c.kyc_submitted_at,
    'created_at', c.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed', u.email_confirmed_at IS NOT NULL,
    'suspended', (u.banned_until IS NOT NULL AND u.banned_until > now()),
    'closed_at', ac.closed_at, 'retain_until', ac.retain_until,
    'requests', coalesce((SELECT jsonb_object_agg(s, n) FROM (
                  SELECT r.status::text AS s, count(*) AS n FROM public.requests r
                   WHERE r.client_id = c.id GROUP BY 1) x), '{}'::jsonb),
    'recent_requests', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
                  SELECT r.id, r.product_type::text AS product_type, r.amount, r.status::text AS status, r.created_at
                    FROM public.requests r WHERE r.client_id = c.id
                   ORDER BY r.created_at DESC LIMIT 10) x), '[]'::jsonb)
  ) END
  FROM (SELECT p_client_id AS id) k
  LEFT JOIN public.clients c ON c.id = k.id
  LEFT JOIN auth.users u ON u.id = c.id
  LEFT JOIN public.account_closures ac ON ac.client_id = c.id
$$;

--
-- Name: admin_kyc_case(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_kyc_case(p_submission uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT jsonb_build_object(
    'submission_id', s.id, 'client_id', s.client_id, 'submitted_at', s.submitted_at,
    'status', s.status, 'risk_score', s.risk_score, 'flags', coalesce(s.flags, '{}'),
    'provider', s.provider, 'reference_id', s.reference_id,
    'document_type', s.document_type, 'document_number', s.document_number,
    'mrz_valid', s.mrz_valid, 'face_match_score', s.face_match_score,
    'name_match_score', s.name_match_score, 'document_expired', s.document_expired,
    'nationality', s.nationality, 'residence_status', s.residence_status,
    'reviewed_at', s.reviewed_at, 'review_note', s.review_note,
    'paths', jsonb_build_object('id', s.id_document_path, 'selfie', s.selfie_path,
                                'proof_of_address', s.proof_of_address_path, 'permit', s.permit_path),
    'ai', s.details->'aiAnalysis',
    'client', jsonb_build_object('full_name', c.full_name, 'date_of_birth', c.date_of_birth,
        'city', c.city, 'country', c.country, 'kyc_status', c.kyc_status::text, 'since', c.created_at),
    'is_latest', NOT EXISTS (SELECT 1 FROM public.kyc_submissions n
                              WHERE n.client_id = s.client_id AND n.submitted_at > s.submitted_at),
    'previous', (SELECT coalesce(jsonb_agg(jsonb_build_object('submitted_at', p.submitted_at,
                   'status', p.status, 'risk_score', p.risk_score) ORDER BY p.submitted_at DESC), '[]'::jsonb)
                   FROM public.kyc_submissions p WHERE p.client_id = s.client_id AND p.id <> s.id))
  FROM public.kyc_submissions s JOIN public.clients c ON c.id = s.client_id
  WHERE s.id = p_submission
$$;

--
-- Name: admin_kyc_cases(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_kyc_cases(p_limit integer DEFAULT 100) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT coalesce(jsonb_agg(c ORDER BY c.waiting DESC, c.submitted_at), '[]'::jsonb) FROM (
    SELECT s.id AS submission_id, s.client_id, s.submitted_at, s.status, s.risk_score,
           coalesce(s.flags, '{}') AS flags, s.document_type,
           right(coalesce(s.document_number, ''), 4) AS document_last4,
           s.reviewed_at, s.review_note, c.full_name, c.kyc_status::text AS client_kyc_status,
           (s.status IN ('pending_review', 'under_review')) AS waiting
      FROM public.kyc_submissions s JOIN public.clients c ON c.id = s.client_id
     WHERE s.status IN ('pending_review', 'under_review')
        OR s.reviewed_at > now() - interval '30 days'
     ORDER BY (s.status IN ('pending_review', 'under_review')) DESC, s.submitted_at
     LIMIT least(greatest(coalesce(p_limit, 100), 1), 500)) c
$$;

--
-- Name: admin_marketplace_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_marketplace_stats(p_days integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  d     int := CASE WHEN p_days IN (7, 30, 90, 365) THEN p_days ELSE 30 END;
  since timestamptz := now() - make_interval(days => d);
  out   jsonb;
BEGIN
  WITH r AS (
    SELECT q.id, q.product_type::text AS product, q.status::text AS status, q.amount, q.created_at,
           q.accepted_bid_id, q.relisted_from
      FROM public.requests q
     WHERE q.created_at >= since
  ), b AS (
    SELECT s.request_id, count(*) AS bids, min(s.received_at) AS first_bid_at
      FROM integration.bid_shadow s JOIN r ON r.id = s.request_id
     GROUP BY s.request_id
  ), a AS (
    SELECT ba.request_id, min(ba.accepted_at) AS accepted_at
      FROM public.bid_acceptances ba JOIN r ON r.id = ba.request_id
     GROUP BY ba.request_id
  ), x AS (
    SELECT r.*, coalesce(b.bids, 0) AS bids, b.first_bid_at, a.accepted_at,
           (a.accepted_at IS NOT NULL OR r.accepted_bid_id IS NOT NULL
             OR r.status IN ('accepted', 'deal_declined')) AS was_accepted,
           extract(epoch FROM b.first_bid_at - r.created_at) / 3600.0 AS h_bid,
           extract(epoch FROM a.accepted_at - r.created_at) / 3600.0 AS h_accept
      FROM r LEFT JOIN b ON b.request_id = r.id LEFT JOIN a ON a.request_id = r.id
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'days', d,
    'funnel', (SELECT jsonb_build_object(
        'posted',        count(*),
        'relisted',      count(*) FILTER (WHERE relisted_from IS NOT NULL),
        'with_bid',      count(*) FILTER (WHERE bids > 0),
        'accepted',      count(*) FILTER (WHERE was_accepted),
        'bank_declined', count(*) FILTER (WHERE status = 'deal_declined'),
        'bids_per_request_with_bid', round(avg(bids) FILTER (WHERE bids > 0), 1),
        'requested_amount', coalesce(sum(amount), 0),
        'accepted_amount',  coalesce(sum(amount) FILTER (WHERE was_accepted), 0))
      FROM x),
    'hours_to_first_bid', (SELECT jsonb_build_object(
        'median', round((percentile_cont(0.5) WITHIN GROUP (ORDER BY h_bid))::numeric, 1),
        'p90',    round((percentile_cont(0.9) WITHIN GROUP (ORDER BY h_bid))::numeric, 1))
      FROM x WHERE h_bid IS NOT NULL),
    'hours_to_acceptance', (SELECT jsonb_build_object(
        'median', round((percentile_cont(0.5) WITHIN GROUP (ORDER BY h_accept))::numeric, 1),
        'p90',    round((percentile_cont(0.9) WITHIN GROUP (ORDER BY h_accept))::numeric, 1))
      FROM x WHERE h_accept IS NOT NULL),
    'status', coalesce((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM x GROUP BY status) s), '{}'::jsonb),
    'by_product', coalesce((SELECT jsonb_agg(p ORDER BY (p->>'posted')::int DESC, p->>'product') FROM (
        SELECT jsonb_build_object('product', product, 'posted', count(*),
                 'with_bid', count(*) FILTER (WHERE bids > 0), 'accepted', count(*) FILTER (WHERE was_accepted),
                 'requested_amount', coalesce(sum(amount), 0)) AS p
          FROM x GROUP BY product) t), '[]'::jsonb),
    -- Every week in the window, including weeks with nothing posted (a gap is information).
    'weekly', (SELECT jsonb_agg(w ORDER BY wk) FROM (
        SELECT g.wk, jsonb_build_object('week', to_char(g.wk, 'YYYY-MM-DD'),
                 'posted', count(x.id), 'with_bid', count(x.id) FILTER (WHERE x.bids > 0),
                 'accepted', count(x.id) FILTER (WHERE x.was_accepted)) AS w
          FROM generate_series(date_trunc('week', since), date_trunc('week', now()), interval '1 week') AS g(wk)
          LEFT JOIN x ON date_trunc('week', x.created_at) = g.wk
         GROUP BY g.wk) t),
    'now', (SELECT jsonb_build_object(
        'open', count(*),
        'open_no_bid_24h', count(*) FILTER (WHERE nb.request_id IS NULL AND q.created_at < now() - interval '24 hours'),
        'oldest_no_bid_hours', round((max(extract(epoch FROM now() - q.created_at) / 3600.0)
                                FILTER (WHERE nb.request_id IS NULL AND q.created_at < now() - interval '24 hours'))::numeric, 0))
      FROM public.requests q
      LEFT JOIN (SELECT DISTINCT request_id FROM integration.bid_shadow) nb ON nb.request_id = q.id
     WHERE q.status = 'open')
  ) INTO out;
  RETURN out;
END $$;

--
-- Name: admin_schema_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_schema_status() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT coalesce(jsonb_agg(version ORDER BY version), '[]'::jsonb) FROM admin.schema_migration
$$;

--
-- Name: admin_sync_apply(uuid, text, text, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
  SELECT admin.sync_apply(p_event_id, p_topic, p_aggregate_type, p_aggregate_id, p_version, p_payload)
$$;

--
-- Name: api_channel_policies(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_channel_policies() RETURNS TABLE(channel text, state text, version bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT p.channel, p.state, p.version FROM admin.api_channel_policy p
$$;

--
-- Name: api_traffic_record(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_traffic_record(p_rows jsonb, p_status jsonb DEFAULT '[]'::jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

--
-- Name: audit_logs_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_logs_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

--
-- Name: can_release_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_release_request(p_request_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_participants uuid[];
  v_unconsented_count int;
  v_couple_status public.couple_status;
begin
  select array_agg(client_id order by created_at),
         count(*) filter (where consent_state <> 'consented')
    into v_participants, v_unconsented_count
    from public.request_participant where request_id = p_request_id;

  if v_participants is null or array_length(v_participants, 1) <= 1 then
    return coalesce(v_unconsented_count, 0) = 0;
  end if;

  if array_length(v_participants, 1) <> 2 then
    return false; -- couple-only for now
  end if;

  select status into v_couple_status from public.couple_link
    where (client_a_id = least(v_participants[1], v_participants[2])
       and client_b_id = greatest(v_participants[1], v_participants[2]));

  return v_unconsented_count = 0 and v_couple_status = 'verified';
end $$;

--
-- Name: cancel_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_request(p_request_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_status public.request_status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in');
  END IF;

  SELECT status INTO v_status
    FROM public.requests
   WHERE id = p_request_id AND client_id = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_open', 'status', v_status);
  END IF;

  UPDATE public.requests SET status = 'closed' WHERE id = p_request_id;

  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_before, state_after, outcome
  ) VALUES (
    v_uid, v_uid, 'client_user', 'request.cancel', 'Financing request cancelled by borrower',
    'requests', p_request_id,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'closed', 'reason', 'cancelled_by_borrower'),
    'success'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

--
-- Name: close_account(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_account(p_client_id uuid, p_retain_years integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_existing public.account_closures%ROWTYPE;
  v_closed   integer;
  v_until    date;
BEGIN
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'client id required';
  END IF;
  IF p_retain_years IS NULL OR p_retain_years < 7 THEN
    RAISE EXCEPTION 'retention must be at least 7 years (FIAMLA)';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('close_account:' || p_client_id::text, 0));

  SELECT * INTO v_existing FROM public.account_closures WHERE client_id = p_client_id;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'already_closed', 'retain_until', v_existing.retain_until);
  END IF;

  IF EXISTS (SELECT 1 FROM public.requests
             WHERE client_id = p_client_id AND status::text = 'awaiting_consent') THEN
    RETURN jsonb_build_object('status', 'acceptance_in_progress');
  END IF;

  UPDATE public.requests SET status = 'closed'
   WHERE client_id = p_client_id AND status::text IN ('open', 'PENDING');
  GET DIAGNOSTICS v_closed = ROW_COUNT;

  DELETE FROM fico.message           WHERE user_id = p_client_id;
  DELETE FROM fico.conversation      WHERE user_id = p_client_id;
  DELETE FROM fico.message_meter     WHERE user_id = p_client_id;
  DELETE FROM fico.profile           WHERE user_id = p_client_id;
  DELETE FROM public.advisor_messages   WHERE user_id = p_client_id;
  DELETE FROM finance.holdings          WHERE user_id = p_client_id;
  DELETE FROM finance.accounts          WHERE user_id = p_client_id;
  DELETE FROM finance.net_worth_history WHERE user_id = p_client_id;
  DELETE FROM public.market_preferences WHERE user_id = p_client_id;
  DELETE FROM public.notifications      WHERE user_id = p_client_id;
  DELETE FROM public.activity_events    WHERE client_id = p_client_id;

  v_until := (now() + make_interval(years => p_retain_years))::date;

  INSERT INTO public.account_closures (client_id, retain_until, open_requests_closed)
  VALUES (p_client_id, v_until, v_closed);

  INSERT INTO public.audit_events
    (client_id, actor_id, actor_type, action_category, event_label,
     resource_type, resource_id, state_after, outcome)
  VALUES
    (p_client_id, p_client_id, 'client_user', 'account.close', 'Account closed by client',
     'client', p_client_id,
     jsonb_build_object('retain_until', v_until, 'open_requests_closed', v_closed),
     'success');

  RETURN jsonb_build_object('status', 'closed', 'retain_until', v_until,
                            'open_requests_closed', v_closed);
END;
$$;

--
-- Name: compute_client_scores(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_client_scores(p jsonb) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
    SET search_path TO 'pg_catalog', 'pg_temp'
    AS $$
DECLARE
  inc    numeric := greatest(coalesce((p ->> 'income')::numeric, 0), 0);
  emp    text    := p ->> 'employment_status';
  nw     numeric := coalesce((p ->> 'net_worth')::numeric, 0);
  ta     numeric := coalesce((p ->> 'total_assets')::numeric, 0);
  repay  numeric := greatest(coalesce((p ->> 'monthly_repayment')::numeric, 0), 0);
  rev    numeric := coalesce((p ->> 'annual_revenue')::numeric, 0);
  pep    boolean := coalesce((p ->> 'is_pep')::boolean, false);
  bkr    boolean := coalesce((p ->> 'bankruptcy')::boolean, false);
  blk    boolean := coalesce((p ->> 'blacklisted')::boolean, false);
  mis    boolean := coalesce((p ->> 'missed_repayments')::boolean, false);
  leg    boolean := coalesce((p ->> 'legal_disputes')::boolean, false);
  dti    numeric := CASE WHEN inc = 0 THEN 1 ELSE repay / inc END;
  months numeric;
  h      numeric := 50;
  r      numeric := 30;
  a      numeric := 0;
BEGIN
  -- Health
  h := h + CASE WHEN inc >= 200000 THEN 22 WHEN inc >= 100000 THEN 16
                WHEN inc >= 50000  THEN 10 WHEN inc >= 25000  THEN 5 ELSE 0 END;
  IF inc > 0 THEN
    months := nw / inc;
    h := h + CASE WHEN months >= 36 THEN 15 WHEN months >= 18 THEN 10
                  WHEN months >= 6  THEN 5  ELSE 0 END;
  END IF;
  IF emp IN ('employed', 'self_employed', 'business_owner') THEN h := h + 6; END IF;
  IF emp = 'unemployed' THEN h := h - 15; END IF;
  IF emp = 'student'    THEN h := h - 8;  END IF;
  h := h - CASE WHEN dti > 0.6 THEN 25 WHEN dti > 0.4 THEN 15
                WHEN dti > 0.25 THEN 8 WHEN dti > 0.1 THEN 3 ELSE 0 END;
  IF bkr THEN h := h - 30; END IF;
  IF blk THEN h := h - 25; END IF;
  IF mis THEN h := h - 12; END IF;
  IF leg THEN h := h - 10; END IF;

  -- Risk
  IF bkr THEN r := r + 35; END IF;
  IF blk THEN r := r + 30; END IF;
  IF mis THEN r := r + 18; END IF;
  IF leg THEN r := r + 12; END IF;
  IF pep THEN r := r + 10; END IF;
  r := r + CASE WHEN dti > 0.6 THEN 25 WHEN dti > 0.4 THEN 15 WHEN dti > 0.25 THEN 8 ELSE 0 END;
  IF emp = 'unemployed' THEN r := r + 20; END IF;
  IF emp IN ('freelance', 'student') THEN r := r + 8; END IF;
  r := r + CASE WHEN inc < 15000 THEN 15 WHEN inc < 30000 THEN 5 ELSE 0 END;

  -- Affordability
  IF inc > 0 THEN
    a := round((1 - dti) * 80);
    a := a + CASE WHEN nw > inc * 12 THEN 15 WHEN nw > inc * 6 THEN 8
                  WHEN nw > inc * 3  THEN 3  ELSE 0 END;
    IF inc < 20000 THEN a := a - 10; END IF;
  END IF;

  RETURN jsonb_build_object(
    'health_score',        greatest(0, least(100, round(h)))::int,
    'risk_score',          greatest(0, least(100, round(r)))::int,
    'affordability_score', greatest(0, least(100, round(a)))::int,
    'edd_required',        pep OR inc > 500000 OR ta > 10000000
                           OR (emp = 'business_owner' AND rev > 5000000)
  );
END $$;

--
-- Name: FUNCTION compute_client_scores(p jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compute_client_scores(p jsonb) IS 'The one scoring formula. Pure: reads no tables. Stored scores come from trg_dossier_derive; the onboarding screen calls this for its live preview.';

--
-- Name: compute_goal_readiness(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_goal_readiness(p_goal_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_goal          public.client_goals%ROWTYPE;
  v_user          public.clients%ROWTYPE;
  v_doc_score     integer := 0;
  v_fin_score     integer := 0;
  v_viability     integer := 0;
  v_profile       integer := 0;
  v_total         integer := 0;
  v_required_docs integer := 0;
  v_uploaded_docs integer := 0;
  v_result        jsonb;
BEGIN
  SELECT * INTO v_goal FROM public.client_goals WHERE id = p_goal_id;
  IF NOT FOUND THEN RETURN '{"error": "goal not found"}'::jsonb; END IF;
 
  SELECT * INTO v_user FROM public.users WHERE id = v_goal.client_id;
 
  -- ── Documents (30%) ─────────────────────────────────────────
  SELECT COUNT(*) INTO v_required_docs
    FROM public.goal_required_documents
   WHERE goal_type = v_goal.type AND mandatory = true;
 
  SELECT COUNT(DISTINCT grd.doc_type) INTO v_uploaded_docs
    FROM public.goal_required_documents grd
    JOIN public.client_documents cd
      ON cd.client_id = v_goal.client_id
     AND cd.type = grd.doc_type
     AND cd.verified = true
   WHERE grd.goal_type = v_goal.type AND grd.mandatory = true;
 
  IF v_required_docs > 0 THEN
    v_doc_score := ROUND((v_uploaded_docs::numeric / v_required_docs) * 100);
  ELSE
    v_doc_score := 100;
  END IF;
 
  -- ── Financial health (25%) ───────────────────────────────────
  -- Proxy: KYC verified + income snapshot present
  IF v_user.kyc_status = 'verified' THEN v_fin_score := v_fin_score + 60; END IF;
  IF v_goal.saved_amount > 0 THEN v_fin_score := v_fin_score + 40; END IF;
 
  -- ── Goal viability (25%) ─────────────────────────────────────
  -- Has a target amount and a realistic timeline
  IF v_goal.target_amount > 0 THEN v_viability := v_viability + 50; END IF;
  IF v_goal.target_date IS NOT NULL AND v_goal.target_date > CURRENT_DATE THEN
    v_viability := v_viability + 50;
  ELSIF v_goal.target_date IS NULL THEN
    v_viability := v_viability + 30; -- no deadline is OK
  END IF;
 
  -- ── Profile completeness (20%) ───────────────────────────────
  IF v_user.full_name   IS NOT NULL AND v_user.full_name   <> '' THEN v_profile := v_profile + 25; END IF;
  IF v_user.phone       IS NOT NULL AND v_user.phone       <> '' THEN v_profile := v_profile + 25; END IF;
  IF v_user.date_of_birth IS NOT NULL                             THEN v_profile := v_profile + 25; END IF;
  IF v_user.kyc_status = 'verified'                              THEN v_profile := v_profile + 25; END IF;
 
  -- ── Weighted total ───────────────────────────────────────────
  v_total := ROUND(
    (v_doc_score  * 0.30) +
    (v_fin_score  * 0.25) +
    (v_viability  * 0.25) +
    (v_profile    * 0.20)
  );
 
  v_result := jsonb_build_object(
    'score',             v_total,
    'documents',         v_doc_score,
    'financial_health',  v_fin_score,
    'goal_viability',    v_viability,
    'profile',           v_profile,
    'docs_uploaded',     v_uploaded_docs,
    'docs_required',     v_required_docs
  );
 
  -- Persist to table
  UPDATE public.client_goals
     SET readiness_score       = v_total,
         readiness_breakdown   = v_result,
         updated_at            = now()
   WHERE id = p_goal_id;
 
  RETURN v_result;
END;
$$;

--
-- Name: consume_ai_quota(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_ai_quota(p_client_id uuid, p_kind text, p_daily_limit integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'Indian/Mauritius')::date;
  v_calls integer;
BEGIN
  IF p_client_id IS NULL OR p_kind NOT IN ('chat', 'market') OR p_daily_limit IS NULL OR p_daily_limit < 1 THEN
    RAISE EXCEPTION 'consume_ai_quota: bad arguments';
  END IF;

  INSERT INTO public.ai_usage AS u (client_id, usage_day, kind, calls)
  VALUES (p_client_id, v_day, p_kind, 1)
  ON CONFLICT (client_id, usage_day, kind)
    DO UPDATE SET calls = u.calls + 1, updated_at = now()
    WHERE u.calls < p_daily_limit
  RETURNING calls INTO v_calls;

  IF v_calls IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'limit', p_daily_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_calls, 'limit', p_daily_limit);
END;
$$;

--
-- Name: create_multi_product_request(numeric, text, text, integer, numeric, timestamp with time zone, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_multi_product_request(p_amount numeric, p_purpose text, p_anonymized_brief text, p_preferred_term_months integer, p_max_rate numeric, p_decision_deadline timestamp with time zone, p_allocation_mode text, p_allocations jsonb) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_client_id  uuid := auth.uid();
  v_request_id uuid;
  v_alloc      jsonb;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_allocation_mode NOT IN ('client_specified','institution_decides') THEN
    RAISE EXCEPTION 'Invalid allocation_mode: %', p_allocation_mode;
  END IF;
  IF jsonb_array_length(p_allocations) < 2 THEN
    RAISE EXCEPTION 'Multi-product request needs at least 2 allocation lines';
  END IF;

  INSERT INTO requests (
    client_id, product_type, amount, purpose, preferred_term_months,
    max_rate, decision_deadline, anonymized_brief, status, allocation_mode
  ) VALUES (
    v_client_id, 'mixed_portfolio', p_amount, p_purpose, p_preferred_term_months,
    p_max_rate, p_decision_deadline, p_anonymized_brief, 'open', p_allocation_mode
  )
  RETURNING id INTO v_request_id;

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO request_allocations (request_id, product_type, amount, sort_order)
    VALUES (
      v_request_id,
      (v_alloc->>'product_type')::product_type,
      NULLIF(v_alloc->>'amount', '')::numeric,
      COALESCE((v_alloc->>'sort_order')::int, 0)
    );
  END LOOP;

  RETURN v_request_id;
END;
$$;

--
-- Name: create_notification(uuid, public.notification_kind, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_kind public.notification_kind, p_title text, p_body text DEFAULT NULL::text, p_link text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user_id, p_kind, p_title, p_body, p_link);
end;
$$;

--
-- Name: create_request_invitation(uuid, uuid, text, bytea, text, public.invitation_channel, public.participant_role, public.liability_type, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_request_invitation(p_request_id uuid, p_inviter_client_id uuid, p_invited_email text, p_token_hash bytea, p_invited_phone text DEFAULT NULL::text, p_channel public.invitation_channel DEFAULT 'email'::public.invitation_channel, p_proposed_role public.participant_role DEFAULT 'co_applicant'::public.participant_role, p_proposed_liability public.liability_type DEFAULT NULL::public.liability_type, p_proposed_ownership_bps integer DEFAULT NULL::integer, p_ttl_days integer DEFAULT 7) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_email text := lower(trim(p_invited_email));
  v_match uuid;
  v_id uuid;
begin
  if v_email is null or v_email = '' then raise exception 'invited_email_required'; end if;
  select id into v_match from public.clients where lower(email) = v_email limit 1;
  if v_match is not null and v_match = p_inviter_client_id then raise exception 'cannot_invite_self'; end if;
  update public.request_invitation set status = 'revoked', revoked_at = now(), updated_at = now()
    where request_id = p_request_id and invited_email = v_email and status = 'pending';
  insert into public.request_invitation (
    request_id, inviter_client_id, invited_email, invited_phone, channel,
    invited_client_id, proposed_role, proposed_liability, proposed_ownership_bps, token_hash, expires_at
  ) values (
    p_request_id, p_inviter_client_id, v_email, p_invited_phone, p_channel,
    v_match, p_proposed_role, p_proposed_liability, p_proposed_ownership_bps,
    p_token_hash, now() + make_interval(days => p_ttl_days)
  ) returning id into v_id;
  return v_id;
end $$;

--
-- Name: current_client_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_client_email() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select email from public.clients where id = auth.uid();
$$;

--
-- Name: decline_request_invitation(bytea); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decline_request_invitation(p_token_hash bytea) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_inv public.request_invitation;
begin
  select * into v_inv from public.request_invitation where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  update public.request_invitation set status = 'declined', responded_at = now(), updated_at = now() where id = v_inv.id;
  insert into public.notifications (user_id, kind, title, link, metadata)
  values (v_inv.inviter_client_id, 'joint_invitation_declined', 'Your co-applicant declined',
          '/requests/' || v_inv.request_id, jsonb_build_object('request_id', v_inv.request_id));
end $$;

--
-- Name: enqueue_webhook_events(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_webhook_events(p_institution_id uuid, p_event_type text, p_payload jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_webhook record;
begin
  for v_webhook in select id from institution_webhooks
    where institution_id = p_institution_id and active = true and event_types ? p_event_type
  loop
    insert into webhook_events (institution_id, webhook_id, event_type, payload, status, next_retry_at)
    values (p_institution_id, v_webhook.id, p_event_type, p_payload, 'pending', now());
  end loop;
end; $$;

--
-- Name: expire_overdue_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_overdue_requests() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  n integer;
begin
  update public.requests
     set status = 'expired',
         updated_at = now()
   where status = 'open'
     and decision_deadline is not null
     and decision_deadline < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

--
-- Name: expire_pending_actions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_pending_actions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_action pending_actions%rowtype;
begin
  for v_action in select * from pending_actions where action_status='pending' and expires_at < now()
  loop
    update pending_actions set action_status='expired' where id=v_action.id;
    perform write_audit(v_action.institution_id, v_action.id, null, 'system', null, null,
      v_action.action_category, v_action.action_category::text||'.expired',
      v_action.resource_type, v_action.resource_id,
      v_action.payload_before, v_action.payload, 'expired', 'no checker response within window');
  end loop;
end; $$;

--
-- Name: expire_stale_bids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_stale_bids() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_bid record;
begin
  for v_bid in select id, institution_id, request_id from institution_bids where status='submitted' and expires_at < now()
  loop
    update institution_bids set status='expired' where id=v_bid.id;
    perform enqueue_webhook_events(v_bid.institution_id,'bid.expired',
      jsonb_build_object('event','bid.expired','bid_id',v_bid.id,'request_id',v_bid.request_id));
  end loop;
end; $$;

--
-- Name: expire_stale_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_stale_requests() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_req record;
begin
  for v_req in select id from client_requests where status in ('open','bidding') and bid_window_closes_at < now()
  loop
    update client_requests set status='expired', updated_at=now() where id=v_req.id;
    update institution_bids set status='expired' where request_id=v_req.id and status='submitted';
  end loop;
end; $$;

--
-- Name: finance_accounts_summary(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_accounts_summary(p_reporting_currency text DEFAULT NULL::text) RETURNS TABLE(id uuid, institution_name text, account_type text, currency text, balance numeric, balance_reporting numeric, notes text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
  select * from finance.get_accounts_summary(p_reporting_currency);
$$;

--
-- Name: finance_delete_account(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_delete_account(p_id uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public', 'finance'
    AS $$
  delete from finance.accounts where id = p_id and user_id = auth.uid();
$$;

--
-- Name: finance_delete_holding(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_delete_holding(p_id uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public', 'finance'
    AS $$
  delete from finance.holdings where id = p_id and user_id = auth.uid();
$$;

SET default_table_access_method = heap;

--
-- Name: net_worth_history; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.net_worth_history (
    user_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    cash_savings numeric DEFAULT 0 NOT NULL,
    fixed_deposits numeric DEFAULT 0 NOT NULL,
    investments_value numeric DEFAULT 0 NOT NULL,
    total_assets numeric DEFAULT 0 NOT NULL,
    total_liabilities numeric DEFAULT 0 NOT NULL,
    net_worth numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'MUR'::text NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY finance.net_worth_history FORCE ROW LEVEL SECURITY;

--
-- Name: finance_get_net_worth_history(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_get_net_worth_history(p_days integer DEFAULT 180) RETURNS SETOF finance.net_worth_history
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
  select * from finance.net_worth_history
  where user_id = auth.uid()
    and snapshot_date >= current_date - p_days
  order by snapshot_date asc;
$$;

--
-- Name: finance_holdings_summary(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_holdings_summary(p_reporting_currency text DEFAULT NULL::text) RETURNS TABLE(id uuid, asset_type text, symbol text, exchange text, quantity numeric, currency text, cost_basis numeric, price numeric, price_currency text, price_fetched_at timestamp with time zone, market_value_native numeric, market_value_reporting numeric, cost_basis_reporting numeric, unrealized_pl_reporting numeric, unrealized_pl_pct numeric, notes text)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
  select * from finance.get_holdings_summary(p_reporting_currency);
$$;

--
-- Name: accounts; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    institution_name text NOT NULL,
    account_type text NOT NULL,
    currency text DEFAULT 'MUR'::text NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounts_account_type_check CHECK ((account_type = ANY (ARRAY['savings'::text, 'current'::text, 'fixed_deposit'::text])))
);

ALTER TABLE ONLY finance.accounts FORCE ROW LEVEL SECURITY;

--
-- Name: finance_list_accounts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_list_accounts() RETURNS SETOF finance.accounts
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'finance'
    AS $$
  select * from finance.accounts where user_id = auth.uid() order by account_type, institution_name;
$$;

--
-- Name: finance_upsert_account(uuid, text, text, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_upsert_account(p_id uuid, p_institution_name text, p_account_type text, p_currency text, p_balance numeric, p_notes text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public', 'finance'
    AS $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into finance.accounts (user_id, institution_name, account_type, currency, balance, notes)
    values (auth.uid(), p_institution_name, p_account_type, p_currency, p_balance, p_notes)
    returning id into v_id;
  else
    update finance.accounts
      set institution_name = p_institution_name,
          account_type     = p_account_type,
          currency         = p_currency,
          balance          = p_balance,
          notes            = p_notes
      where id = p_id and user_id = auth.uid()
      returning id into v_id;
  end if;
  return v_id;
end;
$$;

--
-- Name: finance_upsert_holding(uuid, text, text, text, numeric, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finance_upsert_holding(p_id uuid, p_asset_type text, p_symbol text, p_exchange text, p_quantity numeric, p_currency text, p_cost_basis numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public', 'finance'
    AS $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into finance.holdings (user_id, asset_type, symbol, exchange, quantity, currency, cost_basis, notes)
    values (auth.uid(), p_asset_type, upper(p_symbol), nullif(p_exchange, ''), p_quantity, p_currency, p_cost_basis, p_notes)
    returning id into v_id;
  else
    update finance.holdings
      set asset_type = p_asset_type,
          symbol     = upper(p_symbol),
          exchange   = nullif(p_exchange, ''),
          quantity   = p_quantity,
          currency   = p_currency,
          cost_basis = p_cost_basis,
          notes      = p_notes
      where id = p_id and user_id = auth.uid()
      returning id into v_id;
  end if;
  return v_id;
end;
$$;

--
-- Name: get_my_institution_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_institution_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select institution_id from institution_users where user_id = auth.uid() limit 1;
$$;

--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT COALESCE(
    (SELECT 'client' FROM public.clients WHERE id = auth.uid()),
    (SELECT 'admin' FROM admin.admin_users WHERE id = auth.uid() AND active = true)
  );
$$;

--
-- Name: get_or_create_couple_link(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_couple_link(p_client_x uuid, p_client_y uuid, p_initiated_by uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_lo uuid; v_hi uuid; v_id uuid;
begin
  if p_client_x = p_client_y then raise exception 'cannot_link_self'; end if;
  if p_client_x < p_client_y then v_lo := p_client_x; v_hi := p_client_y;
  else v_lo := p_client_y; v_hi := p_client_x; end if;

  select id into v_id from public.couple_link where client_a_id = v_lo and client_b_id = v_hi;
  if v_id is not null then return v_id; end if;

  insert into public.couple_link (client_a_id, client_b_id, initiated_by_client_id)
  values (v_lo, v_hi, p_initiated_by)
  returning id into v_id;
  return v_id;
end $$;

--
-- Name: guard_client_kyc_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_client_kyc_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  -- current_user is the API role of the caller: 'authenticated'/'anon' for a
  -- browser, 'service_role' for the server, the owner for definer triggers.
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.kyc_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'kyc_status is set by verification only' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
      RAISE EXCEPTION 'kyc_status is set by verification only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

--
-- Name: handle_bid_received(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_bid_received() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_client uuid;
  v_bank_name text;
begin
  -- Find the client who owns the request
  select client_id into v_client from public.requests where id = new.request_id;

  -- Find the bank's institution name (or fallback to a generic label)
  select coalesce(bp.institution_name, 'A bank')
    into v_bank_name
    from public.bank_profiles bp
    where bp.user_id = new.bank_id;

  if v_client is not null then
    perform public.create_notification(
      v_client,
      'bid_received'::notification_kind,
      'New bid received',
      v_bank_name || ' submitted an offer at ' || new.interest_rate || '% APR.',
      '/requests/' || new.request_id::text
    );
  end if;

  return new;
end;
$$;

--
-- Name: handle_kyc_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_kyc_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.kyc_status is distinct from old.kyc_status then
    if new.kyc_status = 'verified' then
      perform public.create_notification(
        new.id,
        'kyc_verified'::notification_kind,
        'Identity verified',
        'Banks can now bid on your requests. Welcome to the marketplace.',
        '/dashboard'
      );
    elsif new.kyc_status = 'rejected' then
      perform public.create_notification(
        new.id,
        'kyc_rejected'::notification_kind,
        'Verification needs another look',
        'We could not verify your documents. Please try again.',
        '/onboarding/kyc'
      );
    end if;
  end if;
  return new;
end;
$$;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
BEGIN
  INSERT INTO public.clients (
    id, email, full_name, first_name, last_name,
    phone, title, user_type, company_name, company_registration,
    date_of_birth, gender
  ) VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    NULLIF(lower(new.raw_user_meta_data->>'title'), '')::public.title_type,
    coalesce(new.raw_user_meta_data->>'user_type', 'individual'),
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'company_registration',
    CASE WHEN new.raw_user_meta_data->>'date_of_birth' ~ '^\d{4}-\d{2}-\d{2}$'
         THEN (new.raw_user_meta_data->>'date_of_birth')::date
         ELSE NULL END,
    NULLIF(new.raw_user_meta_data->>'gender', '')
  ) ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
END;
$_$;

--
-- Name: handle_request_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_request_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform public.create_notification(
    new.client_id,
    'request_created'::notification_kind,
    'Request posted',
    'Banks across Mauritius are now reviewing your request.',
    '/requests/' || new.id::text
  );
  return new;
end;
$$;

--
-- Name: has_institution_role(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_institution_role(p_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists(select 1 from institution_users where user_id = auth.uid() and role = p_role);
$$;

--
-- Name: institution_has_module(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institution_has_module(p_institution_id uuid, p_module text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists(select 1 from institutions where id = p_institution_id and modules ? p_module);
$$;

--
-- Name: institution_is_active(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institution_is_active(p_institution_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists(select 1 from institutions where id = p_institution_id and approved = true and onboarding_stage = 'approved' and suspended_at is null);
$$;

--
-- Name: integration_anon_borrower_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_anon_borrower_id(p_client_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.anon_borrower_id(p_client_id);
$$;

--
-- Name: integration_apply_bid_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_bid_event(p_env jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_bid_event(p_env);
$$;

--
-- Name: integration_apply_chat_message_event(jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_chat_message_event(p_env jsonb, p_refuse text DEFAULT NULL::text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_chat_message_event(p_env, p_refuse);
$$;

--
-- Name: integration_apply_deal_documents_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_deal_documents_event(p_env jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_deal_documents_event(p_env);
$$;

--
-- Name: integration_apply_deal_progress_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_deal_progress_event(p_env jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_deal_progress_event(p_env);
$$;

--
-- Name: integration_apply_market_intelligence_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_market_intelligence_event(p_env jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_market_intelligence_event(p_env);
$$;

--
-- Name: integration_apply_request_declined_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_request_declined_event(p_env jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_request_declined_event(p_env);
$$;

--
-- Name: integration_apply_request_window_closed_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_apply_request_window_closed_event(p_env jsonb) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.apply_request_window_closed_event(p_env);
$$;

--
-- Name: integration_bids_for(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_bids_for(p_client_id uuid, p_request_ids uuid[]) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
  SELECT coalesce(jsonb_object_agg(q.id::text, coalesce(b.bids, '[]'::jsonb)), '{}'::jsonb)
  FROM public.requests q
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'id',               s.bid_id,
             'request_id',       s.request_id,
             'institution_id',   s.payload -> 'institution_id',
             'institution_name', s.payload -> 'institution_name',
             'institution_logo', s.payload -> 'institution_logo_url',
             'rate',             s.payload -> 'rate',
             'rate_type',        s.payload -> 'rate_type',
             'rate_valid_days',  s.payload -> 'rate_valid_days',
             'amount_offered',   s.payload -> 'amount_offered',
             'term_months',      s.payload -> 'term_months',
             'conditions',       coalesce(s.payload -> 'conditions', '{}'::jsonb),
             'fee_structure',    coalesce(s.payload -> 'fee_structure', '{}'::jsonb),
             'status',           s.status,
             'submitted_at',     s.payload -> 'submitted_at',
             'expires_at',       s.payload -> 'expires_at',
             'benefits',         coalesce(s.payload -> 'benefits', '[]'::jsonb),
             'allocations',      coalesce(s.payload -> 'allocations', '[]'::jsonb))
           ORDER BY (s.payload ->> 'rate')::numeric ASC) AS bids
      FROM integration.bid_shadow s
     WHERE s.request_id = q.id
       AND s.status IN ('submitted', 'under_review')
       AND s.bid_id IS DISTINCT FROM q.accepted_bid_id
  ) b ON true
  WHERE q.client_id = p_client_id AND q.id = ANY(p_request_ids);
$$;

--
-- Name: integration_claim_batch(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_claim_batch(p_limit integer DEFAULT 20, p_lease_seconds integer DEFAULT 60) RETURNS TABLE(id text, envelope jsonb, attempts integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT * FROM integration.claim_batch(p_limit, p_lease_seconds);
$$;

--
-- Name: integration_complete_acceptance(text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.complete_acceptance(p_consent_ref, p_outcome, p_institution);
$$;

--
-- Name: integration_deal_documents_for(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_deal_documents_for(p_client_id uuid, p_request_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT jsonb_build_object('pipeline_id', s.pipeline_id, 'request_id', s.request_id, 'bid_id', s.bid_id,
                            'documents', s.documents, 'updated_at', s.updated_at)
    FROM integration.deal_documents s
   WHERE s.client_id = p_client_id AND s.request_id = p_request_id;
$$;

--
-- Name: integration_deal_progress_for(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_deal_progress_for(p_client_id uuid, p_request_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT jsonb_build_object(
    'pipeline_id',      p.pipeline_id,
    'status',           p.payload ->> 'status',
    'institution_name', coalesce(b.payload ->> 'institution_name', ''),
    'deal_amount',      (p.payload -> 'deal' ->> 'amount')::numeric,
    'deal_rate',        (p.payload -> 'deal' ->> 'rate')::numeric,
    'deal_term_months', (p.payload -> 'deal' ->> 'term_months')::int,
    'started_at',       p.payload ->> 'started_at',
    'completed_at',     p.payload ->> 'completed_at',
    'stages', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.pipeline_id::text || ':' || (s ->> 'position'),
               'position', (s ->> 'position')::int, 'status', s ->> 'status', 'label', s ->> 'label',
               'stage_key', '', 'started_at', s ->> 'started_at', 'completed_at', s ->> 'completed_at',
               'sla_due_at', s ->> 'due_at') ORDER BY (s ->> 'position')::int)
        FROM jsonb_array_elements(p.payload -> 'stages') s), '[]'::jsonb))
  FROM integration.deal_progress p
  LEFT JOIN integration.bid_shadow b ON b.bid_id = p.bid_id
  WHERE p.client_id = p_client_id AND p.request_id = p_request_id
  ORDER BY p.updated_at DESC LIMIT 1;
$$;

--
-- Name: integration_defer(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_defer(p_id text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  UPDATE integration.outbox
     SET status = 'pending', attempts = greatest(attempts - 1, 0), lease_until = NULL,
         next_attempt_at = now() + interval '1 minute' * (1 + random() * 0.2),
         last_error = 'held: the receiving side has paused this channel'
   WHERE id = p_id AND status = 'sending';
$$;

--
-- Name: integration_enqueue(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_enqueue(p_type text, p_aggregate_id text, p_data jsonb) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.enqueue(p_type, p_aggregate_id, p_data, 'borrower');
$$;

--
-- Name: integration_finish_document_submission(uuid, boolean, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_finish_document_submission(p_submission_id uuid, p_ok boolean, p_upload_id uuid, p_sha256 text, p_error text, p_bank_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE s integration.document_submission%ROWTYPE;
BEGIN
  UPDATE integration.document_submission
     SET status = CASE WHEN p_ok THEN 'completed' ELSE 'failed' END, upload_id = p_upload_id,
         sha256 = p_sha256, error = left(p_error, 500), completed_at = now()
   WHERE id = p_submission_id AND status = 'started'
  RETURNING * INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOC_SUBMISSION_NOT_OPEN'; END IF;
  IF p_ok AND s.source = 'vault' THEN
    INSERT INTO public.client_vault_access_log (document_id, client_id, action, actor_id)
    VALUES (s.vault_document_id, s.client_id, 'share:' || coalesce(p_bank_name, 'bank') || ':' || s.pipeline_id, s.client_id);
  END IF;
END $$;

--
-- Name: integration_mark_delivered(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_mark_delivered(p_id text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.mark_delivered(p_id);
$$;

--
-- Name: integration_mark_failed(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_mark_failed(p_id text, p_error text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.mark_failed(p_id, p_error);
$$;

--
-- Name: integration_market_intelligence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_market_intelligence() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT jsonb_build_object(
    'marketRates', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'product_type', r ->> 'product_code', 'bid_count', (r ->> 'bid_count')::int, 'request_count', (r ->> 'request_count')::int,
        'min_rate_pct', round((r ->> 'min_rate')::numeric * 100, 2), 'max_rate_pct', round((r ->> 'max_rate')::numeric * 100, 2),
        'avg_rate_pct', round((r ->> 'avg_rate')::numeric * 100, 2), 'p25_rate_pct', round((r ->> 'p25_rate')::numeric * 100, 2),
        'p75_rate_pct', round((r ->> 'p75_rate')::numeric * 100, 2)))
      FROM jsonb_array_elements(s.payload -> 'rates') r), '[]'::jsonb),
    'acceptanceIntel', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'product_type', o ->> 'product_code', 'total_acceptances', (o ->> 'total_acceptances')::int,
        'avg_winning_rate_pct', round((o ->> 'avg_winning_rate')::numeric * 100, 2),
        'min_winning_rate_pct', round((o ->> 'min_winning_rate')::numeric * 100, 2),
        'max_winning_rate_pct', round((o ->> 'max_winning_rate')::numeric * 100, 2),
        'avg_winning_amount', (o ->> 'avg_winning_amount')::numeric, 'avg_winning_term_months', (o ->> 'avg_winning_term_months')::int,
        'rate_vs_market_avg_pct', round((o ->> 'rate_vs_market_avg')::numeric * 100, 2)))
      FROM jsonb_array_elements(s.payload -> 'outcomes') o), '[]'::jsonb),
    'competitiveness', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'product_type', c ->> 'product_code', 'active_institutions', (c ->> 'active_institutions')::int,
        'avg_bids_per_request', (c ->> 'avg_bids_per_request')::numeric, 'max_bids_per_request', (c ->> 'max_bids_per_request')::int))
      FROM jsonb_array_elements(s.payload -> 'competitiveness') c), '[]'::jsonb),
    'as_of', s.as_of)
  FROM integration.market_snapshot s WHERE s.id = 1;
$$;

--
-- Name: integration_portfolio_for(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_portfolio_for(p_client_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.pipeline_id, 'request_id', p.request_id, 'bid_id', p.bid_id, 'status', p.payload ->> 'status',
    'deal_amount', (p.payload -> 'deal' ->> 'amount')::numeric, 'deal_rate', (p.payload -> 'deal' ->> 'rate')::numeric,
    'deal_term_months', (p.payload -> 'deal' ->> 'term_months')::int,
    'started_at', p.payload ->> 'started_at', 'completed_at', p.payload ->> 'completed_at',
    'product_label', q.product_type, 'currency', coalesce(b.payload ->> 'currency', 'MUR'),
    'institution_name', b.payload ->> 'institution_name', 'institution_logo_url', b.payload ->> 'institution_logo_url',
    'stages', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'position', (s ->> 'position')::int, 'status', s ->> 'status', 'label', s ->> 'label', 'borrower_label', s ->> 'label',
        'started_at', s ->> 'started_at', 'completed_at', s ->> 'completed_at', 'sla_due_at', s ->> 'due_at',
        'sla_breached', (s ->> 'due_at') IS NOT NULL AND (s ->> 'due_at')::timestamptz < now()
                        AND s ->> 'status' NOT IN ('completed', 'skipped')) ORDER BY (s ->> 'position')::int)
      FROM jsonb_array_elements(p.payload -> 'stages') s), '[]'::jsonb))
    ORDER BY p.payload ->> 'started_at' DESC NULLS LAST), '[]'::jsonb)
  FROM integration.deal_progress p
  JOIN public.requests q ON q.id = p.request_id
  LEFT JOIN integration.bid_shadow b ON b.bid_id = p.bid_id
  WHERE p.client_id = p_client_id;
$$;

--
-- Name: integration_prepare_acceptance(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.prepare_acceptance(p_client, p_request, p_bid);
$$;

--
-- Name: integration_record_inbox(text, text, text, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration'
    AS $$
  SELECT integration.record_inbox(p_event_id, p_type, p_source, p_aggregate_id, p_sequence);
$$;

--
-- Name: integration_send_borrower_message(uuid, uuid, uuid, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_send_borrower_message(p_client_id uuid, p_request_id uuid, p_institution_id uuid, p_template_code text, p_params jsonb, p_body text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'integration'
    AS $$
DECLARE m public.request_messages%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.requests WHERE id = p_request_id AND client_id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_NOT_YOURS'; END IF;
  IF p_body IS NULL OR char_length(btrim(p_body)) = 0 OR char_length(p_body) > 2000 THEN
    RAISE EXCEPTION 'CHAT_BODY_INVALID';
  END IF;
  INSERT INTO public.request_messages (request_id, institution_id, sender_type, sender_id, body, kind, template_code, params)
  VALUES (p_request_id, p_institution_id, 'client', p_client_id, p_body,
          CASE WHEN p_template_code IS NULL THEN 'free' ELSE 'structured' END, p_template_code,
          coalesce(p_params, '{}'::jsonb))
  RETURNING * INTO m;
  PERFORM integration.enqueue('chat.message', m.request_id::text, jsonb_strip_nulls(jsonb_build_object(
    'message_id', m.id, 'request_id', m.request_id, 'institution_id', m.institution_id, 'sender_side', 'borrower',
    'template_code', m.template_code, 'params', m.params, 'body', m.body, 'sent_at', m.created_at)), 'borrower');
  RETURN jsonb_build_object('id', m.id, 'request_id', m.request_id, 'institution_id', m.institution_id,
    'sender_type', m.sender_type, 'body', m.body, 'kind', m.kind, 'template_code', m.template_code,
    'params', m.params, 'created_at', m.created_at);
END $$;

--
-- Name: integration_start_document_submission(uuid, uuid, uuid, text, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_start_document_submission(p_client_id uuid, p_pipeline_id uuid, p_requirement_id uuid, p_source text, p_vault_document_id uuid, p_document_date date) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'integration', 'public'
    AS $$
DECLARE v_id uuid; v_item jsonb;
BEGIN
  SELECT e INTO v_item FROM integration.deal_documents s, jsonb_array_elements(s.documents) e
   WHERE s.pipeline_id = p_pipeline_id AND s.client_id = p_client_id
     AND e ->> 'requirement_id' = p_requirement_id::text;
  IF v_item IS NULL THEN RAISE EXCEPTION 'DOC_NOT_REQUESTED'; END IF;
  IF v_item ->> 'provided_by' <> 'borrower' THEN RAISE EXCEPTION 'DOC_NOT_FROM_BORROWER'; END IF;
  IF v_item ->> 'status' IN ('verified', 'waived') THEN RAISE EXCEPTION 'DOC_ALREADY_DONE'; END IF;
  IF p_source = 'vault' THEN
    PERFORM 1 FROM public.client_vault_document v
     WHERE v.id = p_vault_document_id AND v.client_id = p_client_id AND v.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'DOC_VAULT_NOT_FOUND'; END IF;
    IF p_document_date IS NULL THEN RAISE EXCEPTION 'DOC_VAULT_UNDATED'; END IF;
    IF (v_item ->> 'max_age_days') IS NOT NULL
       AND p_document_date < current_date - (v_item ->> 'max_age_days')::int THEN
      RAISE EXCEPTION 'DOC_VAULT_TOO_OLD';
    END IF;
  END IF;
  INSERT INTO integration.document_submission
      (pipeline_id, requirement_id, client_id, source, vault_document_id, document_date)
  VALUES (p_pipeline_id, p_requirement_id, p_client_id, p_source, p_vault_document_id, p_document_date)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

--
-- Name: is_couple_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_couple_member(p_couple_id uuid, p_client_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.couple_link
    where id = p_couple_id and (client_a_id = p_client_id or client_b_id = p_client_id)
  );
$$;

--
-- Name: is_ficium_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ficium_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') = 'ficium_admin', false);
$$;

--
-- Name: is_institution_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_institution_member(p_institution_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists(select 1 from institution_users where user_id = auth.uid() and institution_id = p_institution_id);
$$;

--
-- Name: is_request_participant(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_request_participant(p_request_id uuid, p_client_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.request_participant where request_id = p_request_id and client_id = p_client_id);
$$;

--
-- Name: kyc_record_outcome(uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.kyc_record_outcome(p_client uuid, p_status text, p_submission jsonb, p_profile jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE sid uuid;
BEGIN
  IF p_status NOT IN ('verified', 'pending_review', 'rejected') THEN
    RAISE EXCEPTION 'invalid KYC status %', p_status USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client) THEN
    RAISE EXCEPTION 'unknown client' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.kyc_submissions (
    client_id, status, provider, reference_id, risk_score, flags, details,
    mrz_valid, face_match_score, name_match_score, document_expired,
    document_type, document_number, id_document_path, selfie_path,
    proof_of_address_path, permit_path, nationality, residence_status,
    same_nationality_residence)
  VALUES (
    p_client, p_status, p_submission->>'provider', p_submission->>'reference_id',
    (p_submission->>'risk_score')::int,
    coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(p_submission->'flags', '[]'))), '{}'),
    p_submission->'details',
    (p_submission->>'mrz_valid')::boolean, (p_submission->>'face_match_score')::numeric,
    (p_submission->>'name_match_score')::int, (p_submission->>'document_expired')::boolean,
    p_submission->>'document_type', p_submission->>'document_number',
    p_submission->>'id_document_path', p_submission->>'selfie_path',
    p_submission->>'proof_of_address_path', p_submission->>'permit_path',
    p_submission->>'nationality', p_submission->>'residence_status',
    coalesce((p_submission->>'same_nationality_residence')::boolean, true))
  RETURNING id INTO sid;

  IF p_status <> 'rejected' THEN   -- a rejection is on record; the borrower may retry
    UPDATE public.clients SET
      kyc_status       = p_status::public.kyc_status,
      date_of_birth    = coalesce((p_profile->>'date_of_birth')::date, date_of_birth),
      address_line_1   = coalesce(p_profile->>'address_line_1', address_line_1),
      address_line_2   = nullif(p_profile->>'address_line_2', ''),
      city             = coalesce(p_profile->>'city', city),
      postal_code      = nullif(p_profile->>'postal_code', ''),
      country          = coalesce(p_profile->>'country', country),
      nationality      = coalesce(nullif(p_profile->>'nationality', ''), nationality),
      residence_status = coalesce(nullif(p_profile->>'residence_status', ''), residence_status)
    WHERE id = p_client;
  END IF;
  RETURN sid;
END $$;

--
-- Name: kyc_server_context(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.kyc_server_context(p_client uuid, p_document_number text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT jsonb_build_object(
    'full_name', (SELECT c.full_name FROM public.clients c WHERE c.id = p_client),
    'attempts_24h', (SELECT count(*) FROM public.kyc_submissions s
                      WHERE s.client_id = p_client AND s.submitted_at >= now() - interval '24 hours'),
    'document_reused', CASE WHEN coalesce(p_document_number, '') = '' THEN false ELSE EXISTS (
        SELECT 1 FROM public.kyc_submissions s
         WHERE s.document_number = p_document_number AND s.client_id <> p_client) END)
$$;

--
-- Name: normalize_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_name(p_name text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
  select nullif(trim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z ]+', ' ', 'g')), '')
$$;

--
-- Name: notify_expiring_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_expiring_requests() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
declare
  v_url    text;
  v_secret text;
  v_row    record;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'integration_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'app_service_secret';
  if v_url is null or v_secret is null then
    raise warning 'notify_expiring_requests: integration_dispatch_url or app_service_secret missing; nothing sent';
    return;
  end if;

  for v_row in
    select r.id, r.client_id, r.product_type, r.decision_deadline, r.amount
      from public.requests r
     where r.status = 'open'
       and r.decision_deadline between now() + interval '23 hours'
                                   and now() + interval '25 hours'
       and not exists (
         select 1 from public.notifications n
          where n.user_id = r.client_id
            and n.kind    = 'request_expiring'
            and n.metadata->>'request_id' = r.id::text)
  loop
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'X-Service-Secret', v_secret),
      body    := jsonb_build_object(
        'action', 'request-expiring', 'request_id', v_row.id, 'client_id', v_row.client_id,
        'product_type', v_row.product_type, 'amount', v_row.amount, 'deadline', v_row.decision_deadline),
      timeout_milliseconds := 10000);
  end loop;
end; $$;

--
-- Name: on_bid_accepted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_bid_accepted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_losing record;
begin
  update institution_bids set status = 'accepted' where id = new.bid_id;
  update institution_bids set status = 'rejected' where request_id = new.request_id and id != new.bid_id and status = 'submitted';
  update client_requests set status = 'accepted', accepted_bid_id = new.bid_id, updated_at = now() where id = new.request_id;
  perform enqueue_webhook_events(new.institution_id, 'bid.accepted',
    jsonb_build_object('event','bid.accepted','bid_id',new.bid_id,'request_id',new.request_id,'accepted_at',new.accepted_at));
  for v_losing in select institution_id from institution_bids where request_id = new.request_id and id != new.bid_id and status = 'rejected'
  loop
    perform enqueue_webhook_events(v_losing.institution_id,'bid.rejected',jsonb_build_object('event','bid.rejected','request_id',new.request_id));
  end loop;
  return new;
end; $$;

--
-- Name: on_bid_submitted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_bid_submitted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update client_requests set status = 'bidding', updated_at = now() where id = new.request_id and status = 'open';
  return new;
end; $$;

--
-- Name: on_new_client_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_new_client_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_inst record;
begin
  update client_requests set bid_window_closes_at = now() + interval '1 minute' *
    coalesce((select min(bid_window_minutes) from institution_sla_config where product_type = new.product_type), 240)
  where id = new.id;
  for v_inst in select id from institutions where approved = true and onboarding_stage = 'approved' and suspended_at is null and modules ? 'marketplace'
  loop
    perform enqueue_webhook_events(v_inst.id,'request.new',
      jsonb_build_object('event','request.new','request_id',new.id,'product_type',new.product_type,
        'amount',new.amount,'currency',new.currency,'term_months',new.term_months));
  end loop;
  return new;
end; $$;

--
-- Name: reject_request(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_request(p_request_id uuid, p_institution_id uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_status    request_status;
  v_client_id uuid;
BEGIN
  SELECT status, client_id INTO v_status, v_client_id
  FROM public.requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_open', 'status', v_status);
  END IF;

  UPDATE public.requests
  SET status = 'rejected', updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.request_decisions (request_id, institution_id, decision, reason)
  VALUES (p_request_id, p_institution_id, 'rejected', p_reason);

  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (
    v_client_id,
    'request_rejected',
    'A provider declined your request',
    COALESCE(p_reason, 'The institution reviewing your request was unable to proceed with it. You can post a similar request to reach other providers.'),
    '/requests',
    jsonb_build_object('request_id', p_request_id, 'institution_id', p_institution_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

--
-- Name: relist_request(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.relist_request(p_client_id uuid, p_request_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE r public.requests%ROWTYPE; v_new uuid; v_deadline timestamptz := now() + interval '14 days';
BEGIN
  SELECT * INTO r FROM public.requests WHERE id = p_request_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RELIST_NOT_FOUND'; END IF;

  IF r.status = 'deal_declined' THEN
    IF EXISTS (SELECT 1 FROM public.requests WHERE relisted_from = r.id) THEN
      RAISE EXCEPTION 'RELIST_ALREADY_DONE';
    END IF;
    IF EXISTS (SELECT 1 FROM public.request_participant WHERE request_id = r.id AND NOT is_initiator) THEN
      RAISE EXCEPTION 'RELIST_JOINT_NOT_SUPPORTED';
    END IF;
    INSERT INTO public.requests (client_id, product_type, amount, purpose, preferred_term_months, max_rate,
                                 decision_deadline, status, anonymized_brief, allocation_mode, product_answers, relisted_from)
    VALUES (r.client_id, r.product_type, r.amount, r.purpose, r.preferred_term_months, r.max_rate,
            v_deadline, 'open', r.anonymized_brief, r.allocation_mode, r.product_answers, r.id)
    RETURNING id INTO v_new;
    INSERT INTO public.request_allocations (request_id, product_type, amount, sort_order)
    SELECT v_new, a.product_type, a.amount, a.sort_order FROM public.request_allocations a WHERE a.request_id = r.id;
    INSERT INTO public.request_participant (request_id, client_id, role, liability_type, ownership_bps, consent_state,
                                            is_initiator, consented_at)
    SELECT v_new, p.client_id, p.role, p.liability_type, p.ownership_bps, p.consent_state, p.is_initiator, p.consented_at
      FROM public.request_participant p WHERE p.request_id = r.id AND p.is_initiator;
    RETURN jsonb_build_object('request_id', v_new, 'relisted_from', r.id, 'status', 'open', 'decision_deadline', v_deadline);
  END IF;

  IF r.status NOT IN ('expired', 'rejected') THEN RAISE EXCEPTION 'RELIST_NOT_ALLOWED'; END IF;
  UPDATE public.requests SET decision_deadline = v_deadline, updated_at = now() WHERE id = r.id;
  UPDATE public.requests SET status = 'open', updated_at = now() WHERE id = r.id;
  RETURN jsonb_build_object('request_id', r.id, 'status', 'open', 'decision_deadline', v_deadline);
END $$;

--
-- Name: replace_client_loans(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.replace_client_loans(p_loans jsonb) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_loans IS NULL OR jsonb_typeof(p_loans) <> 'array' THEN
    RAISE EXCEPTION 'p_loans must be a JSON array' USING ERRCODE = '22023';
  END IF;

  -- A person does not have more than a few dozen loans; this only stops abuse.
  IF jsonb_array_length(p_loans) > 50 THEN
    RAISE EXCEPTION 'too many loans (max 50)' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.client_loan_details WHERE client_id = v_uid;

  INSERT INTO public.client_loan_details
    (client_id, loan_type, outstanding_amount, monthly_repayment, bank_name, remaining_months)
  SELECT v_uid,
         x ->> 'loan_type',
         (x ->> 'outstanding_amount')::numeric,
         (x ->> 'monthly_repayment')::numeric,
         x ->> 'bank_name',
         (x ->> 'remaining_months')::integer
  FROM jsonb_array_elements(p_loans) AS x;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

--
-- Name: report_app_client(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.report_app_client(p_platform text, p_version text, p_build text DEFAULT ''::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
END $_$;

--
-- Name: report_app_error(text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.report_app_error(p_platform text, p_version text, p_kind text, p_fingerprint text, p_message text, p_location text DEFAULT ''::text, p_route text DEFAULT ''::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'utc')::date;
  v_msg text := public._scrub_error_text(p_message, 300);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_platform IS NULL OR p_platform NOT IN ('ios', 'android')
     OR p_version IS NULL OR p_version !~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'
     OR p_kind IS NULL OR p_kind NOT IN ('error', 'rejection', 'render')
     OR p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{16}$'
     OR v_msg = '' THEN
    RAISE EXCEPTION 'invalid app error report' USING ERRCODE = '22023';
  END IF;
  -- Borrowers only. Other signed-in roles have no row in clients and are ignored.
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_uid) THEN
    RETURN;
  END IF;
  -- At most 20 distinct errors per borrower per day; repeats of a known one only raise its count.
  IF NOT EXISTS (SELECT 1 FROM public.app_error_report
                  WHERE day = v_day AND client_id = v_uid AND platform = p_platform AND fingerprint = p_fingerprint)
     AND (SELECT count(*) FROM public.app_error_report WHERE day = v_day AND client_id = v_uid) >= 20 THEN
    RETURN;
  END IF;

  INSERT INTO public.app_error_report AS e (day, client_id, platform, app_version, fingerprint, kind, message, location, route)
  VALUES (v_day, v_uid, p_platform, p_version, p_fingerprint, p_kind, v_msg,
          public._scrub_error_text(p_location, 200), public._scrub_error_text(p_route, 120))
  ON CONFLICT (day, client_id, platform, fingerprint) DO UPDATE
     SET occurrences = least(e.occurrences + 1, 1000), last_seen_at = now(), app_version = EXCLUDED.app_version;
END $_$;

--
-- Name: request_chat_is_open(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.bid_acceptances ba WHERE ba.request_id = p_request_id)
      OR public.request_chat_is_winner(p_request_id, p_institution_id);
$$;

--
-- Name: FUNCTION request_chat_is_open(p_request_id uuid, p_institution_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid) IS 'Whether new messages may be written on this thread. Losing threads become read-only at acceptance rather than being deleted, so the record survives for dispute/audit.';

--
-- Name: request_chat_is_winner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_chat_is_winner(p_request_id uuid, p_institution_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bid_acceptances ba
     WHERE ba.request_id = p_request_id AND ba.institution_id = p_institution_id);
$$;

--
-- Name: request_messages_enforce(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_messages_enforce() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tpl public.request_message_template%ROWTYPE;
BEGIN
  IF NEW.institution_id IS NULL THEN
    RAISE EXCEPTION 'request_messages.institution_id is required — chat is scoped per lender';
  END IF;
  IF NOT public.request_chat_is_open(NEW.request_id, NEW.institution_id) THEN
    RAISE EXCEPTION 'This conversation is closed: another lender''s offer was accepted';
  END IF;
  IF NEW.kind = 'free' THEN
    IF NOT public.request_chat_is_winner(NEW.request_id, NEW.institution_id) THEN
      RAISE EXCEPTION 'Free-text messages are only available after this lender''s offer is accepted; use a structured message';
    END IF;
  ELSE
    SELECT * INTO v_tpl FROM public.request_message_template
     WHERE code = NEW.template_code AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown or inactive message template: %', NEW.template_code;
    END IF;
    IF v_tpl.sender_type <> NEW.sender_type THEN
      RAISE EXCEPTION 'Template % is not available to sender_type %', NEW.template_code, NEW.sender_type;
    END IF;
  END IF;
  RETURN NEW;
END $$;

--
-- Name: revoke_request_invitation(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_request_invitation(p_invitation_id uuid, p_inviter_client_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_inv public.request_invitation;
begin
  select * into v_inv from public.request_invitation where id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if v_inv.inviter_client_id <> p_inviter_client_id then raise exception 'not_authorized'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  update public.request_invitation set status = 'revoked', revoked_at = now(), updated_at = now() where id = v_inv.id;
end $$;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

--
-- Name: set_reporting_currency(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_reporting_currency(p_currency text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'finance'
    AS $$
begin
  if p_currency not in ('MUR','USD','EUR','GBP','ZAR') then
    raise exception 'Unsupported currency: %', p_currency;
  end if;

  insert into public.client_financial_snapshot (client_id, currency)
  values (auth.uid(), p_currency)
  on conflict (client_id) do update set currency = excluded.currency;

  perform finance.recompute_snapshot(auth.uid());
end;
$$;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;

--
-- Name: set_vault_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_vault_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

--
-- Name: submit_couple_relationship_document(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_couple_relationship_document(p_couple_link_id uuid, p_vault_document_id uuid, p_uploader_client_id uuid, p_extracted_text text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_couple public.couple_link;
  v_name_a text; v_name_b text; v_norm_text text;
  v_matched_a boolean; v_matched_b boolean;
  v_score_a numeric; v_score_b numeric;
  v_match_status public.relationship_match_status;
  v_verification public.relationship_doc_status;
  v_reject text := null;
  v_id uuid;
begin
  if not public.is_couple_member(p_couple_link_id, p_uploader_client_id) then
    raise exception 'not_authorized';
  end if;

  select * into v_couple from public.couple_link where id = p_couple_link_id;
  select full_name into v_name_a from public.clients where id = v_couple.client_a_id;
  select full_name into v_name_b from public.clients where id = v_couple.client_b_id;

  v_norm_text := public.normalize_name(p_extracted_text);
  v_matched_a := v_norm_text ilike '%' || public.normalize_name(v_name_a) || '%';
  v_matched_b := v_norm_text ilike '%' || public.normalize_name(v_name_b) || '%';
  v_score_a := similarity(v_norm_text, public.normalize_name(v_name_a));
  v_score_b := similarity(v_norm_text, public.normalize_name(v_name_b));

  if v_matched_a and v_matched_b then
    v_match_status := 'both_matched'; v_verification := 'verified';
  elsif v_matched_a or v_matched_b then
    v_match_status := 'partial_match'; v_verification := 'rejected';
    v_reject := 'only one partner name was found on the document';
  else
    v_match_status := 'no_match'; v_verification := 'rejected';
    v_reject := 'neither partner name was found on the document';
  end if;

  insert into public.couple_relationship_document (
    couple_link_id, vault_document_id, uploaded_by_client_id, extracted_text,
    name_a_matched, name_b_matched, match_score_a, match_score_b,
    match_status, verification_status, reject_reason, reviewed_at
  ) values (
    p_couple_link_id, p_vault_document_id, p_uploader_client_id, p_extracted_text,
    v_matched_a, v_matched_b, v_score_a, v_score_b,
    v_match_status, v_verification, v_reject,
    case when v_verification = 'verified' then now() else null end
  )
  on conflict (couple_link_id) do update set
    vault_document_id = excluded.vault_document_id,
    uploaded_by_client_id = excluded.uploaded_by_client_id,
    extracted_text = excluded.extracted_text,
    name_a_matched = excluded.name_a_matched,
    name_b_matched = excluded.name_b_matched,
    match_score_a = excluded.match_score_a,
    match_score_b = excluded.match_score_b,
    match_status = excluded.match_status,
    verification_status = excluded.verification_status,
    reject_reason = excluded.reject_reason,
    reviewed_by = null,
    reviewed_at = excluded.reviewed_at,
    updated_at = now()
  returning id into v_id;

  if v_verification = 'verified' then
    update public.couple_link set status = 'verified', verified_at = now(), updated_at = now()
      where id = p_couple_link_id;
  end if;

  insert into public.notifications (user_id, kind, title, link, metadata)
  select c, case when v_verification = 'verified' then 'couple_verified' else 'couple_verification_rejected' end,
         case when v_verification = 'verified' then 'Your couple is verified' else 'Marriage certificate needs attention' end,
         '/couple',
         jsonb_build_object('couple_link_id', p_couple_link_id, 'verification_status', v_verification, 'reject_reason', v_reject)
  from unnest(array[v_couple.client_a_id, v_couple.client_b_id]) as c;

  return v_id;
end $$;

--
-- Name: touch_client_dossier(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_client_dossier(p_client uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF pg_trigger_depth() > 8 THEN RETURN; END IF;
  UPDATE public.client_dossier SET updated_at = now() WHERE client_id = p_client;
END $$;

--
-- Name: touch_client_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_client_snapshot(p_client uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF pg_trigger_depth() > 8 THEN RETURN; END IF;
  UPDATE public.client_financial_snapshot SET updated_at = now() WHERE client_id = p_client;
END $$;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

--
-- Name: trg_audit_bid_accepted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_audit_bid_accepted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_after, outcome
  ) VALUES (
    NEW.client_id, NEW.client_id, 'client_user',
    'bid.accept', 'Bid accepted by client',
    'bid_acceptances', NEW.id,
    jsonb_build_object('bid_id', NEW.bid_id, 'request_id', NEW.request_id),
    'success'
  );
  RETURN NEW;
END; $$;

--
-- Name: trg_audit_institution_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_audit_institution_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Approval change
  IF OLD.approved IS DISTINCT FROM NEW.approved THEN
    INSERT INTO admin.audit_events (
      institution_id, actor_id, actor_type,
      action_category, event_label,
      resource_type, resource_id,
      state_before, state_after, outcome
    ) VALUES (
      NEW.id, auth.uid(), 'ficium_admin',
      CASE WHEN NEW.approved THEN 'institution.approve' ELSE 'institution.suspend' END,
      CASE WHEN NEW.approved THEN 'Institution approved' ELSE 'Institution suspended' END,
      'institutions', NEW.id,
      jsonb_build_object('approved', OLD.approved, 'onboarding_stage', OLD.onboarding_stage),
      jsonb_build_object('approved', NEW.approved, 'onboarding_stage', NEW.onboarding_stage),
      'success'
    );
  END IF;

  -- Suspension change (suspended_at)
  IF OLD.suspended_at IS DISTINCT FROM NEW.suspended_at THEN
    INSERT INTO admin.audit_events (
      institution_id, actor_id, actor_type,
      action_category, event_label,
      resource_type, resource_id,
      state_before, state_after, outcome
    ) VALUES (
      NEW.id, auth.uid(), 'ficium_admin',
      'institution.suspend',
      CASE WHEN NEW.suspended_at IS NOT NULL THEN 'Institution suspended' ELSE 'Institution unsuspended' END,
      'institutions', NEW.id,
      jsonb_build_object('suspended_at', OLD.suspended_at),
      jsonb_build_object('suspended_at', NEW.suspended_at),
      'success'
    );
  END IF;

  -- Modules change
  IF OLD.modules IS DISTINCT FROM NEW.modules THEN
    INSERT INTO admin.audit_events (
      institution_id, actor_id, actor_type,
      action_category, event_label,
      resource_type, resource_id,
      state_before, state_after, outcome
    ) VALUES (
      NEW.id, auth.uid(), 'ficium_admin',
      'institution.modules_update', 'Institution modules updated',
      'institutions', NEW.id,
      jsonb_build_object('modules', OLD.modules),
      jsonb_build_object('modules', NEW.modules),
      'success'
    );
  END IF;

  RETURN NEW;
END; $$;

--
-- Name: trg_audit_kyc_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_audit_kyc_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    INSERT INTO public.audit_events (
      client_id, actor_id, actor_type, action_category, event_label,
      resource_type, resource_id, state_before, state_after, outcome
    ) VALUES (
      NEW.id, NEW.id, 'client_user', 'kyc.status_change',
      'KYC status changed: ' || OLD.kyc_status || ' → ' || NEW.kyc_status,
      'clients', NEW.id,
      jsonb_build_object('kyc_status', OLD.kyc_status),
      jsonb_build_object('kyc_status', NEW.kyc_status),
      'success'
    );
  END IF;
  RETURN NEW;
END; $$;

--
-- Name: trg_audit_request_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_audit_request_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_after, outcome
  ) VALUES (
    NEW.client_id, NEW.client_id, 'client_user',
    'request.submit', 'Financing request submitted',
    'requests', NEW.id,
    jsonb_build_object(
      'product_type', NEW.product_type,
      'amount', NEW.amount,
      'status', NEW.status
    ),
    'success'
  );
  RETURN NEW;
END; $$;

--
-- Name: trg_audit_row_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_audit_row_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
declare
  v_row_new  jsonb := null;
  v_row_old  jsonb := null;
  v_inst_id  uuid  := null;
  v_res_id   uuid  := null;
  v_event    text;
begin
  -- Cast entire record to jsonb — never reference typed columns directly
  if TG_OP = 'INSERT' then
    v_row_new := row_to_json(new)::jsonb;
    v_res_id  := (v_row_new->>'id')::uuid;
    v_event   := TG_TABLE_NAME || '.created';
  elsif TG_OP = 'UPDATE' then
    v_row_old := row_to_json(old)::jsonb;
    v_row_new := row_to_json(new)::jsonb;
    v_res_id  := (v_row_new->>'id')::uuid;
    v_event   := TG_TABLE_NAME || '.updated';
  elsif TG_OP = 'DELETE' then
    v_row_old := row_to_json(old)::jsonb;
    v_res_id  := (v_row_old->>'id')::uuid;
    v_event   := TG_TABLE_NAME || '.deleted';
  end if;

  -- Resolve institution_id from jsonb — safe on all tables.
  -- Tables with direct institution_id: institution_users, institution_webhooks,
  --   institution_api_keys, institution_sla_config, institution_bids,
  --   bid_acceptances, webhook_events, pending_actions, audit_events.
  -- Tables without it: institutions (use id), client_requests (no inst link).
  v_inst_id := coalesce(
    (coalesce(v_row_new, v_row_old)->>'institution_id')::uuid,
    case TG_TABLE_NAME
      when 'institutions' then (coalesce(v_row_new, v_row_old)->>'id')::uuid
      else null
    end
  );

  insert into audit_logs (
    actor_id, actor_type, institution_id,
    event_type, resource_id, resource_type, diff
  ) values (
    auth.uid(),
    case when auth.uid() is null then 'system'::actor_type
         else 'institution_user'::actor_type end,
    v_inst_id,
    v_event,
    v_res_id,
    TG_TABLE_NAME,
    jsonb_build_object('before', v_row_old, 'after', v_row_new)
  );

  return coalesce(new, old);
end; $$;

--
-- Name: trg_dossier_derive(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_dossier_derive() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_repay numeric; v_loans int;
  v_nw numeric;    v_ta numeric;
  v_pep boolean;   v_bkr boolean; v_blk boolean; v_mis boolean; v_leg boolean;
  v_rev numeric;
  s jsonb;
BEGIN
  SELECT coalesce(sum(monthly_repayment), 0), count(*)
    INTO v_repay, v_loans
    FROM public.client_loan_details WHERE client_id = NEW.client_id;

  SELECT net_worth, total_assets INTO v_nw, v_ta
    FROM public.client_financial_snapshot WHERE client_id = NEW.client_id;

  SELECT is_pep, bankruptcy, blacklisted, missed_repayments, legal_disputes
    INTO v_pep, v_bkr, v_blk, v_mis, v_leg
    FROM public.compliance_details WHERE user_id = NEW.client_id;

  SELECT annual_revenue INTO v_rev
    FROM public.employment_details WHERE user_id = NEW.client_id;

  s := public.compute_client_scores(jsonb_build_object(
    'income',            coalesce(NEW.monthly_income, 0) + coalesce(NEW.additional_income, 0),
    'employment_status', NEW.employment_status,
    'net_worth',         v_nw,
    'total_assets',      v_ta,
    'monthly_repayment', v_repay,
    'annual_revenue',    v_rev,
    'is_pep',            v_pep,
    'bankruptcy',        v_bkr,
    'blacklisted',       v_blk,
    'missed_repayments', v_mis,
    'legal_disputes',    v_leg));

  NEW.health_score        := (s ->> 'health_score')::int;
  NEW.risk_score          := (s ->> 'risk_score')::int;
  NEW.affordability_score := (s ->> 'affordability_score')::int;
  NEW.edd_required        := (s ->> 'edd_required')::boolean;
  NEW.has_existing_loans  := v_loans > 0;
  NEW.total_net_worth     := v_nw;
  RETURN NEW;
END $$;

--
-- Name: trg_dossier_propagate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_dossier_propagate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.monthly_income    IS DISTINCT FROM OLD.monthly_income
     OR NEW.additional_income IS DISTINCT FROM OLD.additional_income THEN
    PERFORM public.touch_client_snapshot(NEW.client_id);
  END IF;
  RETURN NULL;
END $$;

--
-- Name: trg_loans_propagate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_loans_propagate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_client uuid := coalesce(NEW.client_id, OLD.client_id);
BEGIN
  PERFORM public.touch_client_snapshot(v_client);
  PERFORM public.touch_client_dossier(v_client);
  RETURN NULL;
END $$;

--
-- Name: trg_recompute_goal_readiness(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_recompute_goal_readiness() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_goal_id uuid;
BEGIN
  -- For every goal that references this client, recompute
  FOR v_goal_id IN
    SELECT id FROM public.client_goals WHERE client_id = NEW.client_id
  LOOP
    PERFORM public.compute_goal_readiness(v_goal_id);
  END LOOP;
  RETURN NEW;
END;
$$;

--
-- Name: trg_snapshot_derive(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_snapshot_derive() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'finance', 'pg_temp'
    AS $$
DECLARE
  v_inc numeric;
BEGIN
  SELECT coalesce(monthly_income, 0) + coalesce(additional_income, 0) INTO v_inc
    FROM public.client_dossier WHERE client_id = NEW.client_id;
  IF FOUND THEN NEW.monthly_income := v_inc; END IF;

  SELECT coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'mortgage'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'personal'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'credit_card'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'vehicle'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type NOT IN ('mortgage','personal','credit_card','vehicle')), 0),
         coalesce(sum(monthly_repayment), 0)
    INTO NEW.mortgage_balance, NEW.personal_loan_balance, NEW.credit_card_balance,
         NEW.vehicle_loan_balance, NEW.other_liabilities, NEW.monthly_loan_payments
    FROM public.client_loan_details WHERE client_id = NEW.client_id;

  IF EXISTS (SELECT 1 FROM finance.accounts WHERE user_id = NEW.client_id) THEN
    SELECT coalesce(sum(finance.convert_amount(balance, currency, NEW.currency))
                    FILTER (WHERE account_type IN ('savings', 'current')), 0),
           coalesce(sum(finance.convert_amount(balance, currency, NEW.currency))
                    FILTER (WHERE account_type = 'fixed_deposit'), 0)
      INTO NEW.cash_savings, NEW.fixed_deposits
      FROM finance.accounts WHERE user_id = NEW.client_id;
  END IF;

  IF EXISTS (SELECT 1 FROM finance.holdings WHERE user_id = NEW.client_id) THEN
    SELECT coalesce(sum(finance.convert_amount(h.quantity * coalesce(p.price, 0),
                                               coalesce(p.currency, h.currency), NEW.currency)), 0)
      INTO NEW.investments_value
      FROM finance.holdings h
      LEFT JOIN finance.holding_prices p
        ON p.symbol = h.symbol AND p.exchange = coalesce(h.exchange, '')
     WHERE h.user_id = NEW.client_id;
  END IF;

  RETURN NEW;
END $$;

--
-- Name: trg_snapshot_propagate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_snapshot_propagate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.net_worth    IS DISTINCT FROM OLD.net_worth
     OR NEW.total_assets IS DISTINCT FROM OLD.total_assets THEN
    PERFORM public.touch_client_dossier(NEW.client_id);
  END IF;
  RETURN NULL;
END $$;

--
-- Name: trg_user_inputs_propagate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_user_inputs_propagate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.touch_client_dossier(coalesce(NEW.user_id, OLD.user_id));
  RETURN NULL;
END $$;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN new.updated_at = NOW(); RETURN new; END; $$;

--
-- Name: verify_market_refresh_secret(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_market_refresh_secret(p_secret text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select p_secret is not null and length(p_secret) = 64 and exists (
    select 1 from vault.decrypted_secrets
     where name = 'market_refresh_cron_secret' and decrypted_secret = p_secret);
$$;

--
-- Name: write_audit(uuid, uuid, uuid, public.actor_type, text, inet, public.action_category_type, text, text, uuid, jsonb, jsonb, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.write_audit(p_institution_id uuid, p_pending_action_id uuid, p_actor_id uuid, p_actor_type public.actor_type, p_actor_role text, p_actor_ip inet, p_action_category public.action_category_type, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text DEFAULT 'success'::text, p_outcome_note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
    AS $$
declare v_id uuid;
begin
  insert into audit_events (
    institution_id, pending_action_id, actor_id, actor_type, actor_role, actor_ip,
    action_category, event_label, resource_type, resource_id,
    state_before, state_after, outcome, outcome_note
  ) values (
    p_institution_id, p_pending_action_id, p_actor_id, p_actor_type, p_actor_role, p_actor_ip,
    p_action_category, p_event_label, p_resource_type, p_resource_id,
    p_state_before, p_state_after, p_outcome, p_outcome_note
  ) returning id into v_id;

  insert into audit_logs (actor_id, actor_type, institution_id, event_type, resource_id, resource_type, diff, ip_address)
  values (p_actor_id, p_actor_type, p_institution_id, p_event_label, p_resource_id, p_resource_type,
    jsonb_build_object('before', p_state_before, 'after', p_state_after,
      'outcome', p_outcome, 'pending_action_id', p_pending_action_id, 'actor_role', p_actor_role),
    p_actor_ip);
  return v_id;
end; $$;

--
-- Name: write_client_audit(uuid, text, text, text, uuid, jsonb, jsonb, text, text, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.write_client_audit(p_client_id uuid, p_action_category text, p_event_label text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_state_before jsonb DEFAULT NULL::jsonb, p_state_after jsonb DEFAULT NULL::jsonb, p_outcome text DEFAULT 'success'::text, p_outcome_note text DEFAULT NULL::text, p_actor_ip inet DEFAULT NULL::inet, p_actor_device text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_client_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'write_client_audit: callers may only write their own audit events'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, actor_role,
    actor_ip, actor_device, action_category, event_label,
    resource_type, resource_id, state_before, state_after,
    outcome, outcome_note
  ) VALUES (
    p_client_id, auth.uid(), 'client_user', 'client',
    p_actor_ip, p_actor_device, p_action_category, p_event_label,
    p_resource_type, p_resource_id, p_state_before, p_state_after,
    p_outcome, p_outcome_note
  ) RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END; $$;

--
-- Name: dispatch(uuid); Type: FUNCTION; Schema: vault_extract; Owner: -
--

CREATE FUNCTION vault_extract.dispatch(p_document_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'vault_extract', 'public', 'extensions', 'vault'
    AS $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'integration_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'app_service_secret';
  if v_url is null or v_secret is null then
    raise warning 'vault_extract.dispatch: integration_dispatch_url or app_service_secret missing; skipping';
    return;
  end if;

  update public.client_vault_document
     set extract_status = 'processing', updated_at = now()
   where id = p_document_id;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Service-Secret', v_secret),
    body    := jsonb_build_object('action', 'vault-extract', 'document_id', p_document_id),
    timeout_milliseconds := 25000);
end; $$;

--
-- Name: on_document_upload(); Type: FUNCTION; Schema: vault_extract; Owner: -
--

CREATE FUNCTION vault_extract.on_document_upload() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'vault_extract', 'public'
    AS $$
BEGIN
  BEGIN
    PERFORM vault_extract.dispatch(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vault_extract dispatch failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

--
-- Name: admin_users; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.admin_users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'staff'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE admin_users; Type: COMMENT; Schema: admin; Owner: -
--

COMMENT ON TABLE admin.admin_users IS 'Ficium platform staff. Maps auth.users to admin roles.';

--
-- Name: api_channel_policy; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.api_channel_policy (
    channel text NOT NULL,
    state text NOT NULL,
    version bigint NOT NULL,
    reason text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_channel_policy_channel_check CHECK ((channel ~ '^[a-z][a-z0-9_.]{2,59}$'::text)),
    CONSTRAINT api_channel_policy_reason_check CHECK (((reason IS NULL) OR (length(reason) <= 2000))),
    CONSTRAINT api_channel_policy_state_check CHECK ((state = ANY (ARRAY['enabled'::text, 'paused'::text]))),
    CONSTRAINT api_channel_policy_version_check CHECK ((version >= 1))
);

--
-- Name: TABLE api_channel_policy; Type: COMMENT; Schema: admin; Owner: -
--

COMMENT ON TABLE admin.api_channel_policy IS 'Pause state per API channel. Written only by admin-sync (api.channel_policy_changed). No row = enabled, version 0.';

--
-- Name: api_channel_status; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.api_channel_status (
    channel text NOT NULL,
    last_ok_at timestamp with time zone,
    last_error_at timestamp with time zone,
    last_error text,
    CONSTRAINT api_channel_status_channel_check CHECK ((channel ~ '^[a-z][a-z0-9_.]{2,59}$'::text)),
    CONSTRAINT api_channel_status_last_error_check CHECK (((last_error IS NULL) OR (length(last_error) <= 300)))
);

--
-- Name: api_traffic_hour; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.api_traffic_hour (
    channel text NOT NULL,
    hour timestamp with time zone NOT NULL,
    total bigint DEFAULT 0 NOT NULL,
    ok bigint DEFAULT 0 NOT NULL,
    client_errors bigint DEFAULT 0 NOT NULL,
    server_errors bigint DEFAULT 0 NOT NULL,
    network_errors bigint DEFAULT 0 NOT NULL,
    blocked bigint DEFAULT 0 NOT NULL,
    lat_b0 bigint DEFAULT 0 NOT NULL,
    lat_b1 bigint DEFAULT 0 NOT NULL,
    lat_b2 bigint DEFAULT 0 NOT NULL,
    lat_b3 bigint DEFAULT 0 NOT NULL,
    lat_b4 bigint DEFAULT 0 NOT NULL,
    lat_b5 bigint DEFAULT 0 NOT NULL,
    lat_b6 bigint DEFAULT 0 NOT NULL,
    lat_b7 bigint DEFAULT 0 NOT NULL,
    CONSTRAINT api_traffic_hour_channel_check CHECK ((channel ~ '^[a-z][a-z0-9_.]{2,59}$'::text)),
    CONSTRAINT api_traffic_hour_hour_check CHECK ((hour = date_trunc('hour'::text, hour)))
);

--
-- Name: audit_events; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    institution_id uuid,
    actor_id uuid NOT NULL,
    actor_type text DEFAULT 'ficium_admin'::text NOT NULL,
    actor_ip inet,
    actor_device text,
    action_category text NOT NULL,
    event_label text NOT NULL,
    resource_type text,
    resource_id uuid,
    state_before jsonb,
    state_after jsonb,
    outcome text DEFAULT 'success'::text NOT NULL,
    outcome_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['ficium_admin'::text, 'system'::text]))),
    CONSTRAINT audit_events_outcome_check CHECK ((outcome = ANY (ARRAY['success'::text, 'rejected'::text, 'expired'::text, 'error'::text])))
);

--
-- Name: kyc_settings_change; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.kyc_settings_change (
    id bigint NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    check_key text NOT NULL,
    old_value boolean,
    new_value boolean,
    actor text NOT NULL,
    reason text NOT NULL
);

--
-- Name: kyc_settings_change_id_seq; Type: SEQUENCE; Schema: admin; Owner: -
--

CREATE SEQUENCE admin.kyc_settings_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: kyc_settings_change_id_seq; Type: SEQUENCE OWNED BY; Schema: admin; Owner: -
--

ALTER SEQUENCE admin.kyc_settings_change_id_seq OWNED BY admin.kyc_settings_change.id;

--
-- Name: platform_config; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.platform_config (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE platform_config; Type: COMMENT; Schema: admin; Owner: -
--

COMMENT ON TABLE admin.platform_config IS 'Global platform configuration. One row per setting key. Admin-only.';

--
-- Name: schema_migration; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.schema_migration (
    version text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schema_migration_version_check CHECK ((version ~ '^[0-9]{14}_[a-z0-9_]{1,80}$'::text))
);

--
-- Name: sync_log; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.sync_log (
    event_id uuid NOT NULL,
    topic text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    aggregate_version bigint NOT NULL,
    outcome text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sync_log_outcome_check CHECK ((outcome = ANY (ARRAY['applied'::text, 'stale'::text])))
);

ALTER TABLE ONLY admin.sync_log FORCE ROW LEVEL SECURITY;

--
-- Name: sync_state; Type: TABLE; Schema: admin; Owner: -
--

CREATE TABLE admin.sync_state (
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    applied_version bigint NOT NULL,
    last_event_id uuid NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY admin.sync_state FORCE ROW LEVEL SECURITY;

--
-- Name: conversation; Type: TABLE; Schema: fico; Owner: -
--

CREATE TABLE fico.conversation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    summarized boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY fico.conversation FORCE ROW LEVEL SECURITY;

--
-- Name: message; Type: TABLE; Schema: fico; Owner: -
--

CREATE TABLE fico.message (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_role_check CHECK ((role = ANY (ARRAY['user'::text, 'fico'::text])))
);

ALTER TABLE ONLY fico.message FORCE ROW LEVEL SECURITY;

--
-- Name: message_meter; Type: TABLE; Schema: fico; Owner: -
--

CREATE TABLE fico.message_meter (
    user_id uuid NOT NULL,
    period date NOT NULL,
    messages_used integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY fico.message_meter FORCE ROW LEVEL SECURITY;

--
-- Name: profile; Type: TABLE; Schema: fico; Owner: -
--

CREATE TABLE fico.profile (
    user_id uuid NOT NULL,
    rolling_summary text DEFAULT ''::text NOT NULL,
    tone_notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY fico.profile FORCE ROW LEVEL SECURITY;

--
-- Name: holding_prices; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.holding_prices (
    symbol text NOT NULL,
    exchange text DEFAULT ''::text NOT NULL,
    asset_type text NOT NULL,
    price numeric NOT NULL,
    currency text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT holding_prices_asset_type_check CHECK ((asset_type = ANY (ARRAY['stock'::text, 'etf'::text, 'bond'::text, 'crypto'::text])))
);

ALTER TABLE ONLY finance.holding_prices FORCE ROW LEVEL SECURITY;

--
-- Name: holdings; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.holdings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_type text NOT NULL,
    symbol text NOT NULL,
    exchange text,
    quantity numeric DEFAULT 0 NOT NULL,
    cost_basis numeric,
    currency text DEFAULT 'USD'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT holdings_asset_type_check CHECK ((asset_type = ANY (ARRAY['stock'::text, 'etf'::text, 'bond'::text, 'crypto'::text])))
);

ALTER TABLE ONLY finance.holdings FORCE ROW LEVEL SECURITY;

--
-- Name: aggregate_sequence; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.aggregate_sequence (
    aggregate_id text NOT NULL,
    last_sequence bigint NOT NULL
);

--
-- Name: bid_shadow; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.bid_shadow (
    bid_id uuid NOT NULL,
    request_id uuid NOT NULL,
    status text NOT NULL,
    payload jsonb NOT NULL,
    last_event_id text NOT NULL,
    last_sequence bigint NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bid_shadow_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'withdrawn'::text, 'expired'::text, 'rejected'::text])))
);

--
-- Name: chat_refused; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.chat_refused (
    event_id text NOT NULL,
    message_id uuid,
    request_id uuid,
    institution_id uuid,
    reason text NOT NULL,
    refused_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: deal_documents; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.deal_documents (
    pipeline_id uuid NOT NULL,
    request_id uuid NOT NULL,
    bid_id uuid NOT NULL,
    client_id uuid NOT NULL,
    documents jsonb NOT NULL,
    last_event_id text NOT NULL,
    last_sequence bigint NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: deal_progress; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.deal_progress (
    pipeline_id uuid NOT NULL,
    request_id uuid NOT NULL,
    bid_id uuid NOT NULL,
    client_id uuid NOT NULL,
    payload jsonb NOT NULL,
    last_event_id text NOT NULL,
    last_sequence bigint NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: document_submission; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.document_submission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pipeline_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    client_id uuid NOT NULL,
    source text NOT NULL,
    vault_document_id uuid,
    document_date date,
    upload_id uuid,
    sha256 text,
    status text DEFAULT 'started'::text NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT document_submission_check CHECK (((source = 'new'::text) OR ((vault_document_id IS NOT NULL) AND (document_date IS NOT NULL)))),
    CONSTRAINT document_submission_sha256_check CHECK (((sha256 IS NULL) OR (sha256 ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT document_submission_source_check CHECK ((source = ANY (ARRAY['vault'::text, 'new'::text]))),
    CONSTRAINT document_submission_status_check CHECK ((status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text])))
);

--
-- Name: emit_error; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.emit_error (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    request_id uuid,
    stage text,
    error text
);

--
-- Name: emit_error_id_seq; Type: SEQUENCE; Schema: integration; Owner: -
--

CREATE SEQUENCE integration.emit_error_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: emit_error_id_seq; Type: SEQUENCE OWNED BY; Schema: integration; Owner: -
--

ALTER SEQUENCE integration.emit_error_id_seq OWNED BY integration.emit_error.id;

--
-- Name: identity_release; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.identity_release (
    consent_ref text NOT NULL,
    client_id uuid NOT NULL,
    request_id uuid NOT NULL,
    bid_id uuid NOT NULL,
    fields_released text[] NOT NULL,
    prepared_at timestamp with time zone DEFAULT now() NOT NULL,
    outcome text DEFAULT 'prepared'::text NOT NULL,
    institution_id uuid,
    completed_at timestamp with time zone,
    anon_borrower_id uuid,
    released_identity jsonb,
    CONSTRAINT identity_release_outcome_check CHECK ((outcome = ANY (ARRAY['prepared'::text, 'accepted'::text, 'refused'::text, 'failed'::text])))
);

--
-- Name: inbox; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.inbox (
    event_id text NOT NULL,
    type text NOT NULL,
    source text NOT NULL,
    aggregate_id text NOT NULL,
    sequence bigint NOT NULL,
    outcome text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inbox_outcome_check CHECK ((outcome = ANY (ARRAY['apply'::text, 'stale'::text]))),
    CONSTRAINT inbox_source_check CHECK ((source = ANY (ARRAY['borrower'::text, 'institution'::text])))
);

--
-- Name: inbox_watermark; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.inbox_watermark (
    aggregate_id text NOT NULL,
    last_sequence bigint NOT NULL
);

--
-- Name: market_snapshot; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.market_snapshot (
    id smallint DEFAULT 1 NOT NULL,
    as_of date NOT NULL,
    payload jsonb NOT NULL,
    last_event_id text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_snapshot_id_check CHECK ((id = 1))
);

--
-- Name: outbox; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.outbox (
    id text NOT NULL,
    type text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    aggregate_id text NOT NULL,
    sequence bigint NOT NULL,
    envelope jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_until timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    CONSTRAINT outbox_id_check CHECK ((id ~ '^evt_[0-9A-Za-z]{10,40}$'::text)),
    CONSTRAINT outbox_sequence_check CHECK ((sequence >= 1)),
    CONSTRAINT outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'delivered'::text, 'dead'::text])))
);

--
-- Name: account_closures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_closures (
    client_id uuid NOT NULL,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    retain_until date NOT NULL,
    open_requests_closed integer DEFAULT 0 NOT NULL,
    erased_at timestamp with time zone
);

--
-- Name: account_closures_due_for_erasure; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.account_closures_due_for_erasure WITH (security_invoker='true') AS
 SELECT client_id,
    closed_at,
    retain_until
   FROM public.account_closures
  WHERE ((erased_at IS NULL) AND (retain_until <= CURRENT_DATE));

--
-- Name: activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    body text,
    goal_id uuid,
    request_id uuid,
    meta jsonb DEFAULT '{}'::jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.activity_events FORCE ROW LEVEL SECURITY;

--
-- Name: advisor_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT advisor_messages_content_check CHECK (((char_length(content) >= 1) AND (char_length(content) <= 8000))),
    CONSTRAINT advisor_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);

--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    client_id uuid NOT NULL,
    usage_day date NOT NULL,
    kind text NOT NULL,
    calls integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_usage_calls_check CHECK ((calls >= 0)),
    CONSTRAINT ai_usage_kind_check CHECK ((kind = ANY (ARRAY['chat'::text, 'market'::text])))
);

--
-- Name: app_client_seen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_client_seen (
    client_id uuid NOT NULL,
    platform text NOT NULL,
    app_version text NOT NULL,
    app_build text DEFAULT ''::text NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_client_seen_app_build_check CHECK ((app_build ~ '^[0-9]{0,10}$'::text)),
    CONSTRAINT app_client_seen_app_version_check CHECK ((app_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'::text)),
    CONSTRAINT app_client_seen_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text])))
);

--
-- Name: TABLE app_client_seen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_client_seen IS 'Mobile app version each borrower last used (self-reported). Counting only. Written by report_app_client; no direct access.';

--
-- Name: app_error_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_error_report (
    day date DEFAULT ((now() AT TIME ZONE 'utc'::text))::date NOT NULL,
    client_id uuid NOT NULL,
    platform text NOT NULL,
    app_version text NOT NULL,
    fingerprint text NOT NULL,
    kind text NOT NULL,
    message text NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    route text DEFAULT ''::text NOT NULL,
    occurrences integer DEFAULT 1 NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_error_report_app_version_check CHECK ((app_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'::text)),
    CONSTRAINT app_error_report_fingerprint_check CHECK ((fingerprint ~ '^[0-9a-f]{16}$'::text)),
    CONSTRAINT app_error_report_kind_check CHECK ((kind = ANY (ARRAY['error'::text, 'rejection'::text, 'render'::text]))),
    CONSTRAINT app_error_report_location_check CHECK ((length(location) <= 200)),
    CONSTRAINT app_error_report_message_check CHECK (((length(message) >= 1) AND (length(message) <= 300))),
    CONSTRAINT app_error_report_occurrences_check CHECK (((occurrences >= 1) AND (occurrences <= 1000))),
    CONSTRAINT app_error_report_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text]))),
    CONSTRAINT app_error_report_route_check CHECK ((length(route) <= 120))
);

--
-- Name: TABLE app_error_report; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_error_report IS 'JavaScript errors reported by the phone apps, scrubbed. Written by report_app_error; no direct access. Kept 35 days.';

--
-- Name: app_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_features (
    key text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.app_features FORCE ROW LEVEL SECURITY;

--
-- Name: app_release_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_release_policy (
    platform text NOT NULL,
    min_version text NOT NULL,
    latest_version text NOT NULL,
    store_url text DEFAULT ''::text NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_release_policy_check CHECK (((string_to_array(min_version, '.'::text))::integer[] <= (string_to_array(latest_version, '.'::text))::integer[])),
    CONSTRAINT app_release_policy_latest_version_check CHECK ((latest_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'::text)),
    CONSTRAINT app_release_policy_min_version_check CHECK ((min_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'::text)),
    CONSTRAINT app_release_policy_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text])))
);

--
-- Name: TABLE app_release_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_release_policy IS 'Lowest mobile app version allowed to run, per platform. Written only by admin-sync (app.release_policy_changed). Public read.';

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    pending_action_id uuid,
    actor_id uuid NOT NULL,
    actor_type text DEFAULT 'client_user'::text NOT NULL,
    actor_role text,
    actor_ip inet,
    actor_device text,
    action_category text NOT NULL,
    event_label text NOT NULL,
    resource_type text,
    resource_id uuid,
    state_before jsonb,
    state_after jsonb,
    outcome text DEFAULT 'success'::text NOT NULL,
    outcome_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['client_user'::text, 'system'::text, 'ficium_admin'::text]))),
    CONSTRAINT audit_events_outcome_check CHECK ((outcome = ANY (ARRAY['success'::text, 'rejected'::text, 'expired'::text, 'error'::text])))
);

ALTER TABLE ONLY public.audit_events FORCE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    actor_id uuid,
    actor_type text DEFAULT 'system'::text NOT NULL,
    institution_id uuid,
    event_type text NOT NULL,
    resource_id uuid,
    resource_type text,
    diff jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.audit_logs FORCE ROW LEVEL SECURITY;

--
-- Name: bid_acceptances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bid_acceptances (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    bid_id uuid NOT NULL,
    request_id uuid NOT NULL,
    client_id uuid NOT NULL,
    institution_id uuid NOT NULL,
    los_reference text,
    crm_reference text,
    core_banking_ref text,
    disbursement_status text DEFAULT 'pending'::text,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.bid_acceptances FORCE ROW LEVEL SECURITY;

--
-- Name: client_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    journey_id uuid,
    type text NOT NULL,
    label text NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    extracted jsonb,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_documents_type_check CHECK ((type = ANY (ARRAY['payslip'::text, 'bank_statement'::text, 'id_document'::text, 'utility_bill'::text, 'tax_return'::text, 'business_plan'::text, 'property_valuation'::text, 'vehicle_quote'::text, 'other'::text])))
);

ALTER TABLE ONLY public.client_documents FORCE ROW LEVEL SECURITY;

--
-- Name: client_dossier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_dossier (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    employment_status text,
    monthly_income numeric(15,2),
    additional_income numeric(15,2),
    total_net_worth numeric(15,2),
    has_existing_loans boolean DEFAULT false,
    health_score integer,
    risk_score integer,
    affordability_score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dependants integer DEFAULT 0,
    edd_required boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.client_dossier FORCE ROW LEVEL SECURITY;

--
-- Name: client_financial_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_financial_snapshot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    cash_savings numeric(15,2) DEFAULT 0 NOT NULL,
    fixed_deposits numeric(15,2) DEFAULT 0 NOT NULL,
    investments_value numeric(15,2) DEFAULT 0 NOT NULL,
    property_value numeric(15,2) DEFAULT 0 NOT NULL,
    vehicle_value numeric(15,2) DEFAULT 0 NOT NULL,
    other_assets numeric(15,2) DEFAULT 0 NOT NULL,
    mortgage_balance numeric(15,2) DEFAULT 0 NOT NULL,
    personal_loan_balance numeric(15,2) DEFAULT 0 NOT NULL,
    credit_card_balance numeric(15,2) DEFAULT 0 NOT NULL,
    vehicle_loan_balance numeric(15,2) DEFAULT 0 NOT NULL,
    other_liabilities numeric(15,2) DEFAULT 0 NOT NULL,
    monthly_income numeric(12,2) DEFAULT 0 NOT NULL,
    monthly_expenses numeric(12,2) DEFAULT 0 NOT NULL,
    monthly_loan_payments numeric(12,2) DEFAULT 0 NOT NULL,
    monthly_savings numeric(12,2) DEFAULT 0 NOT NULL,
    total_liabilities numeric(15,2) GENERATED ALWAYS AS (((((mortgage_balance + personal_loan_balance) + credit_card_balance) + vehicle_loan_balance) + other_liabilities)) STORED,
    debt_to_income_ratio numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (monthly_income > (0)::numeric) THEN round(((((((mortgage_balance + personal_loan_balance) + credit_card_balance) + vehicle_loan_balance) + other_liabilities) / (monthly_income * (12)::numeric)) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    currency text DEFAULT 'MUR'::text NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    income_verified boolean DEFAULT false,
    income_verified_at timestamp with time zone,
    income_verified_source text,
    property_verified boolean DEFAULT false,
    property_verified_at timestamp with time zone,
    liabilities_verified boolean DEFAULT false,
    liabilities_verified_at timestamp with time zone,
    business_assets numeric DEFAULT 0 NOT NULL,
    total_assets numeric GENERATED ALWAYS AS (((((((cash_savings + fixed_deposits) + investments_value) + property_value) + vehicle_value) + business_assets) + other_assets)) STORED,
    net_worth numeric GENERATED ALWAYS AS ((((((((cash_savings + fixed_deposits) + investments_value) + property_value) + vehicle_value) + business_assets) + other_assets) - ((((mortgage_balance + personal_loan_balance) + credit_card_balance) + vehicle_loan_balance) + other_liabilities))) STORED,
    CONSTRAINT client_financial_snapshot_business_assets_check CHECK ((business_assets >= (0)::numeric))
);

ALTER TABLE ONLY public.client_financial_snapshot FORCE ROW LEVEL SECURITY;

--
-- Name: client_loan_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_loan_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    loan_type text,
    outstanding_amount numeric(15,2),
    monthly_repayment numeric(15,2),
    bank_name text,
    remaining_months integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.client_loan_details FORCE ROW LEVEL SECURITY;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    first_name text,
    middle_name text,
    last_name text,
    title public.title_type,
    phone text,
    user_type text DEFAULT 'individual'::text NOT NULL,
    company_name text,
    company_registration text,
    kyc_status public.kyc_status DEFAULT 'pending'::public.kyc_status NOT NULL,
    date_of_birth date,
    gender text,
    address_line_1 text,
    address_line_2 text,
    city text,
    postal_code text,
    country text DEFAULT 'MU'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kyc_submitted_at timestamp with time zone DEFAULT now(),
    admin_review_note text,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    nationality text,
    residence_status text,
    dependants integer DEFAULT 0,
    CONSTRAINT clients_business_fields CHECK (((user_type = 'individual'::text) OR ((company_name IS NOT NULL) AND (company_registration IS NOT NULL)))),
    CONSTRAINT clients_user_type_check CHECK ((user_type = ANY (ARRAY['individual'::text, 'business'::text])))
);

ALTER TABLE ONLY public.clients FORCE ROW LEVEL SECURITY;

--
-- Name: compliance_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source_of_wealth text,
    source_of_wealth_other text,
    is_pep boolean DEFAULT false,
    pep_details text,
    tax_residency text DEFAULT 'MU'::text,
    missed_repayments boolean DEFAULT false,
    blacklisted boolean DEFAULT false,
    bankruptcy boolean DEFAULT false,
    legal_disputes boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT compliance_details_source_of_wealth_check CHECK ((source_of_wealth = ANY (ARRAY['salary'::text, 'business'::text, 'investments'::text, 'inheritance'::text, 'property'::text, 'savings'::text, 'other'::text])))
);

ALTER TABLE ONLY public.compliance_details FORCE ROW LEVEL SECURITY;

--
-- Name: client_profile_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.client_profile_view WITH (security_invoker='on') AS
 SELECT c.id AS user_id,
    c.email,
    c.full_name,
    c.first_name,
    c.last_name,
    c.kyc_status,
    c.date_of_birth,
    c.address_line_1,
    c.city,
    c.country,
    c.user_type,
    (c.kyc_status = 'verified'::public.kyc_status) AS kyc_verified,
    (c.kyc_status = 'verified'::public.kyc_status) AS proof_of_address_done,
    d.employment_status,
    d.monthly_income,
    d.total_net_worth,
    d.has_existing_loans,
    COALESCE(cd.is_pep, false) AS is_pep,
    cd.tax_residency,
    cd.source_of_wealth,
    d.health_score,
    d.risk_score,
    d.affordability_score,
    (d.id IS NOT NULL) AS financial_profile_done,
    (cd.source_of_wealth IS NOT NULL) AS source_of_wealth_done,
    COALESCE(d.edd_required, false) AS enhanced_due_diligence_required,
        CASE
            WHEN ((c.kyc_status = 'verified'::public.kyc_status) AND (d.id IS NOT NULL)) THEN 100
            WHEN (c.kyc_status = 'verified'::public.kyc_status) THEN 60
            WHEN (c.kyc_status = 'pending'::public.kyc_status) THEN 20
            ELSE 10
        END AS completion_percent,
    s.total_assets,
    s.total_liabilities,
    s.net_worth AS snapshot_net_worth,
    s.cash_savings,
    s.fixed_deposits,
    s.investments_value,
    s.property_value,
    s.vehicle_value,
    s.other_assets,
    s.mortgage_balance,
    s.personal_loan_balance,
    s.credit_card_balance,
    s.vehicle_loan_balance,
    s.other_liabilities,
    s.monthly_expenses,
    s.monthly_loan_payments,
    s.monthly_savings,
    s.debt_to_income_ratio,
    s.business_assets
   FROM (((public.clients c
     LEFT JOIN public.client_dossier d ON ((d.client_id = c.id)))
     LEFT JOIN public.compliance_details cd ON ((cd.user_id = c.id)))
     LEFT JOIN public.client_financial_snapshot s ON ((s.client_id = c.id)))
  WHERE (c.id = auth.uid());

--
-- Name: client_vault_access_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_vault_access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    client_id uuid NOT NULL,
    action text NOT NULL,
    actor_id uuid,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.client_vault_access_log FORCE ROW LEVEL SECURITY;

--
-- Name: client_vault_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_vault_document (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    doc_type public.vault_doc_type NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    file_size_bytes integer,
    mime_type text,
    extract_status public.vault_extract_status DEFAULT 'pending'::public.vault_extract_status NOT NULL,
    extract_job_id text,
    extracted_at timestamp with time zone,
    attested_at timestamp with time zone,
    extract_error text,
    extract_raw jsonb,
    confidence numeric(4,3),
    doc_date date,
    doc_ref text,
    expires_at date,
    retain_until date,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.client_vault_document FORCE ROW LEVEL SECURITY;

--
-- Name: client_vault_property; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_vault_property (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    deed_document_id uuid,
    valuation_doc_id uuid,
    address text,
    land_area_sqm numeric,
    property_type text,
    registered_owner text,
    deed_date date,
    deed_ref text,
    market_value numeric,
    valuation_date date,
    valuer_name text,
    valuation_currency text DEFAULT 'MUR'::text,
    is_mortgaged boolean DEFAULT false,
    mortgage_lender text,
    mortgage_balance numeric,
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.client_vault_property FORCE ROW LEVEL SECURITY;

--
-- Name: couple_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.couple_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_a_id uuid NOT NULL,
    client_b_id uuid NOT NULL,
    status public.couple_status DEFAULT 'pending_verification'::public.couple_status NOT NULL,
    initiated_by_client_id uuid NOT NULL,
    verified_at timestamp with time zone,
    dissolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT couple_link_ordered_pair CHECK ((client_a_id < client_b_id))
);

ALTER TABLE ONLY public.couple_link FORCE ROW LEVEL SECURITY;

--
-- Name: couple_relationship_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.couple_relationship_document (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    couple_link_id uuid NOT NULL,
    vault_document_id uuid NOT NULL,
    uploaded_by_client_id uuid NOT NULL,
    doc_type public.vault_doc_type DEFAULT 'marriage_certificate'::public.vault_doc_type NOT NULL,
    extracted_text text,
    name_a_matched boolean DEFAULT false NOT NULL,
    name_b_matched boolean DEFAULT false NOT NULL,
    match_score_a numeric,
    match_score_b numeric,
    match_status public.relationship_match_status DEFAULT 'pending'::public.relationship_match_status NOT NULL,
    verification_status public.relationship_doc_status DEFAULT 'pending_ocr'::public.relationship_doc_status NOT NULL,
    reject_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT couple_relationship_document_doc_type_check CHECK ((doc_type = 'marriage_certificate'::public.vault_doc_type))
);

ALTER TABLE ONLY public.couple_relationship_document FORCE ROW LEVEL SECURITY;

--
-- Name: employment_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employment_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employer_name text,
    industry text,
    job_title text,
    years_of_employment numeric,
    employment_type text,
    work_email text,
    employer_address text,
    business_name text,
    brn_number text,
    years_in_business numeric,
    average_monthly_revenue numeric,
    business_address text,
    tax_registration_number text,
    company_type text,
    number_of_employees integer,
    annual_revenue numeric,
    primary_profession text,
    primary_clients_region text,
    portfolio_website text,
    pension_income numeric,
    other_income_sources text,
    institution_name text,
    sponsor_type text,
    monthly_allowance numeric,
    part_time_employment boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT employment_details_employment_type_check CHECK ((employment_type = ANY (ARRAY['permanent'::text, 'contract'::text, 'temporary'::text]))),
    CONSTRAINT employment_details_sponsor_type_check CHECK ((sponsor_type = ANY (ARRAY['parents'::text, 'self'::text, 'scholarship'::text, 'employer'::text, 'other'::text])))
);

ALTER TABLE ONLY public.employment_details FORCE ROW LEVEL SECURITY;

--
-- Name: kyc_scan_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_scan_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_hash text NOT NULL,
    client_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: kyc_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_settings (
    id integer DEFAULT 1 NOT NULL,
    ai_analysis boolean DEFAULT true NOT NULL,
    face_match boolean DEFAULT true NOT NULL,
    duplicate_face boolean DEFAULT true NOT NULL,
    ocr_name_match boolean DEFAULT true NOT NULL,
    proof_of_address boolean DEFAULT true NOT NULL,
    velocity_check boolean DEFAULT true NOT NULL,
    document_reuse boolean DEFAULT true NOT NULL,
    liveness_check boolean DEFAULT true NOT NULL,
    mrz_validation boolean DEFAULT true NOT NULL,
    permit_check boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_row CHECK ((id = 1))
);

ALTER TABLE ONLY public.kyc_settings FORCE ROW LEVEL SECURITY;

--
-- Name: kyc_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    submitted_at timestamp with time zone DEFAULT now(),
    provider text,
    reference_id text,
    risk_score integer,
    status text,
    flags text[],
    id_document_path text,
    selfie_path text,
    proof_of_address_path text,
    document_type text,
    document_number text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    details jsonb,
    mrz_valid boolean,
    face_match_score numeric(5,2),
    name_match_score integer,
    document_expired boolean,
    nationality text,
    residence_status text,
    same_nationality_residence boolean DEFAULT true,
    permit_path text
);

ALTER TABLE ONLY public.kyc_submissions FORCE ROW LEVEL SECURITY;

--
-- Name: market_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticker_id text NOT NULL,
    value numeric NOT NULL,
    display_value text NOT NULL,
    change_pct numeric DEFAULT 0 NOT NULL,
    direction text NOT NULL,
    history numeric[] DEFAULT '{}'::numeric[] NOT NULL,
    source text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_data_direction_check CHECK ((direction = ANY (ARRAY['up'::text, 'down'::text, 'flat'::text])))
);

--
-- Name: market_deposit_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_deposit_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    bank_color text DEFAULT '#64748b'::text NOT NULL,
    rate_1y text NOT NULL,
    rate_2y text NOT NULL,
    rate_3y text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: market_fx_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_fx_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    currency_code text NOT NULL,
    currency_pair text NOT NULL,
    bank_name text NOT NULL,
    buy_rate numeric NOT NULL,
    sell_rate numeric NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    rate_basis text DEFAULT 'indicative'::text NOT NULL,
    CONSTRAINT market_fx_rates_basis_check CHECK ((rate_basis = ANY (ARRAY['indicative'::text, 'live'::text])))
);

--
-- Name: market_lending_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_lending_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product text NOT NULL,
    icon_name text DEFAULT 'landmark'::text NOT NULL,
    best_rate text NOT NULL,
    is_best boolean DEFAULT false NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: market_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    headline text NOT NULL,
    category text NOT NULL,
    emoji text NOT NULL,
    plain_english text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    related_ticker_id text,
    source text DEFAULT 'manual'::text NOT NULL,
    body text,
    scope text DEFAULT 'local'::text NOT NULL,
    source_name text,
    source_url text,
    content_hash text,
    CONSTRAINT market_news_scope_check CHECK ((scope = ANY (ARRAY['local'::text, 'global'::text])))
);

--
-- Name: market_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_preferences (
    user_id uuid NOT NULL,
    categories text[] DEFAULT '{}'::text[] NOT NULL,
    currencies text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{local,global}'::text[] NOT NULL,
    default_mode text DEFAULT 'everyday'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_preferences_default_mode_check CHECK ((default_mode = ANY (ARRAY['everyday'::text, 'finance'::text])))
);

ALTER TABLE ONLY public.market_preferences FORCE ROW LEVEL SECURITY;

--
-- Name: market_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_key text NOT NULL,
    category text NOT NULL,
    emoji text NOT NULL,
    related_cta boolean DEFAULT false NOT NULL,
    headline_everyday text NOT NULL,
    plain_everyday text NOT NULL,
    headline_finance text NOT NULL,
    plain_finance text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    detail_everyday text DEFAULT ''::text NOT NULL,
    detail_finance text DEFAULT ''::text NOT NULL
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE ONLY public.notifications FORCE ROW LEVEL SECURITY;

--
-- Name: offer_listing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_listing (
    id uuid NOT NULL,
    institution_name text NOT NULL,
    category text NOT NULL,
    product_type public.product_type NOT NULL,
    caption text NOT NULL,
    headline text NOT NULL,
    terms text NOT NULL,
    image_tag text,
    image_url text,
    image_alt text,
    is_launch boolean NOT NULL,
    launch_window_ends timestamp with time zone,
    published_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone NOT NULL,
    live_until timestamp with time zone NOT NULL,
    CONSTRAINT offer_listing_category_check CHECK ((category = ANY (ARRAY['borrow'::text, 'save'::text, 'invest'::text])))
);

ALTER TABLE ONLY public.offer_listing FORCE ROW LEVEL SECURITY;

--
-- Name: request_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    product_type public.product_type NOT NULL,
    amount numeric,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: request_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    institution_id uuid NOT NULL,
    decision text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_decisions_decision_check CHECK ((decision = 'rejected'::text))
);

--
-- Name: request_invitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    inviter_client_id uuid NOT NULL,
    invited_email text NOT NULL,
    invited_phone text,
    channel public.invitation_channel DEFAULT 'email'::public.invitation_channel NOT NULL,
    invited_client_id uuid,
    proposed_role public.participant_role DEFAULT 'co_applicant'::public.participant_role NOT NULL,
    proposed_liability public.liability_type,
    proposed_ownership_bps integer,
    token_hash bytea NOT NULL,
    status public.invitation_status DEFAULT 'pending'::public.invitation_status NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT no_self_invite CHECK (((invited_client_id IS NULL) OR (invited_client_id <> inviter_client_id))),
    CONSTRAINT request_invitation_proposed_ownership_bps_check CHECK (((proposed_ownership_bps >= 0) AND (proposed_ownership_bps <= 10000)))
);

ALTER TABLE ONLY public.request_invitation FORCE ROW LEVEL SECURITY;

--
-- Name: request_message_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_message_template (
    code text NOT NULL,
    sender_type text NOT NULL,
    label text NOT NULL,
    body_template text NOT NULL,
    params_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order smallint DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_message_template_sender_type_check CHECK ((sender_type = ANY (ARRAY['client'::text, 'institution'::text])))
);

--
-- Name: TABLE request_message_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.request_message_template IS 'Allowed pre-acceptance messages. Both sides are template-only until a bid is accepted, so neither party can volunteer or solicit identifying detail while the marketplace is still anonymous.';

--
-- Name: request_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    sender_type text NOT NULL,
    sender_id uuid,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    institution_id uuid,
    kind text DEFAULT 'structured'::text NOT NULL,
    template_code text,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT request_messages_body_check CHECK (((char_length(body) > 0) AND (char_length(body) <= 2000))),
    CONSTRAINT request_messages_borrower_sender_ck CHECK (((sender_type <> 'client'::text) OR (sender_id IS NOT NULL))),
    CONSTRAINT request_messages_kind_chk CHECK ((kind = ANY (ARRAY['structured'::text, 'free'::text]))),
    CONSTRAINT request_messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['institution'::text, 'client'::text]))),
    CONSTRAINT request_messages_template_chk CHECK ((((kind = 'structured'::text) AND (template_code IS NOT NULL)) OR ((kind = 'free'::text) AND (template_code IS NULL))))
);

ALTER TABLE ONLY public.request_messages FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN request_messages.institution_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.request_messages.institution_id IS 'The lender this thread is with. One thread per (request_id, institution_id) — NOT per bid, so a withdrawn/resubmitted bid does not fork or lose the conversation.';

--
-- Name: COLUMN request_messages.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.request_messages.kind IS 'structured = template-driven (pre-acceptance, both sides). free = free text, permitted only for the winning lender after acceptance.';

--
-- Name: request_participant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_participant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    client_id uuid NOT NULL,
    role public.participant_role DEFAULT 'co_applicant'::public.participant_role NOT NULL,
    liability_type public.liability_type,
    ownership_bps integer,
    consent_state public.consent_state DEFAULT 'invited'::public.consent_state NOT NULL,
    is_initiator boolean DEFAULT false NOT NULL,
    consented_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_participant_ownership_bps_check CHECK (((ownership_bps >= 0) AND (ownership_bps <= 10000)))
);

ALTER TABLE ONLY public.request_participant FORCE ROW LEVEL SECURITY;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    product_type public.product_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    purpose text,
    preferred_term_months integer,
    max_rate numeric(5,2),
    decision_deadline timestamp with time zone,
    status public.request_status DEFAULT 'open'::public.request_status NOT NULL,
    anonymized_brief text,
    accepted_bid_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    allocation_mode text,
    product_answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    relisted_from uuid,
    CONSTRAINT requests_allocation_mode_check CHECK ((allocation_mode = ANY (ARRAY['client_specified'::text, 'institution_decides'::text])))
);

ALTER TABLE ONLY public.requests FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN requests.product_answers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.product_answers IS 'Raw key/value answers from the product-specific intake question flow (NewRequest.tsx PRODUCT_QUESTIONS), excluding __amount/__term internal keys. Product-shape varies by product_type; consumers should treat keys as optional.';

--
-- Name: v_request_patterns; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_request_patterns AS
 SELECT product_type,
    count(*) AS total_requests,
    count(*) FILTER (WHERE (status = 'open'::public.request_status)) AS open_requests,
    count(*) FILTER (WHERE (status = 'closed'::public.request_status)) AS closed_requests,
    round(avg(amount), 0) AS avg_amount,
    round((percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((amount)::double precision)))::numeric, 0) AS median_amount,
    round(avg(preferred_term_months), 0) AS avg_term_months,
    round(((100.0 * (count(*) FILTER (WHERE (status = 'closed'::public.request_status)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS close_rate_pct,
    now() AS computed_at
   FROM public.requests
  WHERE (created_at > (now() - '90 days'::interval))
  GROUP BY product_type;

--
-- Name: kyc_settings_change id; Type: DEFAULT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.kyc_settings_change ALTER COLUMN id SET DEFAULT nextval('admin.kyc_settings_change_id_seq'::regclass);

--
-- Name: emit_error id; Type: DEFAULT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.emit_error ALTER COLUMN id SET DEFAULT nextval('integration.emit_error_id_seq'::regclass);

--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);

--
-- Name: admin_users admin_users_user_id_key; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.admin_users
    ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);

--
-- Name: api_channel_policy api_channel_policy_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.api_channel_policy
    ADD CONSTRAINT api_channel_policy_pkey PRIMARY KEY (channel);

--
-- Name: api_channel_status api_channel_status_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.api_channel_status
    ADD CONSTRAINT api_channel_status_pkey PRIMARY KEY (channel);

--
-- Name: api_traffic_hour api_traffic_hour_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.api_traffic_hour
    ADD CONSTRAINT api_traffic_hour_pkey PRIMARY KEY (channel, hour);

--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);

--
-- Name: kyc_settings_change kyc_settings_change_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.kyc_settings_change
    ADD CONSTRAINT kyc_settings_change_pkey PRIMARY KEY (id);

--
-- Name: platform_config platform_config_key_key; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.platform_config
    ADD CONSTRAINT platform_config_key_key UNIQUE (key);

--
-- Name: platform_config platform_config_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.platform_config
    ADD CONSTRAINT platform_config_pkey PRIMARY KEY (id);

--
-- Name: schema_migration schema_migration_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.schema_migration
    ADD CONSTRAINT schema_migration_pkey PRIMARY KEY (version);

--
-- Name: sync_log sync_log_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.sync_log
    ADD CONSTRAINT sync_log_pkey PRIMARY KEY (event_id);

--
-- Name: sync_state sync_state_pkey; Type: CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.sync_state
    ADD CONSTRAINT sync_state_pkey PRIMARY KEY (aggregate_type, aggregate_id);

--
-- Name: conversation conversation_pkey; Type: CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.conversation
    ADD CONSTRAINT conversation_pkey PRIMARY KEY (id);

--
-- Name: message_meter message_meter_pkey; Type: CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.message_meter
    ADD CONSTRAINT message_meter_pkey PRIMARY KEY (user_id, period);

--
-- Name: message message_pkey; Type: CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id);

--
-- Name: profile profile_pkey; Type: CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (user_id);

--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

--
-- Name: holding_prices holding_prices_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.holding_prices
    ADD CONSTRAINT holding_prices_pkey PRIMARY KEY (symbol, exchange);

--
-- Name: holdings holdings_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.holdings
    ADD CONSTRAINT holdings_pkey PRIMARY KEY (id);

--
-- Name: net_worth_history net_worth_history_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.net_worth_history
    ADD CONSTRAINT net_worth_history_pkey PRIMARY KEY (user_id, snapshot_date);

--
-- Name: aggregate_sequence aggregate_sequence_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.aggregate_sequence
    ADD CONSTRAINT aggregate_sequence_pkey PRIMARY KEY (aggregate_id);

--
-- Name: bid_shadow bid_shadow_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.bid_shadow
    ADD CONSTRAINT bid_shadow_pkey PRIMARY KEY (bid_id);

--
-- Name: chat_refused chat_refused_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.chat_refused
    ADD CONSTRAINT chat_refused_pkey PRIMARY KEY (event_id);

--
-- Name: deal_documents deal_documents_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.deal_documents
    ADD CONSTRAINT deal_documents_pkey PRIMARY KEY (pipeline_id);

--
-- Name: deal_progress deal_progress_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.deal_progress
    ADD CONSTRAINT deal_progress_pkey PRIMARY KEY (pipeline_id);

--
-- Name: document_submission document_submission_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.document_submission
    ADD CONSTRAINT document_submission_pkey PRIMARY KEY (id);

--
-- Name: emit_error emit_error_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.emit_error
    ADD CONSTRAINT emit_error_pkey PRIMARY KEY (id);

--
-- Name: identity_release identity_release_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.identity_release
    ADD CONSTRAINT identity_release_pkey PRIMARY KEY (consent_ref);

--
-- Name: inbox inbox_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.inbox
    ADD CONSTRAINT inbox_pkey PRIMARY KEY (event_id);

--
-- Name: inbox_watermark inbox_watermark_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.inbox_watermark
    ADD CONSTRAINT inbox_watermark_pkey PRIMARY KEY (aggregate_id);

--
-- Name: market_snapshot market_snapshot_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.market_snapshot
    ADD CONSTRAINT market_snapshot_pkey PRIMARY KEY (id);

--
-- Name: outbox outbox_aggregate_id_sequence_key; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.outbox
    ADD CONSTRAINT outbox_aggregate_id_sequence_key UNIQUE (aggregate_id, sequence);

--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);

--
-- Name: account_closures account_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_closures
    ADD CONSTRAINT account_closures_pkey PRIMARY KEY (client_id);

--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);

--
-- Name: advisor_messages advisor_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_messages
    ADD CONSTRAINT advisor_messages_pkey PRIMARY KEY (id);

--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (client_id, usage_day, kind);

--
-- Name: app_client_seen app_client_seen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_client_seen
    ADD CONSTRAINT app_client_seen_pkey PRIMARY KEY (client_id, platform);

--
-- Name: app_error_report app_error_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_error_report
    ADD CONSTRAINT app_error_report_pkey PRIMARY KEY (day, client_id, platform, fingerprint);

--
-- Name: app_features app_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_features
    ADD CONSTRAINT app_features_pkey PRIMARY KEY (key);

--
-- Name: app_release_policy app_release_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_release_policy
    ADD CONSTRAINT app_release_policy_pkey PRIMARY KEY (platform);

--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: bid_acceptances bid_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_acceptances
    ADD CONSTRAINT bid_acceptances_pkey PRIMARY KEY (id);

--
-- Name: client_documents client_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_pkey PRIMARY KEY (id);

--
-- Name: client_dossier client_dossier_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_dossier
    ADD CONSTRAINT client_dossier_client_id_key UNIQUE (client_id);

--
-- Name: client_dossier client_dossier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_dossier
    ADD CONSTRAINT client_dossier_pkey PRIMARY KEY (id);

--
-- Name: client_financial_snapshot client_financial_snapshot_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_financial_snapshot
    ADD CONSTRAINT client_financial_snapshot_client_id_key UNIQUE (client_id);

--
-- Name: client_financial_snapshot client_financial_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_financial_snapshot
    ADD CONSTRAINT client_financial_snapshot_pkey PRIMARY KEY (id);

--
-- Name: client_loan_details client_loan_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_loan_details
    ADD CONSTRAINT client_loan_details_pkey PRIMARY KEY (id);

--
-- Name: client_vault_access_log client_vault_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_access_log
    ADD CONSTRAINT client_vault_access_log_pkey PRIMARY KEY (id);

--
-- Name: client_vault_document client_vault_document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_document
    ADD CONSTRAINT client_vault_document_pkey PRIMARY KEY (id);

--
-- Name: client_vault_property client_vault_property_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_property
    ADD CONSTRAINT client_vault_property_pkey PRIMARY KEY (id);

--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);

--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);

--
-- Name: compliance_details compliance_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_details
    ADD CONSTRAINT compliance_details_pkey PRIMARY KEY (id);

--
-- Name: compliance_details compliance_details_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_details
    ADD CONSTRAINT compliance_details_user_id_key UNIQUE (user_id);

--
-- Name: couple_link couple_link_client_a_id_client_b_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_link
    ADD CONSTRAINT couple_link_client_a_id_client_b_id_key UNIQUE (client_a_id, client_b_id);

--
-- Name: couple_link couple_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_link
    ADD CONSTRAINT couple_link_pkey PRIMARY KEY (id);

--
-- Name: couple_relationship_document couple_relationship_document_couple_link_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_relationship_document
    ADD CONSTRAINT couple_relationship_document_couple_link_id_key UNIQUE (couple_link_id);

--
-- Name: couple_relationship_document couple_relationship_document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_relationship_document
    ADD CONSTRAINT couple_relationship_document_pkey PRIMARY KEY (id);

--
-- Name: employment_details employment_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employment_details
    ADD CONSTRAINT employment_details_pkey PRIMARY KEY (id);

--
-- Name: employment_details employment_details_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employment_details
    ADD CONSTRAINT employment_details_user_id_key UNIQUE (user_id);

--
-- Name: kyc_scan_attempts kyc_scan_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_scan_attempts
    ADD CONSTRAINT kyc_scan_attempts_pkey PRIMARY KEY (id);

--
-- Name: kyc_settings kyc_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_settings
    ADD CONSTRAINT kyc_settings_pkey PRIMARY KEY (id);

--
-- Name: kyc_submissions kyc_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_submissions
    ADD CONSTRAINT kyc_submissions_pkey PRIMARY KEY (id);

--
-- Name: market_data market_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_data
    ADD CONSTRAINT market_data_pkey PRIMARY KEY (id);

--
-- Name: market_data market_data_ticker_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_data
    ADD CONSTRAINT market_data_ticker_id_key UNIQUE (ticker_id);

--
-- Name: market_deposit_rates market_deposit_rates_bank_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_deposit_rates
    ADD CONSTRAINT market_deposit_rates_bank_name_key UNIQUE (bank_name);

--
-- Name: market_deposit_rates market_deposit_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_deposit_rates
    ADD CONSTRAINT market_deposit_rates_pkey PRIMARY KEY (id);

--
-- Name: market_fx_rates market_fx_rates_currency_code_bank_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_fx_rates
    ADD CONSTRAINT market_fx_rates_currency_code_bank_name_key UNIQUE (currency_code, bank_name);

--
-- Name: market_fx_rates market_fx_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_fx_rates
    ADD CONSTRAINT market_fx_rates_pkey PRIMARY KEY (id);

--
-- Name: market_lending_rates market_lending_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_lending_rates
    ADD CONSTRAINT market_lending_rates_pkey PRIMARY KEY (id);

--
-- Name: market_lending_rates market_lending_rates_product_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_lending_rates
    ADD CONSTRAINT market_lending_rates_product_key UNIQUE (product);

--
-- Name: market_news market_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_pkey PRIMARY KEY (id);

--
-- Name: market_preferences market_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_preferences
    ADD CONSTRAINT market_preferences_pkey PRIMARY KEY (user_id);

--
-- Name: market_stories market_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_stories
    ADD CONSTRAINT market_stories_pkey PRIMARY KEY (id);

--
-- Name: market_stories market_stories_story_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_stories
    ADD CONSTRAINT market_stories_story_key_key UNIQUE (story_key);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: offer_listing offer_listing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_listing
    ADD CONSTRAINT offer_listing_pkey PRIMARY KEY (id);

--
-- Name: request_allocations request_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_allocations
    ADD CONSTRAINT request_allocations_pkey PRIMARY KEY (id);

--
-- Name: request_decisions request_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_decisions
    ADD CONSTRAINT request_decisions_pkey PRIMARY KEY (id);

--
-- Name: request_invitation request_invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_invitation
    ADD CONSTRAINT request_invitation_pkey PRIMARY KEY (id);

--
-- Name: request_invitation request_invitation_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_invitation
    ADD CONSTRAINT request_invitation_token_hash_key UNIQUE (token_hash);

--
-- Name: request_message_template request_message_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_message_template
    ADD CONSTRAINT request_message_template_pkey PRIMARY KEY (code);

--
-- Name: request_messages request_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_messages
    ADD CONSTRAINT request_messages_pkey PRIMARY KEY (id);

--
-- Name: request_participant request_participant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_participant
    ADD CONSTRAINT request_participant_pkey PRIMARY KEY (id);

--
-- Name: request_participant request_participant_request_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_participant
    ADD CONSTRAINT request_participant_request_id_client_id_key UNIQUE (request_id, client_id);

--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);

--
-- Name: client_loan_details uq_loan_client_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_loan_details
    ADD CONSTRAINT uq_loan_client_type UNIQUE (client_id, loan_type);

--
-- Name: api_traffic_hour_hour_idx; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX api_traffic_hour_hour_idx ON admin.api_traffic_hour USING btree (hour);

--
-- Name: idx_admin_audit_action; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_audit_action ON admin.audit_events USING btree (action_category);

--
-- Name: idx_admin_audit_admin_id; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_audit_admin_id ON admin.audit_events USING btree (admin_id);

--
-- Name: idx_admin_audit_created_at; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_audit_created_at ON admin.audit_events USING btree (created_at DESC);

--
-- Name: idx_admin_audit_institution_id; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_audit_institution_id ON admin.audit_events USING btree (institution_id);

--
-- Name: idx_admin_platform_config_key; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_platform_config_key ON admin.platform_config USING btree (key);

--
-- Name: idx_admin_users_role; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_users_role ON admin.admin_users USING btree (role);

--
-- Name: idx_admin_users_user_id; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX idx_admin_users_user_id ON admin.admin_users USING btree (user_id);

--
-- Name: platform_config_updated_by_fk_idx; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX platform_config_updated_by_fk_idx ON admin.platform_config USING btree (updated_by);

--
-- Name: sync_log_aggregate_idx; Type: INDEX; Schema: admin; Owner: -
--

CREATE INDEX sync_log_aggregate_idx ON admin.sync_log USING btree (aggregate_type, aggregate_id, aggregate_version DESC);

--
-- Name: conversation_user_idx; Type: INDEX; Schema: fico; Owner: -
--

CREATE INDEX conversation_user_idx ON fico.conversation USING btree (user_id, started_at DESC);

--
-- Name: message_conversation_idx; Type: INDEX; Schema: fico; Owner: -
--

CREATE INDEX message_conversation_idx ON fico.message USING btree (conversation_id, created_at);

--
-- Name: message_user_id_fk_idx; Type: INDEX; Schema: fico; Owner: -
--

CREATE INDEX message_user_id_fk_idx ON fico.message USING btree (user_id);

--
-- Name: idx_finance_accounts_user; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX idx_finance_accounts_user ON finance.accounts USING btree (user_id);

--
-- Name: idx_finance_holdings_symbol; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX idx_finance_holdings_symbol ON finance.holdings USING btree (symbol, exchange);

--
-- Name: idx_finance_holdings_user; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX idx_finance_holdings_user ON finance.holdings USING btree (user_id);

--
-- Name: bid_shadow_request_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX bid_shadow_request_idx ON integration.bid_shadow USING btree (request_id);

--
-- Name: deal_documents_request_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX deal_documents_request_idx ON integration.deal_documents USING btree (request_id);

--
-- Name: deal_progress_request_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX deal_progress_request_idx ON integration.deal_progress USING btree (request_id);

--
-- Name: document_submission_deal_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX document_submission_deal_idx ON integration.document_submission USING btree (pipeline_id, requirement_id);

--
-- Name: document_submission_vault_document_id_fk_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX document_submission_vault_document_id_fk_idx ON integration.document_submission USING btree (vault_document_id);

--
-- Name: identity_release_client_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX identity_release_client_idx ON integration.identity_release USING btree (client_id, prepared_at DESC);

--
-- Name: outbox_due_idx; Type: INDEX; Schema: integration; Owner: -
--

CREATE INDEX outbox_due_idx ON integration.outbox USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'sending'::text]));

--
-- Name: activity_events_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_events_client_idx ON public.activity_events USING btree (client_id, created_at DESC);

--
-- Name: activity_events_request_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_events_request_id_fk_idx ON public.activity_events USING btree (request_id);

--
-- Name: activity_events_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_events_unread_idx ON public.activity_events USING btree (client_id, read_at) WHERE (read_at IS NULL);

--
-- Name: advisor_messages_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX advisor_messages_user_created_idx ON public.advisor_messages USING btree (user_id, created_at DESC);

--
-- Name: app_client_seen_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_client_seen_recent_idx ON public.app_client_seen USING btree (last_seen_at);

--
-- Name: app_error_report_by_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_error_report_by_version_idx ON public.app_error_report USING btree (day, platform, app_version, fingerprint);

--
-- Name: app_error_report_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_error_report_client_id_fk_idx ON public.app_error_report USING btree (client_id);

--
-- Name: bid_acceptances_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bid_acceptances_client_id_fk_idx ON public.bid_acceptances USING btree (client_id);

--
-- Name: bid_acceptances_request_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX bid_acceptances_request_uniq ON public.bid_acceptances USING btree (request_id);

--
-- Name: client_vault_property_deed_document_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_vault_property_deed_document_id_fk_idx ON public.client_vault_property USING btree (deed_document_id);

--
-- Name: client_vault_property_valuation_doc_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_vault_property_valuation_doc_id_fk_idx ON public.client_vault_property USING btree (valuation_doc_id);

--
-- Name: couple_link_client_a_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX couple_link_client_a_idx ON public.couple_link USING btree (client_a_id);

--
-- Name: couple_link_client_b_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX couple_link_client_b_idx ON public.couple_link USING btree (client_b_id);

--
-- Name: couple_link_initiated_by_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX couple_link_initiated_by_client_id_fk_idx ON public.couple_link USING btree (initiated_by_client_id);

--
-- Name: couple_relationship_document_reviewed_by_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX couple_relationship_document_reviewed_by_fk_idx ON public.couple_relationship_document USING btree (reviewed_by);

--
-- Name: couple_relationship_document_uploaded_by_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX couple_relationship_document_uploaded_by_client_id_fk_idx ON public.couple_relationship_document USING btree (uploaded_by_client_id);

--
-- Name: couple_relationship_document_vault_document_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX couple_relationship_document_vault_document_id_fk_idx ON public.couple_relationship_document USING btree (vault_document_id);

--
-- Name: docs_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX docs_client_idx ON public.client_documents USING btree (client_id, created_at DESC);

--
-- Name: docs_journey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX docs_journey_idx ON public.client_documents USING btree (journey_id);

--
-- Name: idx_audit_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_institution ON public.audit_logs USING btree (institution_id, created_at DESC);

--
-- Name: idx_audit_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_resource ON public.audit_logs USING btree (resource_id, resource_type);

--
-- Name: idx_ba_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ba_inst ON public.bid_acceptances USING btree (institution_id);

--
-- Name: idx_ba_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ba_request ON public.bid_acceptances USING btree (request_id);

--
-- Name: idx_client_loan_details_client_outstanding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_loan_details_client_outstanding ON public.client_loan_details USING btree (client_id, outstanding_amount DESC);

--
-- Name: idx_market_data_ticker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_data_ticker_id ON public.market_data USING btree (ticker_id);

--
-- Name: idx_market_fx_currency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_fx_currency_code ON public.market_fx_rates USING btree (currency_code);

--
-- Name: idx_market_news_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_market_news_content_hash ON public.market_news USING btree (content_hash) WHERE (content_hash IS NOT NULL);

--
-- Name: idx_market_news_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_news_published_at ON public.market_news USING btree (published_at DESC);

--
-- Name: idx_market_news_scope_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_news_scope_published ON public.market_news USING btree (scope, published_at DESC);

--
-- Name: idx_market_stories_generated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_stories_generated ON public.market_stories USING btree (generated_at DESC);

--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);

--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);

--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);

--
-- Name: idx_public_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_audit_action ON public.audit_events USING btree (action_category);

--
-- Name: idx_public_audit_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_audit_actor_id ON public.audit_events USING btree (actor_id);

--
-- Name: idx_public_audit_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_audit_client_id ON public.audit_events USING btree (client_id);

--
-- Name: idx_public_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_audit_created_at ON public.audit_events USING btree (created_at DESC);

--
-- Name: idx_request_allocations_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_allocations_request_id ON public.request_allocations USING btree (request_id, sort_order);

--
-- Name: idx_request_decisions_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_decisions_request_id ON public.request_decisions USING btree (request_id);

--
-- Name: idx_requests_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_client_id ON public.requests USING btree (client_id);

--
-- Name: idx_requests_open_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_open_created ON public.requests USING btree (created_at DESC) WHERE (status = 'open'::public.request_status);

--
-- Name: idx_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_status ON public.requests USING btree (status);

--
-- Name: idx_requests_updated_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_updated_at_id ON public.requests USING btree (updated_at, id);

--
-- Name: idx_vault_doc_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vault_doc_client ON public.client_vault_document USING btree (client_id);

--
-- Name: idx_vault_doc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vault_doc_status ON public.client_vault_document USING btree (extract_status);

--
-- Name: idx_vault_doc_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vault_doc_type ON public.client_vault_document USING btree (doc_type);

--
-- Name: idx_vault_log_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vault_log_doc ON public.client_vault_access_log USING btree (document_id);

--
-- Name: idx_vault_prop_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vault_prop_client ON public.client_vault_property USING btree (client_id);

--
-- Name: idx_vault_prop_client_addr; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vault_prop_client_addr ON public.client_vault_property USING btree (client_id, address) WHERE (address IS NOT NULL);

--
-- Name: kyc_scan_attempts_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kyc_scan_attempts_client_id_fk_idx ON public.kyc_scan_attempts USING btree (client_id);

--
-- Name: kyc_scan_attempts_ip_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kyc_scan_attempts_ip_created_idx ON public.kyc_scan_attempts USING btree (ip_hash, created_at);

--
-- Name: kyc_submissions_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kyc_submissions_client_id_fk_idx ON public.kyc_submissions USING btree (client_id);

--
-- Name: offer_listing_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offer_listing_live_idx ON public.offer_listing USING btree (live_until, published_at DESC);

--
-- Name: request_invitation_active_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX request_invitation_active_uniq ON public.request_invitation USING btree (request_id, invited_email) WHERE (status = 'pending'::public.invitation_status);

--
-- Name: request_invitation_invited_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_invitation_invited_client_id_fk_idx ON public.request_invitation USING btree (invited_client_id);

--
-- Name: request_invitation_inviter_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_invitation_inviter_client_id_fk_idx ON public.request_invitation USING btree (inviter_client_id);

--
-- Name: request_invitation_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_invitation_request_idx ON public.request_invitation USING btree (request_id);

--
-- Name: request_invitation_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_invitation_token_idx ON public.request_invitation USING btree (token_hash);

--
-- Name: request_messages_request_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_messages_request_id_created_at_idx ON public.request_messages USING btree (request_id, created_at);

--
-- Name: request_messages_request_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_messages_request_id_idx ON public.request_messages USING btree (request_id, created_at);

--
-- Name: request_messages_template_code_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_messages_template_code_fk_idx ON public.request_messages USING btree (template_code);

--
-- Name: request_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_messages_thread_idx ON public.request_messages USING btree (request_id, institution_id, created_at);

--
-- Name: request_participant_client_id_fk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_participant_client_id_fk_idx ON public.request_participant USING btree (client_id);

--
-- Name: requests_relisted_from_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX requests_relisted_from_uniq ON public.requests USING btree (relisted_from) WHERE (relisted_from IS NOT NULL);

--
-- Name: snapshot_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX snapshot_client_idx ON public.client_financial_snapshot USING btree (client_id);

--
-- Name: sync_log sync_log_worm; Type: TRIGGER; Schema: admin; Owner: -
--

CREATE TRIGGER sync_log_worm BEFORE DELETE OR UPDATE ON admin.sync_log FOR EACH ROW EXECUTE FUNCTION admin._sync_log_worm();

--
-- Name: sync_log sync_log_worm_trunc; Type: TRIGGER; Schema: admin; Owner: -
--

CREATE TRIGGER sync_log_worm_trunc BEFORE TRUNCATE ON admin.sync_log FOR EACH STATEMENT EXECUTE FUNCTION admin._sync_log_worm();

--
-- Name: platform_config trg_admin_config_upd; Type: TRIGGER; Schema: admin; Owner: -
--

CREATE TRIGGER trg_admin_config_upd BEFORE UPDATE ON admin.platform_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: admin_users trg_admin_users_upd; Type: TRIGGER; Schema: admin; Owner: -
--

CREATE TRIGGER trg_admin_users_upd BEFORE UPDATE ON admin.admin_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: accounts finance_accounts_updated_at; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER finance_accounts_updated_at BEFORE UPDATE ON finance.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

--
-- Name: holdings finance_holdings_updated_at; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER finance_holdings_updated_at BEFORE UPDATE ON finance.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

--
-- Name: accounts recompute_on_account_change; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER recompute_on_account_change AFTER INSERT OR DELETE OR UPDATE ON finance.accounts FOR EACH ROW EXECUTE FUNCTION finance.trg_recompute_on_account_change();

--
-- Name: holdings recompute_on_holding_change; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER recompute_on_holding_change AFTER INSERT OR DELETE OR UPDATE ON finance.holdings FOR EACH ROW EXECUTE FUNCTION finance.trg_recompute_on_account_change();

--
-- Name: holding_prices recompute_on_price_change; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER recompute_on_price_change AFTER INSERT OR UPDATE ON finance.holding_prices FOR EACH ROW EXECUTE FUNCTION finance.trg_recompute_on_price_change();

--
-- Name: account_closures account_closures_forget_app_client; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER account_closures_forget_app_client AFTER INSERT ON public.account_closures FOR EACH ROW EXECUTE FUNCTION public._app_client_seen_forget();

--
-- Name: audit_logs audit_logs_append_only_row; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_logs_append_only_row BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_logs_append_only();

--
-- Name: audit_logs audit_logs_append_only_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_logs_append_only_truncate BEFORE TRUNCATE ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.audit_logs_append_only();

--
-- Name: clients clients_guard_kyc_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER clients_guard_kyc_status BEFORE INSERT OR UPDATE OF kyc_status ON public.clients FOR EACH ROW EXECUTE FUNCTION public.guard_client_kyc_status();

--
-- Name: compliance_details compliance_propagate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER compliance_propagate AFTER INSERT OR DELETE OR UPDATE ON public.compliance_details FOR EACH ROW EXECUTE FUNCTION public.trg_user_inputs_propagate();

--
-- Name: client_dossier dossier_derive; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dossier_derive BEFORE INSERT OR UPDATE ON public.client_dossier FOR EACH ROW EXECUTE FUNCTION public.trg_dossier_derive();

--
-- Name: client_dossier dossier_propagate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dossier_propagate AFTER INSERT OR UPDATE ON public.client_dossier FOR EACH ROW EXECUTE FUNCTION public.trg_dossier_propagate();

--
-- Name: employment_details employment_propagate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employment_propagate AFTER INSERT OR DELETE OR UPDATE ON public.employment_details FOR EACH ROW EXECUTE FUNCTION public.trg_user_inputs_propagate();

--
-- Name: request_allocations integration_allocation_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integration_allocation_events AFTER INSERT OR DELETE OR UPDATE ON public.request_allocations FOR EACH ROW EXECUTE FUNCTION integration.trg_allocations_emit();

--
-- Name: requests integration_request_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integration_request_events AFTER INSERT OR UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION integration.trg_requests_emit();

--
-- Name: client_loan_details loans_propagate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER loans_propagate AFTER INSERT OR DELETE OR UPDATE ON public.client_loan_details FOR EACH ROW EXECUTE FUNCTION public.trg_loans_propagate();

--
-- Name: bid_acceptances on_bid_accepted_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_bid_accepted_audit AFTER INSERT ON public.bid_acceptances FOR EACH ROW EXECUTE FUNCTION public.trg_audit_bid_accepted();

--
-- Name: clients on_client_kyc_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_client_kyc_change AFTER UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.trg_audit_kyc_change();

--
-- Name: requests on_request_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_request_created AFTER INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.handle_request_created();

--
-- Name: requests on_request_created_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_request_created_audit AFTER INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.trg_audit_request_created();

--
-- Name: request_messages request_messages_enforce_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER request_messages_enforce_trg BEFORE INSERT OR UPDATE ON public.request_messages FOR EACH ROW EXECUTE FUNCTION public.request_messages_enforce();

--
-- Name: client_vault_document set_vault_doc_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_vault_doc_updated_at BEFORE UPDATE ON public.client_vault_document FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: client_vault_property set_vault_prop_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_vault_prop_updated_at BEFORE UPDATE ON public.client_vault_property FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: client_financial_snapshot snapshot_derive; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER snapshot_derive BEFORE INSERT OR UPDATE ON public.client_financial_snapshot FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_derive();

--
-- Name: client_financial_snapshot snapshot_propagate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER snapshot_propagate AFTER INSERT OR UPDATE ON public.client_financial_snapshot FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_propagate();

--
-- Name: client_financial_snapshot snapshot_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER snapshot_updated_at BEFORE UPDATE ON public.client_financial_snapshot FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

--
-- Name: client_documents trg_doc_readiness; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_doc_readiness AFTER INSERT OR UPDATE OF verified ON public.client_documents FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_goal_readiness();

--
-- Name: kyc_settings trg_guard_kyc_settings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_kyc_settings BEFORE INSERT OR DELETE OR UPDATE ON public.kyc_settings FOR EACH ROW EXECUTE FUNCTION admin.guard_kyc_settings();

--
-- Name: requests trg_requests_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_requests_touch_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

--
-- Name: client_vault_document trg_vault_extract; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vault_extract AFTER INSERT ON public.client_vault_document FOR EACH ROW EXECUTE FUNCTION vault_extract.on_document_upload();

--
-- Name: admin_users admin_users_user_id_fkey; Type: FK CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

--
-- Name: audit_events audit_events_admin_id_fkey; Type: FK CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.audit_events
    ADD CONSTRAINT audit_events_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES admin.admin_users(id) ON DELETE SET NULL;

--
-- Name: platform_config platform_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: admin; Owner: -
--

ALTER TABLE ONLY admin.platform_config
    ADD CONSTRAINT platform_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

--
-- Name: conversation conversation_user_id_fkey; Type: FK CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.conversation
    ADD CONSTRAINT conversation_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: message message_conversation_id_fkey; Type: FK CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.message
    ADD CONSTRAINT message_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES fico.conversation(id) ON DELETE CASCADE;

--
-- Name: message_meter message_meter_user_id_fkey; Type: FK CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.message_meter
    ADD CONSTRAINT message_meter_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: message message_user_id_fkey; Type: FK CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.message
    ADD CONSTRAINT message_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: profile profile_user_id_fkey; Type: FK CONSTRAINT; Schema: fico; Owner: -
--

ALTER TABLE ONLY fico.profile
    ADD CONSTRAINT profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: holdings holdings_user_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.holdings
    ADD CONSTRAINT holdings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: net_worth_history net_worth_history_user_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.net_worth_history
    ADD CONSTRAINT net_worth_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: document_submission document_submission_vault_document_id_fkey; Type: FK CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.document_submission
    ADD CONSTRAINT document_submission_vault_document_id_fkey FOREIGN KEY (vault_document_id) REFERENCES public.client_vault_document(id);

--
-- Name: activity_events activity_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: activity_events activity_events_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;

--
-- Name: advisor_messages advisor_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_messages
    ADD CONSTRAINT advisor_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: ai_usage ai_usage_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: app_client_seen app_client_seen_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_client_seen
    ADD CONSTRAINT app_client_seen_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: app_error_report app_error_report_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_error_report
    ADD CONSTRAINT app_error_report_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: audit_events audit_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

--
-- Name: bid_acceptances bid_acceptances_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_acceptances
    ADD CONSTRAINT bid_acceptances_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id);

--
-- Name: client_documents client_documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: client_dossier client_dossier_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_dossier
    ADD CONSTRAINT client_dossier_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: client_financial_snapshot client_financial_snapshot_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_financial_snapshot
    ADD CONSTRAINT client_financial_snapshot_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: client_loan_details client_loan_details_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_loan_details
    ADD CONSTRAINT client_loan_details_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: client_vault_access_log client_vault_access_log_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_access_log
    ADD CONSTRAINT client_vault_access_log_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.client_vault_document(id);

--
-- Name: client_vault_document client_vault_document_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_document
    ADD CONSTRAINT client_vault_document_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: client_vault_property client_vault_property_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_property
    ADD CONSTRAINT client_vault_property_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: client_vault_property client_vault_property_deed_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_property
    ADD CONSTRAINT client_vault_property_deed_document_id_fkey FOREIGN KEY (deed_document_id) REFERENCES public.client_vault_document(id);

--
-- Name: client_vault_property client_vault_property_valuation_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_vault_property
    ADD CONSTRAINT client_vault_property_valuation_doc_id_fkey FOREIGN KEY (valuation_doc_id) REFERENCES public.client_vault_document(id);

--
-- Name: couple_link couple_link_client_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_link
    ADD CONSTRAINT couple_link_client_a_id_fkey FOREIGN KEY (client_a_id) REFERENCES public.clients(id);

--
-- Name: couple_link couple_link_client_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_link
    ADD CONSTRAINT couple_link_client_b_id_fkey FOREIGN KEY (client_b_id) REFERENCES public.clients(id);

--
-- Name: couple_link couple_link_initiated_by_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_link
    ADD CONSTRAINT couple_link_initiated_by_client_id_fkey FOREIGN KEY (initiated_by_client_id) REFERENCES public.clients(id);

--
-- Name: couple_relationship_document couple_relationship_document_couple_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_relationship_document
    ADD CONSTRAINT couple_relationship_document_couple_link_id_fkey FOREIGN KEY (couple_link_id) REFERENCES public.couple_link(id) ON DELETE CASCADE;

--
-- Name: couple_relationship_document couple_relationship_document_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_relationship_document
    ADD CONSTRAINT couple_relationship_document_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.clients(id);

--
-- Name: couple_relationship_document couple_relationship_document_uploaded_by_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_relationship_document
    ADD CONSTRAINT couple_relationship_document_uploaded_by_client_id_fkey FOREIGN KEY (uploaded_by_client_id) REFERENCES public.clients(id);

--
-- Name: couple_relationship_document couple_relationship_document_vault_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couple_relationship_document
    ADD CONSTRAINT couple_relationship_document_vault_document_id_fkey FOREIGN KEY (vault_document_id) REFERENCES public.client_vault_document(id);

--
-- Name: kyc_scan_attempts kyc_scan_attempts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_scan_attempts
    ADD CONSTRAINT kyc_scan_attempts_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Name: kyc_submissions kyc_submissions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_submissions
    ADD CONSTRAINT kyc_submissions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

--
-- Name: market_preferences market_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_preferences
    ADD CONSTRAINT market_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: request_allocations request_allocations_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_allocations
    ADD CONSTRAINT request_allocations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

--
-- Name: request_decisions request_decisions_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_decisions
    ADD CONSTRAINT request_decisions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

--
-- Name: request_invitation request_invitation_invited_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_invitation
    ADD CONSTRAINT request_invitation_invited_client_id_fkey FOREIGN KEY (invited_client_id) REFERENCES public.clients(id);

--
-- Name: request_invitation request_invitation_inviter_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_invitation
    ADD CONSTRAINT request_invitation_inviter_client_id_fkey FOREIGN KEY (inviter_client_id) REFERENCES public.clients(id);

--
-- Name: request_invitation request_invitation_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_invitation
    ADD CONSTRAINT request_invitation_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

--
-- Name: request_messages request_messages_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_messages
    ADD CONSTRAINT request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

--
-- Name: request_messages request_messages_template_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_messages
    ADD CONSTRAINT request_messages_template_fk FOREIGN KEY (template_code) REFERENCES public.request_message_template(code);

--
-- Name: request_participant request_participant_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_participant
    ADD CONSTRAINT request_participant_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);

--
-- Name: request_participant request_participant_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_participant
    ADD CONSTRAINT request_participant_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

--
-- Name: requests requests_relisted_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_relisted_from_fkey FOREIGN KEY (relisted_from) REFERENCES public.requests(id) ON DELETE SET NULL;

--
-- Name: audit_events admin_audit_insert; Type: POLICY; Schema: admin; Owner: -
--

CREATE POLICY admin_audit_insert ON admin.audit_events FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin.admin_users
  WHERE ((admin_users.id = ( SELECT auth.uid() AS uid)) AND (admin_users.active = true)))));

--
-- Name: audit_events admin_audit_select; Type: POLICY; Schema: admin; Owner: -
--

CREATE POLICY admin_audit_select ON admin.audit_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin.admin_users
  WHERE ((admin_users.id = ( SELECT auth.uid() AS uid)) AND (admin_users.active = true)))));

--
-- Name: admin_users; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: api_channel_policy; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.api_channel_policy ENABLE ROW LEVEL SECURITY;

--
-- Name: api_channel_status; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.api_channel_status ENABLE ROW LEVEL SECURITY;

--
-- Name: api_traffic_hour; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.api_traffic_hour ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_config ficium_admin_config; Type: POLICY; Schema: admin; Owner: -
--

CREATE POLICY ficium_admin_config ON admin.platform_config TO authenticated USING ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'ficium_admin'::text)) WITH CHECK ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'ficium_admin'::text));

--
-- Name: admin_users ficium_admin_users; Type: POLICY; Schema: admin; Owner: -
--

CREATE POLICY ficium_admin_users ON admin.admin_users TO authenticated USING ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'ficium_admin'::text)) WITH CHECK ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'ficium_admin'::text));

--
-- Name: kyc_settings_change; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.kyc_settings_change ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_config; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.platform_config ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migration; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.schema_migration ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_log; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_state; Type: ROW SECURITY; Schema: admin; Owner: -
--

ALTER TABLE admin.sync_state ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation; Type: ROW SECURITY; Schema: fico; Owner: -
--

ALTER TABLE fico.conversation ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation conversation_owner; Type: POLICY; Schema: fico; Owner: -
--

CREATE POLICY conversation_owner ON fico.conversation FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: message; Type: ROW SECURITY; Schema: fico; Owner: -
--

ALTER TABLE fico.message ENABLE ROW LEVEL SECURITY;

--
-- Name: message_meter; Type: ROW SECURITY; Schema: fico; Owner: -
--

ALTER TABLE fico.message_meter ENABLE ROW LEVEL SECURITY;

--
-- Name: message message_owner; Type: POLICY; Schema: fico; Owner: -
--

CREATE POLICY message_owner ON fico.message FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: message_meter meter_owner_read; Type: POLICY; Schema: fico; Owner: -
--

CREATE POLICY meter_owner_read ON fico.message_meter FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: profile; Type: ROW SECURITY; Schema: fico; Owner: -
--

ALTER TABLE fico.profile ENABLE ROW LEVEL SECURITY;

--
-- Name: profile profile_owner; Type: POLICY; Schema: fico; Owner: -
--

CREATE POLICY profile_owner ON fico.profile FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: accounts; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts accounts_owner_all; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY accounts_owner_all ON finance.accounts TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: holding_prices; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.holding_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: holding_prices holding_prices_read_all; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY holding_prices_read_all ON finance.holding_prices FOR SELECT TO authenticated USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

--
-- Name: holdings; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.holdings ENABLE ROW LEVEL SECURITY;

--
-- Name: holdings holdings_owner_all; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY holdings_owner_all ON finance.holdings TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: net_worth_history; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.net_worth_history ENABLE ROW LEVEL SECURITY;

--
-- Name: net_worth_history net_worth_history_owner_insert; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY net_worth_history_owner_insert ON finance.net_worth_history FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: net_worth_history net_worth_history_owner_select; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY net_worth_history_owner_select ON finance.net_worth_history FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: net_worth_history net_worth_history_owner_update; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY net_worth_history_owner_update ON finance.net_worth_history FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: aggregate_sequence; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.aggregate_sequence ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_shadow; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.bid_shadow ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_refused; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.chat_refused ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_documents; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.deal_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_progress; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.deal_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: document_submission; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.document_submission ENABLE ROW LEVEL SECURITY;

--
-- Name: emit_error; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.emit_error ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_release; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.identity_release ENABLE ROW LEVEL SECURITY;

--
-- Name: inbox; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.inbox ENABLE ROW LEVEL SECURITY;

--
-- Name: inbox_watermark; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.inbox_watermark ENABLE ROW LEVEL SECURITY;

--
-- Name: market_snapshot; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.market_snapshot ENABLE ROW LEVEL SECURITY;

--
-- Name: outbox; Type: ROW SECURITY; Schema: integration; Owner: -
--

ALTER TABLE integration.outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: request_allocations Clients create own request allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients create own request allocations" ON public.request_allocations FOR INSERT TO authenticated WITH CHECK ((request_id IN ( SELECT requests.id
   FROM public.requests
  WHERE (requests.client_id = ( SELECT auth.uid() AS uid)))));

--
-- Name: requests Clients create own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients create own requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND (status = 'open'::public.request_status) AND (accepted_bid_id IS NULL) AND (relisted_from IS NULL)));

--
-- Name: request_allocations Clients read own request allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients read own request allocations" ON public.request_allocations FOR SELECT TO authenticated USING ((request_id IN ( SELECT requests.id
   FROM public.requests
  WHERE (requests.client_id = ( SELECT auth.uid() AS uid)))));

--
-- Name: requests Clients read own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients read own requests" ON public.requests FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: activity_events Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.activity_events TO postgres USING (true) WITH CHECK (true);

--
-- Name: audit_events Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.audit_events TO postgres USING (true) WITH CHECK (true);

--
-- Name: bid_acceptances Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.bid_acceptances TO postgres USING (true) WITH CHECK (true);

--
-- Name: client_dossier Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.client_dossier TO postgres USING (true) WITH CHECK (true);

--
-- Name: client_financial_snapshot Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.client_financial_snapshot TO postgres USING (true) WITH CHECK (true);

--
-- Name: client_loan_details Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.client_loan_details TO postgres USING (true) WITH CHECK (true);

--
-- Name: clients Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.clients TO postgres USING (true) WITH CHECK (true);

--
-- Name: employment_details Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.employment_details TO postgres USING (true) WITH CHECK (true);

--
-- Name: kyc_scan_attempts Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.kyc_scan_attempts TO postgres USING (true) WITH CHECK (true);

--
-- Name: kyc_submissions Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.kyc_submissions TO postgres USING (true) WITH CHECK (true);

--
-- Name: requests Postgres role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postgres role full access" ON public.requests TO postgres USING (true) WITH CHECK (true);

--
-- Name: activity_events Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.activity_events TO service_role USING (true) WITH CHECK (true);

--
-- Name: audit_events Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.audit_events TO service_role USING (true) WITH CHECK (true);

--
-- Name: bid_acceptances Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.bid_acceptances TO service_role USING (true) WITH CHECK (true);

--
-- Name: client_dossier Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.client_dossier TO service_role USING (true) WITH CHECK (true);

--
-- Name: client_financial_snapshot Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.client_financial_snapshot TO service_role USING (true) WITH CHECK (true);

--
-- Name: client_loan_details Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.client_loan_details TO service_role USING (true) WITH CHECK (true);

--
-- Name: clients Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.clients TO service_role USING (true) WITH CHECK (true);

--
-- Name: employment_details Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.employment_details TO service_role USING (true) WITH CHECK (true);

--
-- Name: kyc_scan_attempts Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.kyc_scan_attempts TO service_role USING (true) WITH CHECK (true);

--
-- Name: kyc_submissions Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.kyc_submissions TO service_role USING (true) WITH CHECK (true);

--
-- Name: requests Service role full access on requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access on requests" ON public.requests TO service_role USING (true) WITH CHECK (true);

--
-- Name: compliance_details Users manage own compliance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own compliance" ON public.compliance_details TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: employment_details Users manage own employment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own employment" ON public.employment_details TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: account_closures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_closures ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_events activity_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_insert ON public.activity_events FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: activity_events activity_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_select ON public.activity_events FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: activity_events activity_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_update ON public.activity_events FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: audit_logs admin_insert_audit_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_audit_logs ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_ficium_admin() AS is_ficium_admin));

--
-- Name: audit_logs admin_read_audit_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_read_audit_logs ON public.audit_logs FOR SELECT TO authenticated USING (( SELECT public.is_ficium_admin() AS is_ficium_admin));

--
-- Name: advisor_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.advisor_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: advisor_messages advisor_messages_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY advisor_messages_delete_own ON public.advisor_messages FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: advisor_messages advisor_messages_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY advisor_messages_insert_own ON public.advisor_messages FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: advisor_messages advisor_messages_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY advisor_messages_select_own ON public.advisor_messages FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: ai_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: app_client_seen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_client_seen ENABLE ROW LEVEL SECURITY;

--
-- Name: app_error_report; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_error_report ENABLE ROW LEVEL SECURITY;

--
-- Name: app_features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_features ENABLE ROW LEVEL SECURITY;

--
-- Name: app_features app_features_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_features_read ON public.app_features FOR SELECT USING (true);

--
-- Name: app_release_policy; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_release_policy ENABLE ROW LEVEL SECURITY;

--
-- Name: app_release_policy app_release_policy_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_release_policy_read ON public.app_release_policy FOR SELECT TO authenticated, anon USING (true);

--
-- Name: audit_events audit_client_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_client_select ON public.audit_events FOR SELECT TO authenticated USING (((client_id = ( SELECT auth.uid() AS uid)) OR (actor_id = ( SELECT auth.uid() AS uid))));

--
-- Name: audit_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events audit_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert_own ON public.audit_events FOR INSERT TO authenticated WITH CHECK (((client_id = ( SELECT auth.uid() AS uid)) AND (actor_id = ( SELECT auth.uid() AS uid))));

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_no_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_no_delete ON public.audit_logs AS RESTRICTIVE FOR DELETE USING (false);

--
-- Name: audit_logs audit_logs_no_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_no_update ON public.audit_logs AS RESTRICTIVE FOR UPDATE USING (false);

--
-- Name: bid_acceptances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bid_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: client_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: client_dossier; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_dossier ENABLE ROW LEVEL SECURITY;

--
-- Name: client_financial_snapshot; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_financial_snapshot ENABLE ROW LEVEL SECURITY;

--
-- Name: client_loan_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_loan_details ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_acceptances client_own_acceptances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_own_acceptances ON public.bid_acceptances TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: client_dossier client_own_dossier; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_own_dossier ON public.client_dossier TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: client_loan_details client_own_loan_details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_own_loan_details ON public.client_loan_details TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: clients client_own_row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_own_row ON public.clients TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

--
-- Name: audit_logs client_read_own_audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_read_own_audit ON public.audit_logs FOR SELECT TO authenticated USING ((actor_id = ( SELECT auth.uid() AS uid)));

--
-- Name: client_vault_access_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_vault_access_log ENABLE ROW LEVEL SECURITY;

--
-- Name: client_vault_document; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_vault_document ENABLE ROW LEVEL SECURITY;

--
-- Name: client_vault_property; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_vault_property ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_details ENABLE ROW LEVEL SECURITY;

--
-- Name: couple_link; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.couple_link ENABLE ROW LEVEL SECURITY;

--
-- Name: couple_link couple_link_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couple_link_select ON public.couple_link FOR SELECT TO authenticated USING (((client_a_id = ( SELECT auth.uid() AS uid)) OR (client_b_id = ( SELECT auth.uid() AS uid))));

--
-- Name: couple_relationship_document; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.couple_relationship_document ENABLE ROW LEVEL SECURITY;

--
-- Name: couple_relationship_document couple_relationship_document_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couple_relationship_document_select ON public.couple_relationship_document FOR SELECT TO authenticated USING (public.is_couple_member(couple_link_id, ( SELECT auth.uid() AS uid)));

--
-- Name: client_documents docs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY docs_delete ON public.client_documents FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_documents docs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY docs_insert ON public.client_documents FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_documents docs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY docs_select ON public.client_documents FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_documents docs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY docs_update ON public.client_documents FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: employment_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employment_details ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs inst_read_audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inst_read_audit ON public.audit_logs FOR SELECT TO authenticated USING ((institution_id = public.get_my_institution_id()));

--
-- Name: kyc_submissions kyc: users can read own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "kyc: users can read own submissions" ON public.kyc_submissions FOR SELECT TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: kyc_scan_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kyc_scan_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: kyc_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kyc_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: kyc_settings kyc_settings_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kyc_settings_admin_read ON public.kyc_settings FOR SELECT TO authenticated USING (public.is_ficium_admin());

--
-- Name: kyc_settings kyc_settings_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kyc_settings_admin_update ON public.kyc_settings FOR UPDATE TO authenticated USING (public.is_ficium_admin()) WITH CHECK (public.is_ficium_admin());

--
-- Name: kyc_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: market_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

--
-- Name: market_data market_data_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_data_read ON public.market_data FOR SELECT USING (true);

--
-- Name: market_deposit_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_deposit_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: market_deposit_rates market_deposit_rates_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_deposit_rates_read ON public.market_deposit_rates FOR SELECT USING (true);

--
-- Name: market_fx_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_fx_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: market_fx_rates market_fx_rates_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_fx_rates_read ON public.market_fx_rates FOR SELECT USING (true);

--
-- Name: market_lending_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_lending_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: market_lending_rates market_lending_rates_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_lending_rates_read ON public.market_lending_rates FOR SELECT USING (true);

--
-- Name: market_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

--
-- Name: market_news market_news_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_news_read ON public.market_news FOR SELECT USING (true);

--
-- Name: market_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: market_preferences market_preferences_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_preferences_delete_own ON public.market_preferences FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));

--
-- Name: market_preferences market_preferences_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_preferences_insert_own ON public.market_preferences FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

--
-- Name: market_preferences market_preferences_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_preferences_select_own ON public.market_preferences FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));

--
-- Name: market_preferences market_preferences_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_preferences_update_own ON public.market_preferences FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

--
-- Name: market_stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_stories ENABLE ROW LEVEL SECURITY;

--
-- Name: market_stories market_stories_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_stories_read ON public.market_stories FOR SELECT USING (true);

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_owner ON public.notifications TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: notifications notifications_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_service ON public.notifications TO service_role USING ((( SELECT auth.role() AS role) = 'service_role'::text));

--
-- Name: offer_listing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offer_listing ENABLE ROW LEVEL SECURITY;

--
-- Name: offer_listing offer_listing_read_live; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offer_listing_read_live ON public.offer_listing FOR SELECT TO authenticated USING ((live_until > now()));

--
-- Name: request_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: request_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: request_invitation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_invitation ENABLE ROW LEVEL SECURITY;

--
-- Name: request_invitation request_invitation_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_invitation_select ON public.request_invitation FOR SELECT TO authenticated USING (((inviter_client_id = ( SELECT auth.uid() AS uid)) OR (invited_client_id = ( SELECT auth.uid() AS uid)) OR public.is_request_participant(request_id, ( SELECT auth.uid() AS uid)) OR (lower(invited_email) = lower(COALESCE(public.current_client_email(), ''::text)))));

--
-- Name: request_message_template; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_message_template ENABLE ROW LEVEL SECURITY;

--
-- Name: request_message_template request_message_template_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_message_template_read ON public.request_message_template FOR SELECT USING (is_active);

--
-- Name: request_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: request_messages request_messages_client_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_messages_client_read ON public.request_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.requests r
  WHERE ((r.id = request_messages.request_id) AND (r.client_id = ( SELECT auth.uid() AS uid))))));

--
-- Name: request_participant; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_participant ENABLE ROW LEVEL SECURITY;

--
-- Name: request_participant request_participant_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_participant_select ON public.request_participant FOR SELECT TO authenticated USING (public.is_request_participant(request_id, ( SELECT auth.uid() AS uid)));

--
-- Name: requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_acceptances service_all_acceptances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_all_acceptances ON public.bid_acceptances TO service_role USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));

--
-- Name: client_financial_snapshot snapshot_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshot_delete ON public.client_financial_snapshot FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_financial_snapshot snapshot_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshot_insert ON public.client_financial_snapshot FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_financial_snapshot snapshot_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshot_select ON public.client_financial_snapshot FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_financial_snapshot snapshot_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshot_update ON public.client_financial_snapshot FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = client_id));

--
-- Name: client_vault_document vault_doc_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_doc_owner ON public.client_vault_document TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: client_vault_document vault_doc_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_doc_service ON public.client_vault_document TO service_role USING ((( SELECT auth.role() AS role) = 'service_role'::text));

--
-- Name: client_vault_access_log vault_log_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_log_owner_insert ON public.client_vault_access_log FOR INSERT TO authenticated WITH CHECK (((client_id = ( SELECT auth.uid() AS uid)) AND (actor_id = ( SELECT auth.uid() AS uid))));

--
-- Name: client_vault_access_log vault_log_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_log_owner_read ON public.client_vault_access_log FOR SELECT TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: client_vault_access_log vault_log_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_log_service ON public.client_vault_access_log TO service_role USING ((( SELECT auth.role() AS role) = 'service_role'::text));

--
-- Name: client_vault_property vault_prop_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_prop_owner ON public.client_vault_property TO authenticated USING ((client_id = ( SELECT auth.uid() AS uid)));

--
-- Name: client_vault_property vault_prop_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vault_prop_service ON public.client_vault_property TO service_role USING ((( SELECT auth.role() AS role) = 'service_role'::text));

--
-- Name: SCHEMA admin; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA admin TO service_role;

--
-- Name: SCHEMA fico; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA fico TO authenticated;
GRANT USAGE ON SCHEMA fico TO service_role;

--
-- Name: SCHEMA finance; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA finance TO authenticated;
GRANT USAGE ON SCHEMA finance TO anon;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

--
-- Name: FUNCTION _offer_actor(p_actor text); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._offer_actor(p_actor text) FROM PUBLIC;

--
-- Name: FUNCTION _sync_api_channel(p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_api_channel(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _sync_app_release(p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_app_release(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _sync_client_access(p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_client_access(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _sync_config(p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_config(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _sync_kyc(p_event_id uuid, p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_kyc(p_event_id uuid, p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _sync_kyc_decision(p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_kyc_decision(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _sync_log_worm(); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_log_worm() FROM PUBLIC;

--
-- Name: FUNCTION _sync_offer_upsert(p jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin._sync_offer_upsert(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION guard_kyc_settings(); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin.guard_kyc_settings() FROM PUBLIC;

--
-- Name: FUNCTION migration_applied(p_version text); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin.migration_applied(p_version text) FROM PUBLIC;

--
-- Name: FUNCTION sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin.sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb) FROM PUBLIC;

--
-- Name: FUNCTION trigger_outbox_dispatch(); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin.trigger_outbox_dispatch() FROM PUBLIC;

--
-- Name: FUNCTION write_admin_audit(p_action_category text, p_event_label text, p_institution_id uuid, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text, p_actor_ip inet); Type: ACL; Schema: admin; Owner: -
--

REVOKE ALL ON FUNCTION admin.write_admin_audit(p_action_category text, p_event_label text, p_institution_id uuid, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text, p_actor_ip inet) FROM PUBLIC;

--
-- Name: FUNCTION consume_message(p_user_id uuid, p_free_quota integer); Type: ACL; Schema: fico; Owner: -
--

REVOKE ALL ON FUNCTION fico.consume_message(p_user_id uuid, p_free_quota integer) FROM PUBLIC;
GRANT ALL ON FUNCTION fico.consume_message(p_user_id uuid, p_free_quota integer) TO authenticated;
GRANT ALL ON FUNCTION fico.consume_message(p_user_id uuid, p_free_quota integer) TO service_role;

--
-- Name: FUNCTION messages_remaining(p_user_id uuid, p_free_quota integer); Type: ACL; Schema: fico; Owner: -
--

REVOKE ALL ON FUNCTION fico.messages_remaining(p_user_id uuid, p_free_quota integer) FROM PUBLIC;
GRANT ALL ON FUNCTION fico.messages_remaining(p_user_id uuid, p_free_quota integer) TO authenticated;
GRANT ALL ON FUNCTION fico.messages_remaining(p_user_id uuid, p_free_quota integer) TO service_role;

--
-- Name: FUNCTION _pa_num(j jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration._pa_num(j jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _py_float(p text); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration._py_float(p text) FROM PUBLIC;

--
-- Name: FUNCTION _py_truthy(j jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration._py_truthy(j jsonb) FROM PUBLIC;

--
-- Name: FUNCTION _strip_top_nulls(j jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration._strip_top_nulls(j jsonb) FROM PUBLIC;

--
-- Name: FUNCTION anon_borrower_id(p_client uuid); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.anon_borrower_id(p_client uuid) FROM PUBLIC;

--
-- Name: FUNCTION apply_bid_event(p_env jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_bid_event(p_env jsonb) FROM PUBLIC;

--
-- Name: FUNCTION apply_chat_message_event(p_env jsonb, p_refuse text); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_chat_message_event(p_env jsonb, p_refuse text) FROM PUBLIC;

--
-- Name: FUNCTION apply_deal_documents_event(p_env jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_deal_documents_event(p_env jsonb) FROM PUBLIC;

--
-- Name: FUNCTION apply_deal_progress_event(p_env jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_deal_progress_event(p_env jsonb) FROM PUBLIC;

--
-- Name: FUNCTION apply_market_intelligence_event(p_env jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_market_intelligence_event(p_env jsonb) FROM PUBLIC;

--
-- Name: FUNCTION apply_request_declined_event(p_env jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_request_declined_event(p_env jsonb) FROM PUBLIC;

--
-- Name: FUNCTION apply_request_window_closed_event(p_env jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.apply_request_window_closed_event(p_env jsonb) FROM PUBLIC;

--
-- Name: FUNCTION backfill_request_events(); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.backfill_request_events() FROM PUBLIC;

--
-- Name: FUNCTION build_request_published(p_request_id uuid); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.build_request_published(p_request_id uuid) FROM PUBLIC;

--
-- Name: FUNCTION claim_batch(p_limit integer, p_lease_seconds integer); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.claim_batch(p_limit integer, p_lease_seconds integer) FROM PUBLIC;

--
-- Name: FUNCTION complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid) FROM PUBLIC;

--
-- Name: FUNCTION enqueue(p_type text, p_aggregate_id text, p_data jsonb, p_source text); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.enqueue(p_type text, p_aggregate_id text, p_data jsonb, p_source text) FROM PUBLIC;

--
-- Name: FUNCTION mark_delivered(p_id text); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.mark_delivered(p_id text) FROM PUBLIC;

--
-- Name: FUNCTION mark_failed(p_id text, p_error text); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.mark_failed(p_id text, p_error text) FROM PUBLIC;

--
-- Name: FUNCTION phase1_from_row(p jsonb); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.phase1_from_row(p jsonb) FROM PUBLIC;

--
-- Name: FUNCTION prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid) FROM PUBLIC;

--
-- Name: FUNCTION publish_request(p_request_id uuid); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.publish_request(p_request_id uuid) FROM PUBLIC;

--
-- Name: FUNCTION publish_status(p_request_id uuid, p_status text); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.publish_status(p_request_id uuid, p_status text) FROM PUBLIC;

--
-- Name: FUNCTION py_round1(x double precision); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.py_round1(x double precision) FROM PUBLIC;

--
-- Name: FUNCTION record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint) FROM PUBLIC;

--
-- Name: FUNCTION request_row(p_request_id uuid); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.request_row(p_request_id uuid) FROM PUBLIC;

--
-- Name: FUNCTION trg_allocations_emit(); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.trg_allocations_emit() FROM PUBLIC;

--
-- Name: FUNCTION trg_requests_emit(); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.trg_requests_emit() FROM PUBLIC;

--
-- Name: FUNCTION trigger_dispatch(); Type: ACL; Schema: integration; Owner: -
--

REVOKE ALL ON FUNCTION integration.trigger_dispatch() FROM PUBLIC;

--
-- Name: FUNCTION _app_client_seen_forget(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._app_client_seen_forget() FROM PUBLIC;
GRANT ALL ON FUNCTION public._app_client_seen_forget() TO postgres;

--
-- Name: FUNCTION _scrub_error_text(p_text text, p_max integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._scrub_error_text(p_text text, p_max integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public._scrub_error_text(p_text text, p_max integer) TO postgres;

--
-- Name: FUNCTION accept_request_invitation(p_token_hash bytea, p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.accept_request_invitation(p_token_hash bytea, p_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_request_invitation(p_token_hash bytea, p_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.accept_request_invitation(p_token_hash bytea, p_client_id uuid) TO service_role;

--
-- Name: FUNCTION admin_api_traffic_stats(p_channels text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_api_traffic_stats(p_channels text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_api_traffic_stats(p_channels text[]) TO postgres;
GRANT ALL ON FUNCTION public.admin_api_traffic_stats(p_channels text[]) TO service_role;

--
-- Name: FUNCTION admin_app_release_stats(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_app_release_stats() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_app_release_stats() TO postgres;
GRANT ALL ON FUNCTION public.admin_app_release_stats() TO service_role;

--
-- Name: FUNCTION admin_client_search(p_q text, p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_client_search(p_q text, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_client_search(p_q text, p_limit integer) TO postgres;
GRANT ALL ON FUNCTION public.admin_client_search(p_q text, p_limit integer) TO service_role;

--
-- Name: FUNCTION admin_client_summary(p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_client_summary(p_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_client_summary(p_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.admin_client_summary(p_client_id uuid) TO service_role;

--
-- Name: FUNCTION admin_kyc_case(p_submission uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_kyc_case(p_submission uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_kyc_case(p_submission uuid) TO postgres;
GRANT ALL ON FUNCTION public.admin_kyc_case(p_submission uuid) TO service_role;

--
-- Name: FUNCTION admin_kyc_cases(p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_kyc_cases(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_kyc_cases(p_limit integer) TO postgres;
GRANT ALL ON FUNCTION public.admin_kyc_cases(p_limit integer) TO service_role;

--
-- Name: FUNCTION admin_marketplace_stats(p_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_marketplace_stats(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_marketplace_stats(p_days integer) TO postgres;
GRANT ALL ON FUNCTION public.admin_marketplace_stats(p_days integer) TO service_role;

--
-- Name: FUNCTION admin_schema_status(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_schema_status() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_schema_status() TO postgres;
GRANT ALL ON FUNCTION public.admin_schema_status() TO service_role;

--
-- Name: FUNCTION admin_sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb) TO postgres;
GRANT ALL ON FUNCTION public.admin_sync_apply(p_event_id uuid, p_topic text, p_aggregate_type text, p_aggregate_id text, p_version bigint, p_payload jsonb) TO service_role;

--
-- Name: FUNCTION api_channel_policies(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_channel_policies() FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_channel_policies() TO postgres;
GRANT ALL ON FUNCTION public.api_channel_policies() TO service_role;

--
-- Name: FUNCTION api_traffic_record(p_rows jsonb, p_status jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_traffic_record(p_rows jsonb, p_status jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_traffic_record(p_rows jsonb, p_status jsonb) TO postgres;
GRANT ALL ON FUNCTION public.api_traffic_record(p_rows jsonb, p_status jsonb) TO service_role;

--
-- Name: FUNCTION audit_logs_append_only(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.audit_logs_append_only() FROM PUBLIC;
GRANT ALL ON FUNCTION public.audit_logs_append_only() TO postgres;

--
-- Name: FUNCTION can_release_request(p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.can_release_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_release_request(p_request_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.can_release_request(p_request_id uuid) TO service_role;

--
-- Name: FUNCTION cancel_request(p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.cancel_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_request(p_request_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.cancel_request(p_request_id uuid) TO authenticated;

--
-- Name: FUNCTION close_account(p_client_id uuid, p_retain_years integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.close_account(p_client_id uuid, p_retain_years integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.close_account(p_client_id uuid, p_retain_years integer) TO postgres;
GRANT ALL ON FUNCTION public.close_account(p_client_id uuid, p_retain_years integer) TO service_role;

--
-- Name: FUNCTION compute_client_scores(p jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.compute_client_scores(p jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.compute_client_scores(p jsonb) TO postgres;
GRANT ALL ON FUNCTION public.compute_client_scores(p jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.compute_client_scores(p jsonb) TO service_role;

--
-- Name: FUNCTION compute_goal_readiness(p_goal_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.compute_goal_readiness(p_goal_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.compute_goal_readiness(p_goal_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.compute_goal_readiness(p_goal_id uuid) TO service_role;

--
-- Name: FUNCTION consume_ai_quota(p_client_id uuid, p_kind text, p_daily_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.consume_ai_quota(p_client_id uuid, p_kind text, p_daily_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consume_ai_quota(p_client_id uuid, p_kind text, p_daily_limit integer) TO postgres;
GRANT ALL ON FUNCTION public.consume_ai_quota(p_client_id uuid, p_kind text, p_daily_limit integer) TO service_role;

--
-- Name: FUNCTION create_multi_product_request(p_amount numeric, p_purpose text, p_anonymized_brief text, p_preferred_term_months integer, p_max_rate numeric, p_decision_deadline timestamp with time zone, p_allocation_mode text, p_allocations jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_multi_product_request(p_amount numeric, p_purpose text, p_anonymized_brief text, p_preferred_term_months integer, p_max_rate numeric, p_decision_deadline timestamp with time zone, p_allocation_mode text, p_allocations jsonb) TO postgres;
GRANT ALL ON FUNCTION public.create_multi_product_request(p_amount numeric, p_purpose text, p_anonymized_brief text, p_preferred_term_months integer, p_max_rate numeric, p_decision_deadline timestamp with time zone, p_allocation_mode text, p_allocations jsonb) TO authenticated;

--
-- Name: FUNCTION create_notification(p_user_id uuid, p_kind public.notification_kind, p_title text, p_body text, p_link text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_notification(p_user_id uuid, p_kind public.notification_kind, p_title text, p_body text, p_link text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_kind public.notification_kind, p_title text, p_body text, p_link text) TO postgres;

--
-- Name: FUNCTION create_request_invitation(p_request_id uuid, p_inviter_client_id uuid, p_invited_email text, p_token_hash bytea, p_invited_phone text, p_channel public.invitation_channel, p_proposed_role public.participant_role, p_proposed_liability public.liability_type, p_proposed_ownership_bps integer, p_ttl_days integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_request_invitation(p_request_id uuid, p_inviter_client_id uuid, p_invited_email text, p_token_hash bytea, p_invited_phone text, p_channel public.invitation_channel, p_proposed_role public.participant_role, p_proposed_liability public.liability_type, p_proposed_ownership_bps integer, p_ttl_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_request_invitation(p_request_id uuid, p_inviter_client_id uuid, p_invited_email text, p_token_hash bytea, p_invited_phone text, p_channel public.invitation_channel, p_proposed_role public.participant_role, p_proposed_liability public.liability_type, p_proposed_ownership_bps integer, p_ttl_days integer) TO postgres;
GRANT ALL ON FUNCTION public.create_request_invitation(p_request_id uuid, p_inviter_client_id uuid, p_invited_email text, p_token_hash bytea, p_invited_phone text, p_channel public.invitation_channel, p_proposed_role public.participant_role, p_proposed_liability public.liability_type, p_proposed_ownership_bps integer, p_ttl_days integer) TO service_role;

--
-- Name: FUNCTION current_client_email(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.current_client_email() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_client_email() TO postgres;
GRANT ALL ON FUNCTION public.current_client_email() TO authenticated;
GRANT ALL ON FUNCTION public.current_client_email() TO service_role;

--
-- Name: FUNCTION decline_request_invitation(p_token_hash bytea); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.decline_request_invitation(p_token_hash bytea) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decline_request_invitation(p_token_hash bytea) TO postgres;
GRANT ALL ON FUNCTION public.decline_request_invitation(p_token_hash bytea) TO service_role;

--
-- Name: FUNCTION enqueue_webhook_events(p_institution_id uuid, p_event_type text, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_webhook_events(p_institution_id uuid, p_event_type text, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_webhook_events(p_institution_id uuid, p_event_type text, p_payload jsonb) TO postgres;

--
-- Name: FUNCTION expire_overdue_requests(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.expire_overdue_requests() FROM PUBLIC;
GRANT ALL ON FUNCTION public.expire_overdue_requests() TO postgres;

--
-- Name: FUNCTION expire_pending_actions(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.expire_pending_actions() FROM PUBLIC;
GRANT ALL ON FUNCTION public.expire_pending_actions() TO postgres;

--
-- Name: FUNCTION expire_stale_bids(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.expire_stale_bids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.expire_stale_bids() TO postgres;

--
-- Name: FUNCTION expire_stale_requests(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.expire_stale_requests() FROM PUBLIC;
GRANT ALL ON FUNCTION public.expire_stale_requests() TO postgres;

--
-- Name: FUNCTION finance_accounts_summary(p_reporting_currency text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_accounts_summary(p_reporting_currency text) TO postgres;

--
-- Name: FUNCTION finance_delete_account(p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_delete_account(p_id uuid) TO postgres;

--
-- Name: FUNCTION finance_delete_holding(p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_delete_holding(p_id uuid) TO postgres;

--
-- Name: TABLE net_worth_history; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.net_worth_history TO authenticated;

--
-- Name: FUNCTION finance_get_net_worth_history(p_days integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_get_net_worth_history(p_days integer) TO postgres;

--
-- Name: FUNCTION finance_holdings_summary(p_reporting_currency text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_holdings_summary(p_reporting_currency text) TO postgres;

--
-- Name: TABLE accounts; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.accounts TO authenticated;

--
-- Name: FUNCTION finance_list_accounts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_list_accounts() TO postgres;

--
-- Name: FUNCTION finance_upsert_account(p_id uuid, p_institution_name text, p_account_type text, p_currency text, p_balance numeric, p_notes text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_upsert_account(p_id uuid, p_institution_name text, p_account_type text, p_currency text, p_balance numeric, p_notes text) TO postgres;

--
-- Name: FUNCTION finance_upsert_holding(p_id uuid, p_asset_type text, p_symbol text, p_exchange text, p_quantity numeric, p_currency text, p_cost_basis numeric, p_notes text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finance_upsert_holding(p_id uuid, p_asset_type text, p_symbol text, p_exchange text, p_quantity numeric, p_currency text, p_cost_basis numeric, p_notes text) TO postgres;

--
-- Name: FUNCTION get_my_institution_id(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_my_institution_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_institution_id() TO postgres;
GRANT ALL ON FUNCTION public.get_my_institution_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_institution_id() TO service_role;

--
-- Name: FUNCTION get_my_role(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_role() TO postgres;
GRANT ALL ON FUNCTION public.get_my_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_role() TO service_role;

--
-- Name: FUNCTION get_or_create_couple_link(p_client_x uuid, p_client_y uuid, p_initiated_by uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_or_create_couple_link(p_client_x uuid, p_client_y uuid, p_initiated_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_or_create_couple_link(p_client_x uuid, p_client_y uuid, p_initiated_by uuid) TO postgres;
GRANT ALL ON FUNCTION public.get_or_create_couple_link(p_client_x uuid, p_client_y uuid, p_initiated_by uuid) TO service_role;

--
-- Name: FUNCTION guard_client_kyc_status(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_client_kyc_status() TO postgres;

--
-- Name: FUNCTION handle_bid_received(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_bid_received() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_bid_received() TO postgres;

--
-- Name: FUNCTION handle_kyc_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_kyc_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_kyc_change() TO postgres;

--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO postgres;

--
-- Name: FUNCTION handle_request_created(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_request_created() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_request_created() TO postgres;

--
-- Name: FUNCTION has_institution_role(p_role text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.has_institution_role(p_role text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_institution_role(p_role text) TO postgres;

--
-- Name: FUNCTION institution_has_module(p_institution_id uuid, p_module text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.institution_has_module(p_institution_id uuid, p_module text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.institution_has_module(p_institution_id uuid, p_module text) TO postgres;

--
-- Name: FUNCTION institution_is_active(p_institution_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.institution_is_active(p_institution_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.institution_is_active(p_institution_id uuid) TO postgres;

--
-- Name: FUNCTION integration_anon_borrower_id(p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_anon_borrower_id(p_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_anon_borrower_id(p_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.integration_anon_borrower_id(p_client_id uuid) TO service_role;

--
-- Name: FUNCTION integration_apply_bid_event(p_env jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_bid_event(p_env jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_bid_event(p_env jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_bid_event(p_env jsonb) TO service_role;

--
-- Name: FUNCTION integration_apply_chat_message_event(p_env jsonb, p_refuse text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_chat_message_event(p_env jsonb, p_refuse text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_chat_message_event(p_env jsonb, p_refuse text) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_chat_message_event(p_env jsonb, p_refuse text) TO service_role;

--
-- Name: FUNCTION integration_apply_deal_documents_event(p_env jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_deal_documents_event(p_env jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_deal_documents_event(p_env jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_deal_documents_event(p_env jsonb) TO service_role;

--
-- Name: FUNCTION integration_apply_deal_progress_event(p_env jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_deal_progress_event(p_env jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_deal_progress_event(p_env jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_deal_progress_event(p_env jsonb) TO service_role;

--
-- Name: FUNCTION integration_apply_market_intelligence_event(p_env jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_market_intelligence_event(p_env jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_market_intelligence_event(p_env jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_market_intelligence_event(p_env jsonb) TO service_role;

--
-- Name: FUNCTION integration_apply_request_declined_event(p_env jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_request_declined_event(p_env jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_request_declined_event(p_env jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_request_declined_event(p_env jsonb) TO service_role;

--
-- Name: FUNCTION integration_apply_request_window_closed_event(p_env jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_apply_request_window_closed_event(p_env jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_apply_request_window_closed_event(p_env jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_apply_request_window_closed_event(p_env jsonb) TO service_role;

--
-- Name: FUNCTION integration_bids_for(p_client_id uuid, p_request_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_bids_for(p_client_id uuid, p_request_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_bids_for(p_client_id uuid, p_request_ids uuid[]) TO postgres;
GRANT ALL ON FUNCTION public.integration_bids_for(p_client_id uuid, p_request_ids uuid[]) TO service_role;

--
-- Name: FUNCTION integration_claim_batch(p_limit integer, p_lease_seconds integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_claim_batch(p_limit integer, p_lease_seconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_claim_batch(p_limit integer, p_lease_seconds integer) TO postgres;
GRANT ALL ON FUNCTION public.integration_claim_batch(p_limit integer, p_lease_seconds integer) TO service_role;

--
-- Name: FUNCTION integration_complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid) TO postgres;
GRANT ALL ON FUNCTION public.integration_complete_acceptance(p_consent_ref text, p_outcome text, p_institution uuid) TO service_role;

--
-- Name: FUNCTION integration_deal_documents_for(p_client_id uuid, p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_deal_documents_for(p_client_id uuid, p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_deal_documents_for(p_client_id uuid, p_request_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.integration_deal_documents_for(p_client_id uuid, p_request_id uuid) TO service_role;

--
-- Name: FUNCTION integration_deal_progress_for(p_client_id uuid, p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_deal_progress_for(p_client_id uuid, p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_deal_progress_for(p_client_id uuid, p_request_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.integration_deal_progress_for(p_client_id uuid, p_request_id uuid) TO service_role;

--
-- Name: FUNCTION integration_defer(p_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_defer(p_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_defer(p_id text) TO postgres;
GRANT ALL ON FUNCTION public.integration_defer(p_id text) TO service_role;

--
-- Name: FUNCTION integration_enqueue(p_type text, p_aggregate_id text, p_data jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_enqueue(p_type text, p_aggregate_id text, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_enqueue(p_type text, p_aggregate_id text, p_data jsonb) TO postgres;
GRANT ALL ON FUNCTION public.integration_enqueue(p_type text, p_aggregate_id text, p_data jsonb) TO service_role;

--
-- Name: FUNCTION integration_finish_document_submission(p_submission_id uuid, p_ok boolean, p_upload_id uuid, p_sha256 text, p_error text, p_bank_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_finish_document_submission(p_submission_id uuid, p_ok boolean, p_upload_id uuid, p_sha256 text, p_error text, p_bank_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_finish_document_submission(p_submission_id uuid, p_ok boolean, p_upload_id uuid, p_sha256 text, p_error text, p_bank_name text) TO postgres;
GRANT ALL ON FUNCTION public.integration_finish_document_submission(p_submission_id uuid, p_ok boolean, p_upload_id uuid, p_sha256 text, p_error text, p_bank_name text) TO service_role;

--
-- Name: FUNCTION integration_mark_delivered(p_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_mark_delivered(p_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_mark_delivered(p_id text) TO postgres;
GRANT ALL ON FUNCTION public.integration_mark_delivered(p_id text) TO service_role;

--
-- Name: FUNCTION integration_mark_failed(p_id text, p_error text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_mark_failed(p_id text, p_error text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_mark_failed(p_id text, p_error text) TO postgres;
GRANT ALL ON FUNCTION public.integration_mark_failed(p_id text, p_error text) TO service_role;

--
-- Name: FUNCTION integration_market_intelligence(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_market_intelligence() FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_market_intelligence() TO postgres;
GRANT ALL ON FUNCTION public.integration_market_intelligence() TO service_role;

--
-- Name: FUNCTION integration_portfolio_for(p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_portfolio_for(p_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_portfolio_for(p_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.integration_portfolio_for(p_client_id uuid) TO service_role;

--
-- Name: FUNCTION integration_prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid) TO postgres;
GRANT ALL ON FUNCTION public.integration_prepare_acceptance(p_client uuid, p_request uuid, p_bid uuid) TO service_role;

--
-- Name: FUNCTION integration_record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint) TO postgres;
GRANT ALL ON FUNCTION public.integration_record_inbox(p_event_id text, p_type text, p_source text, p_aggregate_id text, p_sequence bigint) TO service_role;

--
-- Name: FUNCTION integration_send_borrower_message(p_client_id uuid, p_request_id uuid, p_institution_id uuid, p_template_code text, p_params jsonb, p_body text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_send_borrower_message(p_client_id uuid, p_request_id uuid, p_institution_id uuid, p_template_code text, p_params jsonb, p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_send_borrower_message(p_client_id uuid, p_request_id uuid, p_institution_id uuid, p_template_code text, p_params jsonb, p_body text) TO postgres;
GRANT ALL ON FUNCTION public.integration_send_borrower_message(p_client_id uuid, p_request_id uuid, p_institution_id uuid, p_template_code text, p_params jsonb, p_body text) TO service_role;

--
-- Name: FUNCTION integration_start_document_submission(p_client_id uuid, p_pipeline_id uuid, p_requirement_id uuid, p_source text, p_vault_document_id uuid, p_document_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_start_document_submission(p_client_id uuid, p_pipeline_id uuid, p_requirement_id uuid, p_source text, p_vault_document_id uuid, p_document_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_start_document_submission(p_client_id uuid, p_pipeline_id uuid, p_requirement_id uuid, p_source text, p_vault_document_id uuid, p_document_date date) TO postgres;
GRANT ALL ON FUNCTION public.integration_start_document_submission(p_client_id uuid, p_pipeline_id uuid, p_requirement_id uuid, p_source text, p_vault_document_id uuid, p_document_date date) TO service_role;

--
-- Name: FUNCTION is_couple_member(p_couple_id uuid, p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_couple_member(p_couple_id uuid, p_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_couple_member(p_couple_id uuid, p_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.is_couple_member(p_couple_id uuid, p_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_couple_member(p_couple_id uuid, p_client_id uuid) TO service_role;

--
-- Name: FUNCTION is_ficium_admin(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_ficium_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_ficium_admin() TO postgres;
GRANT ALL ON FUNCTION public.is_ficium_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_ficium_admin() TO service_role;

--
-- Name: FUNCTION is_institution_member(p_institution_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_institution_member(p_institution_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_institution_member(p_institution_id uuid) TO postgres;

--
-- Name: FUNCTION is_request_participant(p_request_id uuid, p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_request_participant(p_request_id uuid, p_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_request_participant(p_request_id uuid, p_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.is_request_participant(p_request_id uuid, p_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_request_participant(p_request_id uuid, p_client_id uuid) TO service_role;

--
-- Name: FUNCTION kyc_record_outcome(p_client uuid, p_status text, p_submission jsonb, p_profile jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.kyc_record_outcome(p_client uuid, p_status text, p_submission jsonb, p_profile jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.kyc_record_outcome(p_client uuid, p_status text, p_submission jsonb, p_profile jsonb) TO postgres;
GRANT ALL ON FUNCTION public.kyc_record_outcome(p_client uuid, p_status text, p_submission jsonb, p_profile jsonb) TO service_role;

--
-- Name: FUNCTION kyc_server_context(p_client uuid, p_document_number text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.kyc_server_context(p_client uuid, p_document_number text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.kyc_server_context(p_client uuid, p_document_number text) TO postgres;
GRANT ALL ON FUNCTION public.kyc_server_context(p_client uuid, p_document_number text) TO service_role;

--
-- Name: FUNCTION normalize_name(p_name text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.normalize_name(p_name text) TO postgres;
GRANT ALL ON FUNCTION public.normalize_name(p_name text) TO authenticated;
GRANT ALL ON FUNCTION public.normalize_name(p_name text) TO anon;
GRANT ALL ON FUNCTION public.normalize_name(p_name text) TO service_role;

--
-- Name: FUNCTION notify_expiring_requests(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_expiring_requests() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_expiring_requests() TO postgres;

--
-- Name: FUNCTION on_bid_accepted(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.on_bid_accepted() FROM PUBLIC;
GRANT ALL ON FUNCTION public.on_bid_accepted() TO postgres;

--
-- Name: FUNCTION on_bid_submitted(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.on_bid_submitted() FROM PUBLIC;
GRANT ALL ON FUNCTION public.on_bid_submitted() TO postgres;

--
-- Name: FUNCTION on_new_client_request(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.on_new_client_request() FROM PUBLIC;
GRANT ALL ON FUNCTION public.on_new_client_request() TO postgres;

--
-- Name: FUNCTION reject_request(p_request_id uuid, p_institution_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reject_request(p_request_id uuid, p_institution_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reject_request(p_request_id uuid, p_institution_id uuid, p_reason text) TO postgres;
GRANT ALL ON FUNCTION public.reject_request(p_request_id uuid, p_institution_id uuid, p_reason text) TO service_role;

--
-- Name: FUNCTION relist_request(p_client_id uuid, p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.relist_request(p_client_id uuid, p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.relist_request(p_client_id uuid, p_request_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.relist_request(p_client_id uuid, p_request_id uuid) TO service_role;

--
-- Name: FUNCTION replace_client_loans(p_loans jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.replace_client_loans(p_loans jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.replace_client_loans(p_loans jsonb) TO postgres;
GRANT ALL ON FUNCTION public.replace_client_loans(p_loans jsonb) TO authenticated;

--
-- Name: FUNCTION report_app_client(p_platform text, p_version text, p_build text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.report_app_client(p_platform text, p_version text, p_build text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.report_app_client(p_platform text, p_version text, p_build text) TO postgres;
GRANT ALL ON FUNCTION public.report_app_client(p_platform text, p_version text, p_build text) TO authenticated;

--
-- Name: FUNCTION report_app_error(p_platform text, p_version text, p_kind text, p_fingerprint text, p_message text, p_location text, p_route text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.report_app_error(p_platform text, p_version text, p_kind text, p_fingerprint text, p_message text, p_location text, p_route text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.report_app_error(p_platform text, p_version text, p_kind text, p_fingerprint text, p_message text, p_location text, p_route text) TO postgres;
GRANT ALL ON FUNCTION public.report_app_error(p_platform text, p_version text, p_kind text, p_fingerprint text, p_message text, p_location text, p_route text) TO authenticated;

--
-- Name: FUNCTION request_chat_is_open(p_request_id uuid, p_institution_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid) TO service_role;

--
-- Name: FUNCTION request_chat_is_winner(p_request_id uuid, p_institution_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_chat_is_winner(p_request_id uuid, p_institution_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_chat_is_winner(p_request_id uuid, p_institution_id uuid) TO postgres;

--
-- Name: FUNCTION request_messages_enforce(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_messages_enforce() FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_messages_enforce() TO postgres;

--
-- Name: FUNCTION revoke_request_invitation(p_invitation_id uuid, p_inviter_client_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.revoke_request_invitation(p_invitation_id uuid, p_inviter_client_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.revoke_request_invitation(p_invitation_id uuid, p_inviter_client_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.revoke_request_invitation(p_invitation_id uuid, p_inviter_client_id uuid) TO service_role;

--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO postgres;

--
-- Name: FUNCTION set_reporting_currency(p_currency text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_reporting_currency(p_currency text) TO postgres;

--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO postgres;

--
-- Name: FUNCTION set_vault_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_vault_updated_at() TO postgres;

--
-- Name: FUNCTION submit_couple_relationship_document(p_couple_link_id uuid, p_vault_document_id uuid, p_uploader_client_id uuid, p_extracted_text text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.submit_couple_relationship_document(p_couple_link_id uuid, p_vault_document_id uuid, p_uploader_client_id uuid, p_extracted_text text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_couple_relationship_document(p_couple_link_id uuid, p_vault_document_id uuid, p_uploader_client_id uuid, p_extracted_text text) TO postgres;
GRANT ALL ON FUNCTION public.submit_couple_relationship_document(p_couple_link_id uuid, p_vault_document_id uuid, p_uploader_client_id uuid, p_extracted_text text) TO service_role;

--
-- Name: FUNCTION touch_client_dossier(p_client uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.touch_client_dossier(p_client uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.touch_client_dossier(p_client uuid) TO postgres;

--
-- Name: FUNCTION touch_client_snapshot(p_client uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.touch_client_snapshot(p_client uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.touch_client_snapshot(p_client uuid) TO postgres;

--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_updated_at() TO postgres;

--
-- Name: FUNCTION trg_audit_bid_accepted(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_audit_bid_accepted() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_audit_bid_accepted() TO postgres;

--
-- Name: FUNCTION trg_audit_institution_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_audit_institution_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_audit_institution_change() TO postgres;

--
-- Name: FUNCTION trg_audit_kyc_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_audit_kyc_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_audit_kyc_change() TO postgres;

--
-- Name: FUNCTION trg_audit_request_created(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_audit_request_created() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_audit_request_created() TO postgres;

--
-- Name: FUNCTION trg_audit_row_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_audit_row_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_audit_row_change() TO postgres;

--
-- Name: FUNCTION trg_dossier_derive(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_dossier_derive() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_dossier_derive() TO postgres;

--
-- Name: FUNCTION trg_dossier_propagate(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_dossier_propagate() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_dossier_propagate() TO postgres;

--
-- Name: FUNCTION trg_loans_propagate(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_loans_propagate() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_loans_propagate() TO postgres;

--
-- Name: FUNCTION trg_recompute_goal_readiness(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_recompute_goal_readiness() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_recompute_goal_readiness() TO postgres;

--
-- Name: FUNCTION trg_snapshot_derive(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_snapshot_derive() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_snapshot_derive() TO postgres;

--
-- Name: FUNCTION trg_snapshot_propagate(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_snapshot_propagate() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_snapshot_propagate() TO postgres;

--
-- Name: FUNCTION trg_user_inputs_propagate(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trg_user_inputs_propagate() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_user_inputs_propagate() TO postgres;

--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at() TO postgres;

--
-- Name: FUNCTION verify_market_refresh_secret(p_secret text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.verify_market_refresh_secret(p_secret text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.verify_market_refresh_secret(p_secret text) TO postgres;
GRANT ALL ON FUNCTION public.verify_market_refresh_secret(p_secret text) TO service_role;

--
-- Name: FUNCTION write_audit(p_institution_id uuid, p_pending_action_id uuid, p_actor_id uuid, p_actor_type public.actor_type, p_actor_role text, p_actor_ip inet, p_action_category public.action_category_type, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.write_audit(p_institution_id uuid, p_pending_action_id uuid, p_actor_id uuid, p_actor_type public.actor_type, p_actor_role text, p_actor_ip inet, p_action_category public.action_category_type, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.write_audit(p_institution_id uuid, p_pending_action_id uuid, p_actor_id uuid, p_actor_type public.actor_type, p_actor_role text, p_actor_ip inet, p_action_category public.action_category_type, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text) TO postgres;

--
-- Name: FUNCTION write_client_audit(p_client_id uuid, p_action_category text, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text, p_actor_ip inet, p_actor_device text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.write_client_audit(p_client_id uuid, p_action_category text, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text, p_actor_ip inet, p_actor_device text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.write_client_audit(p_client_id uuid, p_action_category text, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text, p_actor_ip inet, p_actor_device text) TO postgres;
GRANT ALL ON FUNCTION public.write_client_audit(p_client_id uuid, p_action_category text, p_event_label text, p_resource_type text, p_resource_id uuid, p_state_before jsonb, p_state_after jsonb, p_outcome text, p_outcome_note text, p_actor_ip inet, p_actor_device text) TO authenticated;

--
-- Name: FUNCTION dispatch(p_document_id uuid); Type: ACL; Schema: vault_extract; Owner: -
--

REVOKE ALL ON FUNCTION vault_extract.dispatch(p_document_id uuid) FROM PUBLIC;

--
-- Name: TABLE admin_users; Type: ACL; Schema: admin; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE admin.admin_users TO service_role;

--
-- Name: TABLE platform_config; Type: ACL; Schema: admin; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE admin.platform_config TO service_role;

--
-- Name: TABLE conversation; Type: ACL; Schema: fico; Owner: -
--

GRANT SELECT ON TABLE fico.conversation TO authenticated;
GRANT ALL ON TABLE fico.conversation TO service_role;

--
-- Name: TABLE message; Type: ACL; Schema: fico; Owner: -
--

GRANT SELECT ON TABLE fico.message TO authenticated;
GRANT ALL ON TABLE fico.message TO service_role;

--
-- Name: TABLE message_meter; Type: ACL; Schema: fico; Owner: -
--

GRANT SELECT ON TABLE fico.message_meter TO authenticated;
GRANT ALL ON TABLE fico.message_meter TO service_role;

--
-- Name: TABLE profile; Type: ACL; Schema: fico; Owner: -
--

GRANT SELECT ON TABLE fico.profile TO authenticated;
GRANT ALL ON TABLE fico.profile TO service_role;

--
-- Name: TABLE holding_prices; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.holding_prices TO authenticated;
GRANT SELECT ON TABLE finance.holding_prices TO anon;

--
-- Name: TABLE holdings; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.holdings TO authenticated;

--
-- Name: TABLE account_closures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.account_closures TO postgres;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.account_closures TO service_role;

--
-- Name: TABLE account_closures_due_for_erasure; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.account_closures_due_for_erasure TO postgres;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.account_closures_due_for_erasure TO service_role;

--
-- Name: TABLE activity_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.activity_events TO postgres;
GRANT SELECT,INSERT,UPDATE ON TABLE public.activity_events TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.activity_events TO service_role;

--
-- Name: TABLE advisor_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.advisor_messages TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.advisor_messages TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.advisor_messages TO authenticated;

--
-- Name: TABLE ai_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_usage TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_usage TO service_role;

--
-- Name: TABLE app_client_seen; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_client_seen TO postgres;

--
-- Name: TABLE app_error_report; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_error_report TO postgres;

--
-- Name: TABLE app_features; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_features TO postgres;
GRANT SELECT ON TABLE public.app_features TO anon;
GRANT SELECT ON TABLE public.app_features TO authenticated;
GRANT ALL ON TABLE public.app_features TO service_role;

--
-- Name: TABLE app_release_policy; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_release_policy TO postgres;
GRANT SELECT ON TABLE public.app_release_policy TO anon;
GRANT SELECT ON TABLE public.app_release_policy TO authenticated;
GRANT SELECT ON TABLE public.app_release_policy TO service_role;

--
-- Name: TABLE audit_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_events TO postgres;
GRANT SELECT,INSERT ON TABLE public.audit_events TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.audit_events TO service_role;

--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO postgres;
GRANT SELECT,INSERT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.audit_logs TO service_role;

--
-- Name: TABLE bid_acceptances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bid_acceptances TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.bid_acceptances TO authenticated;
GRANT ALL ON TABLE public.bid_acceptances TO service_role;

--
-- Name: TABLE client_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_documents TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.client_documents TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.client_documents TO service_role;

--
-- Name: TABLE client_dossier; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_dossier TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.client_dossier TO authenticated;
GRANT ALL ON TABLE public.client_dossier TO service_role;

--
-- Name: TABLE client_financial_snapshot; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_financial_snapshot TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.client_financial_snapshot TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.client_financial_snapshot TO service_role;

--
-- Name: TABLE client_loan_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_loan_details TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.client_loan_details TO authenticated;
GRANT ALL ON TABLE public.client_loan_details TO service_role;

--
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clients TO postgres;
GRANT SELECT,UPDATE ON TABLE public.clients TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.clients TO service_role;

--
-- Name: TABLE compliance_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.compliance_details TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.compliance_details TO authenticated;
GRANT ALL ON TABLE public.compliance_details TO service_role;

--
-- Name: TABLE client_profile_view; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_profile_view TO postgres;
GRANT SELECT ON TABLE public.client_profile_view TO authenticated;

--
-- Name: TABLE client_vault_access_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_vault_access_log TO postgres;
GRANT INSERT ON TABLE public.client_vault_access_log TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.client_vault_access_log TO service_role;

--
-- Name: TABLE client_vault_document; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_vault_document TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.client_vault_document TO authenticated;
GRANT ALL ON TABLE public.client_vault_document TO service_role;

--
-- Name: TABLE client_vault_property; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_vault_property TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.client_vault_property TO authenticated;
GRANT ALL ON TABLE public.client_vault_property TO service_role;

--
-- Name: TABLE couple_link; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.couple_link TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.couple_link TO service_role;

--
-- Name: TABLE couple_relationship_document; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.couple_relationship_document TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.couple_relationship_document TO service_role;

--
-- Name: TABLE employment_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.employment_details TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.employment_details TO authenticated;
GRANT ALL ON TABLE public.employment_details TO service_role;

--
-- Name: TABLE kyc_scan_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kyc_scan_attempts TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.kyc_scan_attempts TO service_role;

--
-- Name: TABLE kyc_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kyc_settings TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.kyc_settings TO authenticated;
GRANT ALL ON TABLE public.kyc_settings TO service_role;

--
-- Name: TABLE kyc_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kyc_submissions TO postgres;
GRANT SELECT,INSERT ON TABLE public.kyc_submissions TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.kyc_submissions TO service_role;

--
-- Name: TABLE market_data; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_data TO postgres;
GRANT SELECT ON TABLE public.market_data TO anon;
GRANT SELECT ON TABLE public.market_data TO authenticated;
GRANT ALL ON TABLE public.market_data TO service_role;

--
-- Name: TABLE market_deposit_rates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_deposit_rates TO postgres;
GRANT SELECT ON TABLE public.market_deposit_rates TO anon;
GRANT SELECT ON TABLE public.market_deposit_rates TO authenticated;
GRANT ALL ON TABLE public.market_deposit_rates TO service_role;

--
-- Name: TABLE market_fx_rates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_fx_rates TO postgres;
GRANT SELECT ON TABLE public.market_fx_rates TO anon;
GRANT SELECT ON TABLE public.market_fx_rates TO authenticated;
GRANT ALL ON TABLE public.market_fx_rates TO service_role;

--
-- Name: TABLE market_lending_rates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_lending_rates TO postgres;
GRANT SELECT ON TABLE public.market_lending_rates TO anon;
GRANT SELECT ON TABLE public.market_lending_rates TO authenticated;
GRANT ALL ON TABLE public.market_lending_rates TO service_role;

--
-- Name: TABLE market_news; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_news TO postgres;
GRANT SELECT ON TABLE public.market_news TO anon;
GRANT SELECT ON TABLE public.market_news TO authenticated;
GRANT ALL ON TABLE public.market_news TO service_role;

--
-- Name: TABLE market_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_preferences TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.market_preferences TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.market_preferences TO service_role;

--
-- Name: TABLE market_stories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.market_stories TO postgres;
GRANT SELECT ON TABLE public.market_stories TO anon;
GRANT SELECT ON TABLE public.market_stories TO authenticated;
GRANT ALL ON TABLE public.market_stories TO service_role;

--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

--
-- Name: TABLE offer_listing; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.offer_listing TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.offer_listing TO service_role;
GRANT SELECT ON TABLE public.offer_listing TO authenticated;

--
-- Name: TABLE request_allocations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_allocations TO postgres;
GRANT SELECT,INSERT ON TABLE public.request_allocations TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.request_allocations TO service_role;

--
-- Name: TABLE request_decisions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_decisions TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.request_decisions TO service_role;

--
-- Name: TABLE request_invitation; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_invitation TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.request_invitation TO service_role;

--
-- Name: TABLE request_message_template; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_message_template TO postgres;
GRANT SELECT ON TABLE public.request_message_template TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.request_message_template TO service_role;

--
-- Name: TABLE request_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_messages TO postgres;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.request_messages TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.request_messages TO service_role;

--
-- Name: TABLE request_participant; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_participant TO postgres;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.request_participant TO service_role;

--
-- Name: TABLE requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requests TO postgres;
GRANT SELECT,INSERT ON TABLE public.requests TO authenticated;
GRANT ALL ON TABLE public.requests TO service_role;

--
-- Name: TABLE v_request_patterns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_request_patterns TO postgres;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_request_patterns TO service_role;

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: finance; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finance GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finance GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;

--
-- PostgreSQL database dump complete
--
