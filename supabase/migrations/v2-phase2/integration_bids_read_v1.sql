-- App DB (wixfhjlsjkiwfvqewvmt). Bid lists without a direct link to the portal: read from the bid events the
-- borrower side already receives (integration.bid_shadow), instead of POST /public/requests/bids/bulk on
-- portal-api (shared secret + the borrower's account id).
--
-- Same output as the portal endpoint it replaces: per request owned by the caller, the live bids
-- (submitted / under_review), cheapest first, same field names. The bid the borrower accepted is left out, as
-- the portal did (acceptance happens on this side, so the shadow still says 'submitted' for it).
CREATE OR REPLACE FUNCTION public.integration_bids_for(p_client_id uuid, p_request_ids uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, integration, public AS $$
  SELECT coalesce(jsonb_object_agg(q.id::text, coalesce(b.bids, '[]'::jsonb)), '{}'::jsonb)
  FROM public.requests q
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'id',               s.bid_id,
             'request_id',       s.request_id,
             'institution_id',   s.payload -> 'institution_id',
             'institution_name', s.payload -> 'institution_name',
             'institution_logo', s.payload -> 'institution_logo_url',
             'rate',             s.payload -> 'rate',
             'rate_type',        s.payload -> 'rate_type',
             'rate_valid_days',  s.payload -> 'rate_valid_days',
             'amount_offered',   s.payload -> 'amount_offered',
             'term_months',      s.payload -> 'term_months',
             'conditions',       coalesce(s.payload -> 'conditions', '{}'::jsonb),
             'fee_structure',    coalesce(s.payload -> 'fee_structure', '{}'::jsonb),
             'status',           s.status,
             'submitted_at',     s.payload -> 'submitted_at',
             'expires_at',       s.payload -> 'expires_at',
             'benefits',         coalesce(s.payload -> 'benefits', '[]'::jsonb),
             'allocations',      coalesce(s.payload -> 'allocations', '[]'::jsonb))
           ORDER BY (s.payload ->> 'rate')::numeric ASC) AS bids
      FROM integration.bid_shadow s
     WHERE s.request_id = q.id
       AND s.status IN ('submitted', 'under_review')
       AND s.bid_id IS DISTINCT FROM q.accepted_bid_id
  ) b ON true
  WHERE q.client_id = p_client_id AND q.id = ANY(p_request_ids);
$$;
REVOKE ALL ON FUNCTION public.integration_bids_for(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_bids_for(uuid, uuid[]) TO service_role;
