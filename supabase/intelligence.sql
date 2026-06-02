-- =============================================================
-- Ficium Intelligence Layer — Anonymised Market Aggregations
-- Run once in Supabase SQL Editor (public schema, service role)
-- No PII ever stored or exposed. All outputs are statistics.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Market rate snapshots per product type
--    Source: institution.institution_bids (rate as decimal 0.085)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_market_rates AS
SELECT
  r.product_type,
  COUNT(DISTINCT b.id)                                    AS bid_count,
  COUNT(DISTINCT r.id)                                    AS request_count,
  ROUND((MIN(b.rate) * 100)::numeric, 2)                 AS min_rate_pct,
  ROUND((MAX(b.rate) * 100)::numeric, 2)                 AS max_rate_pct,
  ROUND((AVG(b.rate) * 100)::numeric, 2)                 AS avg_rate_pct,
  ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY b.rate) * 100)::numeric, 2) AS p25_rate_pct,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.rate) * 100)::numeric, 2) AS p75_rate_pct,
  NOW()                                                   AS computed_at
FROM institution.institution_bids b
JOIN public.requests r ON r.id = b.request_id
WHERE b.status IN ('submitted', 'accepted')
  AND b.created_at > NOW() - INTERVAL '90 days'
GROUP BY r.product_type;

-- ─────────────────────────────────────────────────────────────
-- 2. Request demand patterns — what clients need most
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_request_patterns AS
SELECT
  product_type,
  COUNT(*)                                               AS total_requests,
  COUNT(*) FILTER (WHERE status = 'open')               AS open_requests,
  COUNT(*) FILTER (WHERE status = 'closed')             AS closed_requests,
  ROUND(AVG(amount)::numeric, 0)                        AS avg_amount,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount)::numeric, 0) AS median_amount,
  ROUND(AVG(preferred_term_months)::numeric, 0)         AS avg_term_months,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'closed') /
    NULLIF(COUNT(*), 0), 1
  )                                                      AS close_rate_pct,
  NOW()                                                  AS computed_at
FROM public.requests
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY product_type;

-- ─────────────────────────────────────────────────────────────
-- 3. Bid acceptance intelligence — what bids win
--    Source: public.bid_acceptances JOIN institution.institution_bids
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_acceptance_intelligence AS
SELECT
  r.product_type,
  COUNT(ba.id)                                           AS total_acceptances,
  ROUND((AVG(b.rate) * 100)::numeric, 2)                AS avg_winning_rate_pct,
  ROUND((MIN(b.rate) * 100)::numeric, 2)                AS min_winning_rate_pct,
  ROUND((MAX(b.rate) * 100)::numeric, 2)                AS max_winning_rate_pct,
  ROUND(AVG(b.amount_offered)::numeric, 0)              AS avg_winning_amount,
  ROUND(AVG(b.term_months)::numeric, 0)                 AS avg_winning_term_months,
  -- How far below market avg did winning bids sit?
  ROUND((
    AVG(b.rate) - (
      SELECT AVG(b2.rate)
      FROM institution.institution_bids b2
      JOIN public.requests r2 ON r2.id = b2.request_id
      WHERE r2.product_type = r.product_type
        AND b2.status IN ('submitted','accepted')
    )
  ) * 100, 2)                                            AS rate_vs_market_avg_pct,
  NOW()                                                  AS computed_at
FROM public.bid_acceptances ba
JOIN institution.institution_bids b  ON b.id  = ba.bid_id
JOIN public.requests r               ON r.id  = ba.request_id
WHERE ba.accepted_at > NOW() - INTERVAL '90 days'
GROUP BY r.product_type;

-- ─────────────────────────────────────────────────────────────
-- 4. Rate trends — weekly average per product (last 12 weeks)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_rate_trends AS
SELECT
  r.product_type,
  DATE_TRUNC('week', b.created_at)                      AS week,
  ROUND((AVG(b.rate) * 100)::numeric, 2)                AS avg_rate_pct,
  COUNT(b.id)                                            AS bid_volume,
  COUNT(DISTINCT b.institution_id)                      AS institution_count
FROM institution.institution_bids b
JOIN public.requests r ON r.id = b.request_id
WHERE b.status IN ('submitted','accepted')
  AND b.created_at > NOW() - INTERVAL '12 weeks'
GROUP BY r.product_type, DATE_TRUNC('week', b.created_at)
ORDER BY r.product_type, week DESC;

-- ─────────────────────────────────────────────────────────────
-- 5. Institution competitiveness — aggregate only, no names
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_market_competitiveness AS
SELECT
  r.product_type,
  COUNT(DISTINCT b.institution_id)                      AS active_institutions,
  ROUND(AVG(bid_counts.bids_per_request)::numeric, 1)  AS avg_bids_per_request,
  MAX(bid_counts.bids_per_request)                      AS max_bids_per_request
FROM (
  SELECT request_id, COUNT(*) AS bids_per_request
  FROM institution.institution_bids
  WHERE status IN ('submitted','accepted')
    AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY request_id
) bid_counts
JOIN institution.institution_bids b ON b.request_id = bid_counts.request_id
JOIN public.requests r              ON r.id = b.request_id
GROUP BY r.product_type;

-- ─────────────────────────────────────────────────────────────
-- Grant read to authenticated (used by api/intelligence.ts via service role)
-- ─────────────────────────────────────────────────────────────
GRANT SELECT ON public.v_market_rates             TO authenticated, service_role;
GRANT SELECT ON public.v_request_patterns         TO authenticated, service_role;
GRANT SELECT ON public.v_acceptance_intelligence  TO authenticated, service_role;
GRANT SELECT ON public.v_rate_trends              TO authenticated, service_role;
GRANT SELECT ON public.v_market_competitiveness   TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────
-- SELECT * FROM public.v_market_rates;
-- SELECT * FROM public.v_request_patterns;
-- SELECT * FROM public.v_acceptance_intelligence;
-- SELECT * FROM public.v_rate_trends LIMIT 20;
-- SELECT * FROM public.v_market_competitiveness;
