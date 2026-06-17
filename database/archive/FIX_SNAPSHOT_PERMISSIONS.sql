-- Fix permissions on client_financial_snapshot
-- Run in Supabase SQL Editor

-- 1. Grant table access to authenticated role
GRANT ALL ON public.client_financial_snapshot TO authenticated;

-- 2. Drop and recreate all policies cleanly
DROP POLICY IF EXISTS "snapshot_select" ON public.client_financial_snapshot;
DROP POLICY IF EXISTS "snapshot_insert" ON public.client_financial_snapshot;
DROP POLICY IF EXISTS "snapshot_update" ON public.client_financial_snapshot;
DROP POLICY IF EXISTS "snapshot_delete" ON public.client_financial_snapshot;

CREATE POLICY "snapshot_select" ON public.client_financial_snapshot
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "snapshot_insert" ON public.client_financial_snapshot
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "snapshot_update" ON public.client_financial_snapshot
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "snapshot_delete" ON public.client_financial_snapshot
  FOR DELETE USING (auth.uid() = client_id);

-- 3. Also grant on sequence (for uuid generation)
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Verify
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'client_financial_snapshot'
  AND grantee = 'authenticated';
