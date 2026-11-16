-- Error reports from the phone apps.
--
-- Until now a crash in the installed app was invisible: the only signals were store consoles and
-- complaints. A signed-in app now reports JavaScript errors it hits, and the admin site (App
-- releases) shows them per app version, so a bad release is seen in hours, not days.
--
-- What is stored: the kind of error, its message with personal-looking data removed (emails,
-- tokens, long numbers; scrubbed in the app and again here), where in the bundle it happened, the
-- screen's route pattern, and the app version. Nothing about the device. One row per borrower,
-- day and distinct error, with a count, and at most 20 distinct errors per borrower per day, so a
-- crash loop cannot flood the table. Rows are deleted after 35 days and when the account closes.

BEGIN;

CREATE TABLE public.app_error_report (
  day           date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform      text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version   text NOT NULL CHECK (app_version ~ '^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$'),
  fingerprint   text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{16}$'),
  kind          text NOT NULL CHECK (kind IN ('error', 'rejection', 'render')),
  message       text NOT NULL CHECK (length(message) BETWEEN 1 AND 300),
  location      text NOT NULL DEFAULT '' CHECK (length(location) <= 200),
  route         text NOT NULL DEFAULT '' CHECK (length(route) <= 120),
  occurrences   integer NOT NULL DEFAULT 1 CHECK (occurrences BETWEEN 1 AND 1000),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, client_id, platform, fingerprint)
);
CREATE INDEX app_error_report_by_version_idx ON public.app_error_report (day, platform, app_version, fingerprint);
COMMENT ON TABLE public.app_error_report IS
  'JavaScript errors reported by the phone apps, scrubbed. Written by report_app_error; no direct access. Kept 35 days.';

ALTER TABLE public.app_error_report ENABLE ROW LEVEL SECURITY;   -- no policies: functions only
REVOKE ALL ON public.app_error_report FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public._scrub_error_text(p_text text, p_max integer)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  SELECT left(btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(p_text, ''),
           '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
           'eyJ[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)*', '[token]', 'g'),
           '[0-9]{6,}', '[number]', 'g'),
           '[[:space:]]+', ' ', 'g')), p_max)
$$;
REVOKE ALL ON FUNCTION public._scrub_error_text(text, integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.report_app_error(
  p_platform text, p_version text, p_kind text, p_fingerprint text, p_message text,
  p_location text DEFAULT '', p_route text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.report_app_error(text, text, text, text, text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.report_app_error(text, text, text, text, text, text, text) TO authenticated;

-- Closing an account forgets its error reports too (same trigger as its app sightings).
CREATE OR REPLACE FUNCTION public._app_client_seen_forget() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  DELETE FROM public.app_client_seen WHERE client_id = NEW.client_id;
  DELETE FROM public.app_error_report WHERE client_id = NEW.client_id;
  RETURN NEW;
END $$;

-- The admin site's read, now with the 50 most widespread errors of the last 7 days. Totals only.
CREATE OR REPLACE FUNCTION public.admin_app_release_stats()
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

-- Daily purge, where the scheduler is installed (it is on the App DB).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('app-error-report-purge', '23 2 * * *',
      $job$DELETE FROM public.app_error_report WHERE day < (now() AT TIME ZONE 'utc')::date - 35$job$);
  END IF;
END $$;

SELECT admin.migration_applied('20261116160000_app_error_reports');

COMMIT;
