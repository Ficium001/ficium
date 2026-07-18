-- ══════════════════════════════════════════════════════════════════════════
-- Scan NIC at signup: capture date_of_birth + gender from signup metadata
-- (columns already existed on public.clients, unused until now), and a
-- rate-limit table for the pre-auth ?action=scan endpoint.
--
-- Applied directly to the App DB (wixfhjlsjkiwfvqewvmt) — this file mirrors
-- that change for version-control history and DR-environment replication.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(new.raw_user_meta_data->>'role', 'client');

  IF v_role = 'client' THEN
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
      -- Guard the date cast: malformed input degrades to NULL instead of
      -- throwing and failing the whole signup.
      CASE WHEN new.raw_user_meta_data->>'date_of_birth' ~ '^\d{4}-\d{2}-\d{2}$'
           THEN (new.raw_user_meta_data->>'date_of_birth')::date
           ELSE NULL END,
      NULLIF(new.raw_user_meta_data->>'gender', '')
    ) ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'admin' THEN
    INSERT INTO admin.admin_users (id, email, full_name)
    VALUES (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    ) ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'bank' THEN
    NULL;
  END IF;

  RETURN new;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
END;
$function$;

-- Rate-limit log for the pre-auth (signup-time) NIC scan endpoint.
-- Server (service_role) only — never touched directly by the browser.
CREATE TABLE IF NOT EXISTS public.kyc_scan_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash    text NOT NULL,
  client_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_scan_attempts_ip_created_idx
  ON public.kyc_scan_attempts (ip_hash, created_at);

ALTER TABLE public.kyc_scan_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.kyc_scan_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Postgres role full access" ON public.kyc_scan_attempts
  FOR ALL TO postgres USING (true) WITH CHECK (true);
