-- =============================================================
-- FICIUM — Diagnose profile row issue
-- Run in Supabase SQL Editor
-- =============================================================

-- 1. Check if you have a row in clients table
SELECT id, email, full_name, kyc_status
FROM public.clients
LIMIT 5;

-- 2. Check if auth.uid() is returning your user ID
SELECT auth.uid() AS current_user_id;

-- 3. Check if the IDs match
SELECT
  auth.uid()                          AS auth_uid,
  c.id                                AS clients_id,
  auth.uid() = c.id                   AS ids_match,
  c.email,
  c.kyc_status
FROM public.clients c
LIMIT 5;

-- 4. Check client_dossier has your row
SELECT client_id, employment_status, monthly_income, health_score
FROM public.client_dossier
LIMIT 5;

-- 5. Try the view without the WHERE clause to see all rows
SELECT user_id, email, full_name, kyc_status, health_score, total_assets
FROM public.client_profile_view;
