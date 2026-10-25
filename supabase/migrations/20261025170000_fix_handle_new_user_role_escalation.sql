-- APPLIED to the App DB on 2026-10-25 as migration fix_handle_new_user_role_escalation.
-- raw_user_meta_data is client-controlled at signUp(); it must never decide privilege.
-- Previously role='admin' branched into admin.admin_users (it failed only because that
-- insert named a non-existent column). Every self-service signup is a borrower; admins
-- and institution users authenticate via ficium-auth only.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Stray client-role grants on admin tables (RLS was the only barrier).
REVOKE ALL ON admin.admin_users     FROM anon, authenticated;
REVOKE ALL ON admin.platform_config FROM anon, authenticated;
