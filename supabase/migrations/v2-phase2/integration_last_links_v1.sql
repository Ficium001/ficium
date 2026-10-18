-- App DB (wixfhjlsjkiwfvqewvmt). Contract 1.10.0: the last direct links to the portal.
--
-- 1. request.window_closed: the institution side closed a request's bidding window. 'no_offers' gives the
--    borrower the notice the portal used to post to /api/internal with the shared secret; 'offers' is new.
-- 2. market.intelligence: one snapshot row, read in the shape the adviser already uses (percent fields).
--    Replaces fetching /public/market-intelligence from portal-api with the shared secret.
-- 3. deal.progress_updated now notifies the borrower when the current stage changes or the deal completes.
--    (portal-api's direct "pipeline-stage-advanced" call was an action /api/internal never had: it never worked.)
-- 4. integration_portfolio_for(client): the portfolio from this side's own deal progress, in the shape the
--    screen already maps. (It called portal-api from the browser, which compared a raw id with a hashed one
--    and never returned anything.)

-- 1 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION integration.apply_request_window_closed_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; v_client uuid; n int := (d ->> 'offer_count')::int;
BEGIN
  IF p_env ->> 'type' <> 'request.window_closed' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_request_window_closed_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT client_id INTO v_client FROM public.requests WHERE id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'request.window_closed for an unknown request: %', d ->> 'request_id'; END IF;
  IF d ->> 'outcome' = 'no_offers' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (v_client, 'bid_expired', 'Your request closed with no offers',
            'No lenders placed a bid before your window closed. You can post a new request at any time.',
            '/requests/' || (d ->> 'request_id'), jsonb_build_object('request_id', d ->> 'request_id'));
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (v_client, 'bidding_closed', 'Bidding closed: ' || n || CASE WHEN n = 1 THEN ' offer' ELSE ' offers' END || ' to compare',
            'Compare the offers and accept the one that suits you.',
            '/requests/' || (d ->> 'request_id'), jsonb_build_object('request_id', d ->> 'request_id', 'offer_count', n));
  END IF;
  RETURN outcome;
END $$;
CREATE OR REPLACE FUNCTION public.integration_apply_request_window_closed_event(p_env jsonb)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_request_window_closed_event(p_env);
$$;

-- 2 ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration.market_snapshot (
  id            smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  as_of         date        NOT NULL,
  payload       jsonb       NOT NULL,
  last_event_id text        NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integration.market_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.market_snapshot FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION integration.apply_market_intelligence_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
DECLARE outcome text;
BEGIN
  IF p_env ->> 'type' <> 'market.intelligence' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_market_intelligence_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  INSERT INTO integration.market_snapshot (id, as_of, payload, last_event_id)
  VALUES (1, (p_env -> 'data' ->> 'as_of')::date, p_env -> 'data', p_env ->> 'id')
  ON CONFLICT (id) DO UPDATE SET as_of = EXCLUDED.as_of, payload = EXCLUDED.payload,
      last_event_id = EXCLUDED.last_event_id, updated_at = now();
  RETURN outcome;
END $$;
CREATE OR REPLACE FUNCTION public.integration_apply_market_intelligence_event(p_env jsonb)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT integration.apply_market_intelligence_event(p_env);
$$;

-- The adviser's existing shape (percent, 2 dp; product_type).
CREATE OR REPLACE FUNCTION public.integration_market_intelligence()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
  SELECT jsonb_build_object(
    'marketRates', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'product_type', r ->> 'product_code', 'bid_count', (r ->> 'bid_count')::int, 'request_count', (r ->> 'request_count')::int,
        'min_rate_pct', round((r ->> 'min_rate')::numeric * 100, 2), 'max_rate_pct', round((r ->> 'max_rate')::numeric * 100, 2),
        'avg_rate_pct', round((r ->> 'avg_rate')::numeric * 100, 2), 'p25_rate_pct', round((r ->> 'p25_rate')::numeric * 100, 2),
        'p75_rate_pct', round((r ->> 'p75_rate')::numeric * 100, 2)))
      FROM jsonb_array_elements(s.payload -> 'rates') r), '[]'::jsonb),
    'acceptanceIntel', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'product_type', o ->> 'product_code', 'total_acceptances', (o ->> 'total_acceptances')::int,
        'avg_winning_rate_pct', round((o ->> 'avg_winning_rate')::numeric * 100, 2),
        'min_winning_rate_pct', round((o ->> 'min_winning_rate')::numeric * 100, 2),
        'max_winning_rate_pct', round((o ->> 'max_winning_rate')::numeric * 100, 2),
        'avg_winning_amount', (o ->> 'avg_winning_amount')::numeric, 'avg_winning_term_months', (o ->> 'avg_winning_term_months')::int,
        'rate_vs_market_avg_pct', round((o ->> 'rate_vs_market_avg')::numeric * 100, 2)))
      FROM jsonb_array_elements(s.payload -> 'outcomes') o), '[]'::jsonb),
    'competitiveness', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'product_type', c ->> 'product_code', 'active_institutions', (c ->> 'active_institutions')::int,
        'avg_bids_per_request', (c ->> 'avg_bids_per_request')::numeric, 'max_bids_per_request', (c ->> 'max_bids_per_request')::int))
      FROM jsonb_array_elements(s.payload -> 'competitiveness') c), '[]'::jsonb),
    'as_of', s.as_of)
  FROM integration.market_snapshot s WHERE s.id = 1;
$$;

-- 3 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION integration.apply_deal_progress_event(p_env jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
DECLARE d jsonb := p_env -> 'data'; outcome text; r record; old jsonb; old_stage text; new_stage text;
BEGIN
  IF p_env ->> 'type' <> 'deal.progress_updated' OR p_env ->> 'source' <> 'institution' THEN
    RAISE EXCEPTION 'apply_deal_progress_event: unexpected % from %', p_env ->> 'type', p_env ->> 'source';
  END IF;
  outcome := integration.record_inbox(p_env ->> 'id', p_env ->> 'type', p_env ->> 'source',
                                      p_env ->> 'aggregate_id', (p_env ->> 'sequence')::bigint);
  IF outcome <> 'apply' THEN RETURN outcome; END IF;
  SELECT q.client_id, q.accepted_bid_id INTO r FROM public.requests q WHERE q.id = (d ->> 'request_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'deal.progress_updated for an unknown request: %', d ->> 'request_id'; END IF;
  IF r.accepted_bid_id IS DISTINCT FROM (d ->> 'bid_id')::uuid THEN
    RAISE EXCEPTION 'deal.progress_updated for a bid the borrower did not accept: %', d ->> 'bid_id';
  END IF;
  SELECT payload INTO old FROM integration.deal_progress WHERE pipeline_id = (d ->> 'pipeline_id')::uuid;
  INSERT INTO integration.deal_progress (pipeline_id, request_id, bid_id, client_id, payload, last_event_id, last_sequence)
  VALUES ((d ->> 'pipeline_id')::uuid, (d ->> 'request_id')::uuid, (d ->> 'bid_id')::uuid, r.client_id, d,
          p_env ->> 'id', (p_env ->> 'sequence')::bigint)
  ON CONFLICT (pipeline_id) DO UPDATE SET payload = EXCLUDED.payload, last_event_id = EXCLUDED.last_event_id,
      last_sequence = EXCLUDED.last_sequence, updated_at = now();

  -- Tell the borrower when their deal moved (not on the first event: acceptance has its own notice).
  IF old IS NOT NULL THEN
    IF d ->> 'status' = 'completed' AND old ->> 'status' IS DISTINCT FROM 'completed' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
      VALUES (r.client_id, 'pipeline_complete', 'Your loan is complete', 'Every step with your bank is done.',
              '/requests/' || (d ->> 'request_id'), jsonb_build_object('pipeline_id', d ->> 'pipeline_id'));
    ELSE
      SELECT s ->> 'label' INTO old_stage FROM jsonb_array_elements(old -> 'stages') s
       WHERE s ->> 'status' IN ('active', 'awaiting_approval') ORDER BY (s ->> 'position')::int LIMIT 1;
      SELECT s ->> 'label' INTO new_stage FROM jsonb_array_elements(d -> 'stages') s
       WHERE s ->> 'status' IN ('active', 'awaiting_approval') ORDER BY (s ->> 'position')::int LIMIT 1;
      IF new_stage IS NOT NULL AND new_stage IS DISTINCT FROM old_stage THEN
        INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
        VALUES (r.client_id, 'pipeline_stage_advanced', 'Your loan moved forward', 'Now at: ' || new_stage || '.',
                '/requests/' || (d ->> 'request_id'), jsonb_build_object('pipeline_id', d ->> 'pipeline_id', 'stage', new_stage));
      END IF;
    END IF;
  END IF;
  RETURN outcome;
END $$;

-- 4 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.integration_portfolio_for(p_client_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.pipeline_id, 'request_id', p.request_id, 'bid_id', p.bid_id, 'status', p.payload ->> 'status',
    'deal_amount', (p.payload -> 'deal' ->> 'amount')::numeric, 'deal_rate', (p.payload -> 'deal' ->> 'rate')::numeric,
    'deal_term_months', (p.payload -> 'deal' ->> 'term_months')::int,
    'started_at', p.payload ->> 'started_at', 'completed_at', p.payload ->> 'completed_at',
    'product_label', q.product_type, 'currency', coalesce(b.payload ->> 'currency', 'MUR'),
    'institution_name', b.payload ->> 'institution_name', 'institution_logo_url', b.payload ->> 'institution_logo_url',
    'stages', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'position', (s ->> 'position')::int, 'status', s ->> 'status', 'label', s ->> 'label', 'borrower_label', s ->> 'label',
        'started_at', s ->> 'started_at', 'completed_at', s ->> 'completed_at', 'sla_due_at', s ->> 'due_at',
        'sla_breached', (s ->> 'due_at') IS NOT NULL AND (s ->> 'due_at')::timestamptz < now()
                        AND s ->> 'status' NOT IN ('completed', 'skipped')) ORDER BY (s ->> 'position')::int)
      FROM jsonb_array_elements(p.payload -> 'stages') s), '[]'::jsonb))
    ORDER BY p.payload ->> 'started_at' DESC NULLS LAST), '[]'::jsonb)
  FROM integration.deal_progress p
  JOIN public.requests q ON q.id = p.request_id
  LEFT JOIN integration.bid_shadow b ON b.bid_id = p.bid_id
  WHERE p.client_id = p_client_id;
$$;

REVOKE ALL ON FUNCTION integration.apply_request_window_closed_event(jsonb), integration.apply_market_intelligence_event(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_apply_request_window_closed_event(jsonb), public.integration_apply_market_intelligence_event(jsonb),
  public.integration_market_intelligence(), public.integration_portfolio_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_apply_request_window_closed_event(jsonb), public.integration_apply_market_intelligence_event(jsonb),
  public.integration_market_intelligence(), public.integration_portfolio_for(uuid) TO service_role;
