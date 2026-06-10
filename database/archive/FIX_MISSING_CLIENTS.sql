-- =============================================================
-- FICIUM — Fix missing clients rows for existing auth users
-- Run in Supabase SQL Editor (as postgres/service role)
-- =============================================================

-- Step 1: See which auth users are missing a clients row
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name'   AS full_name,
  u.raw_user_meta_data->>'first_name'  AS first_name,
  u.raw_user_meta_data->>'role'        AS role,
  u.created_at,
  c.id IS NOT NULL                      AS has_clients_row
FROM auth.users u
LEFT JOIN public.clients c ON c.id = u.id
ORDER BY u.created_at;

-- Step 2: Insert missing client rows for all auth users who don't have one
INSERT INTO public.clients (
  id, email, full_name, first_name, last_name,
  user_type, kyc_status
)
SELECT
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'last_name',
  coalesce(u.raw_user_meta_data->>'user_type', 'individual'),
  coalesce(u.raw_user_meta_data->>'kyc_status', 'pending')::public.kyc_status
FROM auth.users u
LEFT JOIN public.clients c ON c.id = u.id
WHERE c.id IS NULL
  AND (u.raw_user_meta_data->>'role' IS NULL
       OR u.raw_user_meta_data->>'role' = 'client')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Also create client_dossier rows for anyone missing one
INSERT INTO public.client_dossier (client_id)
SELECT c.id
FROM public.clients c
LEFT JOIN public.client_dossier d ON d.client_id = c.id
WHERE d.id IS NULL
ON CONFLICT (client_id) DO NOTHING;

-- Step 4: Verify — should now show all users with has_clients_row = true
SELECT
  u.id,
  u.email,
  c.full_name,
  c.kyc_status,
  c.id IS NOT NULL   AS has_clients_row,
  d.id IS NOT NULL   AS has_dossier_row
FROM auth.users u
LEFT JOIN public.clients c ON c.id = u.id
LEFT JOIN public.client_dossier d ON d.client_id = c.id
ORDER BY u.created_at;
