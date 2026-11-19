-- Marketplace monitor: the request → bid → acceptance funnel, for the app admin site. App DB side.
--
-- The admin site never connects to this database. It asks for this over the signed admin channel
-- (POST /api/internal?op=admin-app {"action":"marketplace","days":30}) and shows it on its
-- "Marketplace" page. Totals only: no borrower, request id, bank or brief appears in the answer.
--
-- Cohort = requests created in the last p_days (7, 30, 90 or 365). For those:
--   posted, got at least one bid, accepted, the bank declined the deal after acceptance,
--   and every status; hours to first bid and to acceptance (median, 90th percentile);
--   bids per request that got any; amounts requested and accepted; the same per product; weekly.
-- Plus the state of the marketplace NOW, whatever the window: open requests, and open requests
-- with no bid after 24 hours (the liquidity alarm), with the age of the oldest.
--
-- Bids are the ones the portal sent here (integration.bid_shadow, every status, so a bid later
-- withdrawn still counts as a bid received). Acceptances are public.bid_acceptances.

BEGIN;

CREATE FUNCTION public.admin_marketplace_stats(p_days int)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  d     int := CASE WHEN p_days IN (7, 30, 90, 365) THEN p_days ELSE 30 END;
  since timestamptz := now() - make_interval(days => d);
  out   jsonb;
BEGIN
  WITH r AS (
    SELECT q.id, q.product_type::text AS product, q.status::text AS status, q.amount, q.created_at,
           q.accepted_bid_id, q.relisted_from
      FROM public.requests q
     WHERE q.created_at >= since
  ), b AS (
    SELECT s.request_id, count(*) AS bids, min(s.received_at) AS first_bid_at
      FROM integration.bid_shadow s JOIN r ON r.id = s.request_id
     GROUP BY s.request_id
  ), a AS (
    SELECT ba.request_id, min(ba.accepted_at) AS accepted_at
      FROM public.bid_acceptances ba JOIN r ON r.id = ba.request_id
     GROUP BY ba.request_id
  ), x AS (
    SELECT r.*, coalesce(b.bids, 0) AS bids, b.first_bid_at, a.accepted_at,
           (a.accepted_at IS NOT NULL OR r.accepted_bid_id IS NOT NULL
             OR r.status IN ('accepted', 'deal_declined')) AS was_accepted,
           extract(epoch FROM b.first_bid_at - r.created_at) / 3600.0 AS h_bid,
           extract(epoch FROM a.accepted_at - r.created_at) / 3600.0 AS h_accept
      FROM r LEFT JOIN b ON b.request_id = r.id LEFT JOIN a ON a.request_id = r.id
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'days', d,
    'funnel', (SELECT jsonb_build_object(
        'posted',        count(*),
        'relisted',      count(*) FILTER (WHERE relisted_from IS NOT NULL),
        'with_bid',      count(*) FILTER (WHERE bids > 0),
        'accepted',      count(*) FILTER (WHERE was_accepted),
        'bank_declined', count(*) FILTER (WHERE status = 'deal_declined'),
        'bids_per_request_with_bid', round(avg(bids) FILTER (WHERE bids > 0), 1),
        'requested_amount', coalesce(sum(amount), 0),
        'accepted_amount',  coalesce(sum(amount) FILTER (WHERE was_accepted), 0))
      FROM x),
    'hours_to_first_bid', (SELECT jsonb_build_object(
        'median', round((percentile_cont(0.5) WITHIN GROUP (ORDER BY h_bid))::numeric, 1),
        'p90',    round((percentile_cont(0.9) WITHIN GROUP (ORDER BY h_bid))::numeric, 1))
      FROM x WHERE h_bid IS NOT NULL),
    'hours_to_acceptance', (SELECT jsonb_build_object(
        'median', round((percentile_cont(0.5) WITHIN GROUP (ORDER BY h_accept))::numeric, 1),
        'p90',    round((percentile_cont(0.9) WITHIN GROUP (ORDER BY h_accept))::numeric, 1))
      FROM x WHERE h_accept IS NOT NULL),
    'status', coalesce((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM x GROUP BY status) s), '{}'::jsonb),
    'by_product', coalesce((SELECT jsonb_agg(p ORDER BY (p->>'posted')::int DESC, p->>'product') FROM (
        SELECT jsonb_build_object('product', product, 'posted', count(*),
                 'with_bid', count(*) FILTER (WHERE bids > 0), 'accepted', count(*) FILTER (WHERE was_accepted),
                 'requested_amount', coalesce(sum(amount), 0)) AS p
          FROM x GROUP BY product) t), '[]'::jsonb),
    -- Every week in the window, including weeks with nothing posted (a gap is information).
    'weekly', (SELECT jsonb_agg(w ORDER BY wk) FROM (
        SELECT g.wk, jsonb_build_object('week', to_char(g.wk, 'YYYY-MM-DD'),
                 'posted', count(x.id), 'with_bid', count(x.id) FILTER (WHERE x.bids > 0),
                 'accepted', count(x.id) FILTER (WHERE x.was_accepted)) AS w
          FROM generate_series(date_trunc('week', since), date_trunc('week', now()), interval '1 week') AS g(wk)
          LEFT JOIN x ON date_trunc('week', x.created_at) = g.wk
         GROUP BY g.wk) t),
    'now', (SELECT jsonb_build_object(
        'open', count(*),
        'open_no_bid_24h', count(*) FILTER (WHERE nb.request_id IS NULL AND q.created_at < now() - interval '24 hours'),
        'oldest_no_bid_hours', round((max(extract(epoch FROM now() - q.created_at) / 3600.0)
                                FILTER (WHERE nb.request_id IS NULL AND q.created_at < now() - interval '24 hours'))::numeric, 0))
      FROM public.requests q
      LEFT JOIN (SELECT DISTINCT request_id FROM integration.bid_shadow) nb ON nb.request_id = q.id
     WHERE q.status = 'open')
  ) INTO out;
  RETURN out;
END $$;

REVOKE ALL ON FUNCTION public.admin_marketplace_stats(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_stats(int) TO service_role;

SELECT admin.migration_applied('20261119120000_admin_marketplace_stats');

COMMIT;
