-- =============================================================
-- Ficium 3 — Fix marketplace_requests view
-- Run in Supabase SQL Editor if institution marketplace is empty
-- =============================================================

-- 1. Confirm public.client_requests exists and has data
SELECT COUNT(*) FROM public.client_requests;

-- 2. Confirm institution schema can see it
SELECT * FROM institution.marketplace_requests LIMIT 5;

-- 3. If marketplace_requests returns nothing, check if requests
--    are in the existing "requests" table instead:
SELECT COUNT(*) FROM public.requests;

-- 4. If data is in public.requests (not client_requests), recreate the view:
CREATE OR REPLACE VIEW institution.marketplace_requests AS
SELECT
  r.id,
  r.product_type,
  r.status,
  r.amount,
  'MUR'::text                                          AS currency,
  r.preferred_term_months                               AS term_months,
  r.purpose,
  NULL::jsonb                                           AS financial_snapshot,
  r.decision_deadline                                   AS bid_window_closes_at,
  r.created_at,
  encode(digest(r.client_id::text, 'sha256'), 'hex')  AS client_ref,
  'individual'::text                                    AS client_type,
  p.id                                                  AS product_id,
  p.label                                               AS product_label,
  pf.label                                              AS family_label
FROM public.requests r
LEFT JOIN institution.products p  ON p.code = r.product_type
LEFT JOIN institution.product_families pf ON pf.id = p.family_id
WHERE r.status = 'open'
  AND (r.decision_deadline IS NULL OR r.decision_deadline > now());

-- 5. Grant read access to authenticated role
GRANT SELECT ON institution.marketplace_requests TO authenticated;

-- 6. Verify
SELECT * FROM institution.marketplace_requests LIMIT 5;
