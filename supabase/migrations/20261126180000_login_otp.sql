-- Sign-in OTP: a one-time code by email, SMS or WhatsApp as a second step after the password.
--
-- Model
--   A Supabase session (auth.sessions.id, the access token's `session_id` claim) starts
--   unverified. The server (api/account.ts?op=otp) sends a 6-digit code over the channel the
--   borrower picks and, when the right code comes back, records the session in
--   security.otp_session. Sign-out deletes the auth session, which deletes that row (FK cascade),
--   so every new sign-in needs a new code.
--
-- Enforcement (when security.otp_config.enforced is true)
--   * A RESTRICTIVE policy on every RLS table in public/finance/fico/admin, for `authenticated`,
--     requires public.otp_session_verified(). Restrictive policies are ANDed with the existing
--     permissive ones, so no existing policy changes meaning. Reference data that anyone may read
--     (market data, feature flags, release policy, message templates) is left out.
--   * The same on storage.objects (vault and KYC documents).
--   * cancel_request(), the one data-changing SECURITY DEFINER function a borrower can call,
--     checks it too. The others only read the caller's own role/membership or write reports/audit.
--   * The API (requireUser) refuses unverified sessions except on the OTP routes themselves.
--
-- Codes are never stored: the server keeps HMAC-SHA256(OTP_PEPPER, challenge_id:code). A code
-- lives 5 minutes, allows 5 tries, one open code per session, and sends are rate limited per
-- user and per IP.
--
-- compat: adds only. Enforcement ships OFF. Installed apps built before this have no code screen,
-- so raise the minimum app version in the admin site to the first build with it, then run
--   UPDATE security.otp_config SET enforced = true;

BEGIN;

CREATE SCHEMA IF NOT EXISTS security;
REVOKE ALL ON SCHEMA security FROM PUBLIC, anon, authenticated;

CREATE TABLE security.otp_config (
  id                  boolean PRIMARY KEY DEFAULT true CHECK (id),
  enforced            boolean     NOT NULL DEFAULT false,
  code_ttl_s          integer     NOT NULL DEFAULT 300  CHECK (code_ttl_s BETWEEN 60 AND 900),
  max_attempts        integer     NOT NULL DEFAULT 5    CHECK (max_attempts BETWEEN 1 AND 10),
  resend_cooldown_s   integer     NOT NULL DEFAULT 30   CHECK (resend_cooldown_s BETWEEN 10 AND 300),
  user_sends_per_15m  integer     NOT NULL DEFAULT 5    CHECK (user_sends_per_15m BETWEEN 1 AND 20),
  ip_sends_per_hour   integer     NOT NULL DEFAULT 30   CHECK (ip_sends_per_hour BETWEEN 1 AND 500),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
INSERT INTO security.otp_config DEFAULT VALUES;

CREATE TABLE security.otp_challenge (
  id            uuid PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  session_id    uuid        NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  channel       text        NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  destination   text        NOT NULL,             -- masked, for display/audit only
  code_hash     bytea       NOT NULL,
  attempts      integer     NOT NULL DEFAULT 0,
  max_attempts  integer     NOT NULL,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  outcome       text CHECK (outcome IN ('verified','superseded','locked','send_failed')),
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_challenge_user_created_idx    ON security.otp_challenge (user_id, created_at DESC);
CREATE INDEX otp_challenge_session_created_idx ON security.otp_challenge (session_id, created_at DESC);
CREATE INDEX otp_challenge_ip_created_idx      ON security.otp_challenge (ip, created_at DESC) WHERE ip IS NOT NULL;

CREATE TABLE security.otp_session (
  session_id   uuid PRIMARY KEY REFERENCES auth.sessions(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel      text        NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  verified_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_session_user_idx ON security.otp_session (user_id);

CREATE TABLE security.otp_preference (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     text        NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE security.otp_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.otp_challenge  ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.otp_session    ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.otp_preference ENABLE ROW LEVEL SECURITY;
-- No policies and no grants: only the SECURITY DEFINER functions below touch these tables.

/* ── The gate every policy uses ─────────────────────────────────────────────────────────── */

CREATE FUNCTION public.otp_session_verified() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT NOT (SELECT enforced FROM security.otp_config WHERE id)
      OR EXISTS (
           SELECT 1 FROM security.otp_session s
            WHERE s.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
              AND s.user_id    = auth.uid()
         );
$$;
REVOKE ALL ON FUNCTION public.otp_session_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.otp_session_verified() TO authenticated, service_role;

/* ── Server-only functions (service_role) ───────────────────────────────────────────────── */

-- Is this session verified, and is enforcement on? Used by the API's requireUser().
CREATE FUNCTION public.otp_status(p_user uuid, p_session uuid) RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT jsonb_build_object(
    'enforced',  c.enforced,
    'verified',  EXISTS (SELECT 1 FROM security.otp_session s
                          WHERE s.session_id = p_session AND s.user_id = p_user),
    'preferred', (SELECT channel FROM security.otp_preference WHERE user_id = p_user),
    'ttl_s',     c.code_ttl_s,
    'cooldown_s', c.resend_cooldown_s
  )
  FROM security.otp_config c WHERE c.id;
$$;

-- Opens a challenge for a session, superseding any open one. Rate limits are checked under a
-- per-user advisory lock, so parallel sends cannot slip past them.
CREATE FUNCTION public.otp_issue(
  p_challenge_id uuid, p_user uuid, p_session uuid, p_channel text,
  p_destination text, p_code_hash bytea, p_ip inet
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  c       security.otp_config;
  v_last  timestamptz;
  v_n     integer;
BEGIN
  SELECT * INTO c FROM security.otp_config WHERE id;
  PERFORM pg_advisory_xact_lock(hashtextextended('otp:' || p_user::text, 0));

  IF NOT EXISTS (SELECT 1 FROM auth.sessions WHERE id = p_session AND user_id = p_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  SELECT max(created_at) INTO v_last FROM security.otp_challenge
   WHERE session_id = p_session AND outcome IS DISTINCT FROM 'send_failed';
  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => c.resend_cooldown_s) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cooldown',
      'retry_in', ceil(extract(epoch FROM v_last + make_interval(secs => c.resend_cooldown_s) - now())));
  END IF;

  SELECT count(*) INTO v_n FROM security.otp_challenge
   WHERE user_id = p_user AND created_at > now() - interval '15 minutes'
     AND outcome IS DISTINCT FROM 'send_failed';
  IF v_n >= c.user_sends_per_15m THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  IF p_ip IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM security.otp_challenge
     WHERE ip = p_ip AND created_at > now() - interval '1 hour';
    IF v_n >= c.ip_sends_per_hour THEN
      RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
    END IF;
  END IF;

  UPDATE security.otp_challenge SET consumed_at = now(), outcome = 'superseded'
   WHERE session_id = p_session AND consumed_at IS NULL;

  INSERT INTO security.otp_challenge
    (id, user_id, session_id, channel, destination, code_hash, max_attempts, expires_at, ip)
  VALUES
    (p_challenge_id, p_user, p_session, p_channel, p_destination, p_code_hash,
     c.max_attempts, now() + make_interval(secs => c.code_ttl_s), p_ip);

  RETURN jsonb_build_object('ok', true, 'expires_in', c.code_ttl_s, 'resend_in', c.resend_cooldown_s);
END;
$$;

-- The provider refused the message: the challenge never reached the user, so it does not count.
CREATE FUNCTION public.otp_send_failed(p_challenge_id uuid, p_user uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE security.otp_challenge SET consumed_at = now(), outcome = 'send_failed'
   WHERE id = p_challenge_id AND user_id = p_user AND consumed_at IS NULL;
$$;

-- Checks a code. Row-locked, so two parallel guesses cannot both use the last attempt.
CREATE FUNCTION public.otp_verify(
  p_challenge_id uuid, p_user uuid, p_session uuid, p_code_hash bytea
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  ch security.otp_challenge;
BEGIN
  SELECT * INTO ch FROM security.otp_challenge
   WHERE id = p_challenge_id AND user_id = p_user AND session_id = p_session
   FOR UPDATE;

  IF NOT FOUND OR ch.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_code');
  END IF;
  IF ch.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF ch.code_hash <> p_code_hash THEN
    UPDATE security.otp_challenge
       SET attempts    = attempts + 1,
           consumed_at = CASE WHEN attempts + 1 >= max_attempts THEN now() END,
           outcome     = CASE WHEN attempts + 1 >= max_attempts THEN 'locked' END
     WHERE id = ch.id;
    IF ch.attempts + 1 >= ch.max_attempts THEN
      RETURN jsonb_build_object('ok', false, 'error', 'locked');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code',
                              'attempts_left', ch.max_attempts - ch.attempts - 1);
  END IF;

  UPDATE security.otp_challenge SET consumed_at = now(), outcome = 'verified', attempts = attempts + 1
   WHERE id = ch.id;

  INSERT INTO security.otp_session (session_id, user_id, channel)
  VALUES (p_session, p_user, ch.channel)
  ON CONFLICT (session_id) DO UPDATE SET channel = EXCLUDED.channel, verified_at = now();

  INSERT INTO security.otp_preference (user_id, channel) VALUES (p_user, ch.channel)
  ON CONFLICT (user_id) DO UPDATE SET channel = EXCLUDED.channel, updated_at = now();

  INSERT INTO public.audit_events (
    client_id, actor_id, actor_type, action_category, event_label,
    resource_type, resource_id, state_after, outcome
  ) VALUES (
    p_user, p_user, 'client_user', 'auth.otp_verified', 'Sign-in confirmed with a one-time code',
    'auth_session', p_session, jsonb_build_object('channel', ch.channel), 'success'
  );

  RETURN jsonb_build_object('ok', true, 'channel', ch.channel);
END;
$$;

REVOKE ALL ON FUNCTION public.otp_status(uuid, uuid)                                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_issue(uuid, uuid, uuid, text, text, bytea, inet)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_send_failed(uuid, uuid)                                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_verify(uuid, uuid, uuid, bytea)                        FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_status(uuid, uuid)                              TO service_role;
GRANT EXECUTE ON FUNCTION public.otp_issue(uuid, uuid, uuid, text, text, bytea, inet) TO service_role;
GRANT EXECUTE ON FUNCTION public.otp_send_failed(uuid, uuid)                          TO service_role;
GRANT EXECUTE ON FUNCTION public.otp_verify(uuid, uuid, uuid, bytea)                  TO service_role;

/* ── Restrictive policies ───────────────────────────────────────────────────────────────── */

DO $p$
DECLARE
  t record;
  -- Reference data anyone may read: no personal data, needed before the code screen.
  v_open constant text[] := ARRAY[
    'public.app_features', 'public.app_release_policy', 'public.request_message_template',
    'public.market_data', 'public.market_deposit_rates', 'public.market_fx_rates',
    'public.market_lending_rates', 'public.market_news', 'public.market_stories'
  ];
BEGIN
  FOR t IN
    SELECT n.nspname AS s, c.relname AS r
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND NOT c.relispartition
       AND n.nspname IN ('public','finance','fico','admin')
       AND (n.nspname || '.' || c.relname) <> ALL (v_open)
  LOOP
    EXECUTE format(
      'CREATE POLICY otp_required ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT public.otp_session_verified()))
         WITH CHECK ((SELECT public.otp_session_verified()))', t.s, t.r);
  END LOOP;
END $p$;

CREATE POLICY otp_required ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.otp_session_verified()))
  WITH CHECK ((SELECT public.otp_session_verified()));

/* ── cancel_request: same body, plus the gate ───────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION public.cancel_request(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_status public.request_status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in');
  END IF;
  IF NOT public.otp_session_verified() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'otp_required');
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
$function$;

/* ── Self-checks (rolled back with nothing if any fails) ────────────────────────────────── */

DO $c$
DECLARE v_missing integer;
BEGIN
  -- Every non-exempt RLS table got the policy.
  SELECT count(*) INTO v_missing
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND NOT c.relispartition
     AND n.nspname IN ('public','finance','fico','admin')
     AND n.nspname || '.' || c.relname NOT IN (
       'public.app_features','public.app_release_policy','public.request_message_template',
       'public.market_data','public.market_deposit_rates','public.market_fx_rates',
       'public.market_lending_rates','public.market_news','public.market_stories')
     AND NOT EXISTS (SELECT 1 FROM pg_policies p
                      WHERE p.schemaname = n.nspname AND p.tablename = c.relname
                        AND p.policyname = 'otp_required' AND p.permissive = 'RESTRICTIVE');
  IF v_missing > 0 THEN RAISE EXCEPTION 'otp_required missing on % tables', v_missing; END IF;

  -- Enforcement off: a signed-in session still reads as before.
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","session_id":"00000000-0000-0000-0000-000000000002"}', true);
  SET LOCAL ROLE authenticated;
  IF NOT public.otp_session_verified() THEN RAISE EXCEPTION 'gate closed while enforcement is off'; END IF;
  PERFORM count(*) FROM public.clients;
  RESET ROLE;

  -- Enforcement on: an unverified session is refused.
  UPDATE security.otp_config SET enforced = true;
  SET LOCAL ROLE authenticated;
  IF public.otp_session_verified() THEN RAISE EXCEPTION 'gate open for an unverified session'; END IF;
  RESET ROLE;
  UPDATE security.otp_config SET enforced = false;
END $c$;

SELECT admin.migration_applied('20261126180000_login_otp');

COMMIT;
