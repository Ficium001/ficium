-- =============================================================================
-- FUNCTIONAL FIX — client_documents and request_messages had correct RLS
-- policies but NO base table GRANT for the authenticated role, so PostgREST
-- returned 403 (permission denied) before RLS could be evaluated. Clients
-- could not read their own documents or request messages.
--
-- Grants match each table's existing policies (all scoped to auth.uid()
-- ownership). RLS remains the row-level boundary.
-- Verified: client sees only their own rows after the grant; cross-client
-- isolation confirmed with a two-client test.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_messages TO authenticated;
