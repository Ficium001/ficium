-- Run each query separately to diagnose

-- Q1: Check the view returns data (bypass RLS as service role)
SELECT user_id, email, full_name, first_name, kyc_status, health_score
FROM public.client_profile_view;
-- If this returns 0 rows: the WHERE c.id = auth.uid() filters out service role
-- That's expected - service role doesn't have auth.uid()

-- Q2: Test the view logic directly without RLS
SELECT
  c.id AS user_id, c.email, c.full_name, c.first_name,
  c.kyc_status, d.health_score, d.monthly_income
FROM public.clients c
LEFT JOIN public.client_dossier d ON d.client_id = c.id;
-- This should return all 4 users

-- Q3: Check if there's a grant issue on the view
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'client_profile_view';

-- Q4: Grant access if missing
GRANT SELECT ON public.client_profile_view TO authenticated;
GRANT SELECT ON public.client_profile_view TO anon;

-- Q5: Also grant on dependent tables
GRANT SELECT ON public.clients TO authenticated;
GRANT SELECT ON public.client_dossier TO authenticated;
GRANT SELECT ON public.client_financial_snapshot TO authenticated;
