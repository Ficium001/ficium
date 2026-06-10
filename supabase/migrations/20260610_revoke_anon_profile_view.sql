-- =============================================================
-- Harden client_profile_view: remove the unnecessary anon grant
-- =============================================================
-- client_profile_view is security_invoker=false and exposes PII
-- (email, address, income, net worth, PEP status, risk scores),
-- protected only by `WHERE c.id = auth.uid()`. For an anon caller
-- auth.uid() is NULL, so anon already gets zero rows — the grant
-- buys nothing and is pure downside if the view is ever recreated
-- without the WHERE clause.
--
-- Revoking from anon is safe: authenticated users are unaffected.
-- Idempotent: REVOKE on an absent grant is a no-op.
-- =============================================================

REVOKE SELECT ON public.client_profile_view FROM anon;

-- Belt-and-braces: ensure authenticated retains access.
GRANT SELECT ON public.client_profile_view TO authenticated;

-- Verify (run manually):
--   SELECT grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_name = 'client_profile_view';
-- Expect: authenticated present, anon absent.
