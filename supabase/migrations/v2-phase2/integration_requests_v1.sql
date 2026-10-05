-- APPLIED to the App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-02 as three migrations:
--   integration_ordered_claim_2026_10_02, integration_phase1_builder_2026_10_02, integration_request_publisher_2026_10_02.
-- Step 3 of the integration-contract migration, BORROWER side: build Phase 1 here, publish request events through the outbox.
-- Triggers are in integration_request_triggers.sql (applied after the portal receiver was deployed).
--
-- PROVEN EQUAL TO THE PYTHON ORIGINAL (ficium-portal-api marketplace._build_phase1, employer removed):
--   supabase/tests/phase1_golden.sql downloads the golden fixtures that ficium-portal-api scripts/gen_phase1_fixtures.py
--   generated FROM THE REAL PYTHON BUILDER and checks this SQL against them: 340/340 builder cases identical and
--   2748/2748 rounding cases identical (incl. Python's round-half-even on exact ties, which Postgres round() gets wrong).
--   Sabotage checks: changing amount breaks 239/340, changing income breaks 340/340; an employer injected into the input
--   row never appears in the output. Known, accepted divergences: float() of "1_000"/"inf"/"nan" strings (Python accepts, SQL treats as invalid).
-- Publisher verified on the 13 real requests (rolled back): no identity leaks (employer, client id, any clients column),
--   only contract-allowed Phase 1 keys, anonymous id stable per borrower and never equal to the real id, coalescing and
--   per-aggregate ordering, and a publisher that raises on insert/status/content changes never breaks the borrower's write.

-- 0. Per-aggregate ordered delivery (see db/017 on the portal side for the reasoning).
CREATE OR REPLACE FUNCTION integration.claim_batch(p_limit integer DEFAULT 20, p_lease_seconds integer DEFAULT 60)
RETURNS TABLE (id text, envelope jsonb, attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, integration AS $$
BEGIN
  RETURN QUERY
  UPDATE integration.outbox o
     SET status = 'sending', lease_until = now() + make_interval(secs => p_lease_seconds), attempts = o.attempts + 1
   WHERE o.id IN (
     SELECT x.id FROM integration.outbox x
      WHERE ((x.status = 'pending' AND x.next_attempt_at <= now()) OR (x.status = 'sending' AND x.lease_until < now()))
        AND NOT EXISTS (SELECT 1 FROM integration.outbox e WHERE e.aggregate_id = x.aggregate_id AND e.sequence < x.sequence AND e.status <> 'delivered')
      ORDER BY x.created_at LIMIT greatest(1, least(p_limit, 100)) FOR UPDATE SKIP LOCKED)
  RETURNING o.id, o.envelope, o.attempts;
END $$;
REVOKE ALL ON FUNCTION integration.claim_batch(integer, integer) FROM PUBLIC, anon, authenticated;

-- 1. Phase 1 builder: exact port. Pure function: one enriched request row (jsonb) -> Phase 1 (jsonb). Doubles like Python.
CREATE OR REPLACE FUNCTION integration._py_float(p text) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p IS NOT NULL AND btrim(p) ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$' THEN RETURN btrim(p)::double precision; END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION integration._py_truthy(j jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT j IS NOT NULL AND j <> 'null'::jsonb AND j <> '""'::jsonb AND j <> '0'::jsonb AND j <> 'false'::jsonb AND j <> '[]'::jsonb AND j <> '{}'::jsonb
$$;

CREATE OR REPLACE FUNCTION integration._strip_top_nulls(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) FROM jsonb_each(j) e WHERE e.value <> 'null'::jsonb
$$;

CREATE OR REPLACE FUNCTION integration._pa_num(j jsonb) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE jsonb_typeof(j)
    WHEN 'number'  THEN (j #>> '{}')::double precision
    WHEN 'string'  THEN integration._py_float(j #>> '{}')
    WHEN 'boolean' THEN CASE WHEN j = 'true'::jsonb THEN 1::double precision ELSE 0::double precision END
    ELSE NULL END;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

-- Python round(x, 1): the exact binary value of the double, correctly rounded, ties to even.
CREATE OR REPLACE FUNCTION integration.py_round1(x double precision) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE b bytea; neg boolean; expo int; mant bigint; m numeric; e int; n numeric; d numeric; q numeric; rem numeric;
BEGIN
  IF x IS NULL THEN RETURN NULL; END IF;
  IF x = 0 THEN RETURN x; END IF;
  b := float8send(x);
  neg := get_byte(b, 0) >= 128;
  expo := ((get_byte(b, 0) & 127) << 4) | (get_byte(b, 1) >> 4);
  mant := ((get_byte(b, 1) & 15)::bigint << 48) | (get_byte(b, 2)::bigint << 40) | (get_byte(b, 3)::bigint << 32)
        | (get_byte(b, 4)::bigint << 24) | (get_byte(b, 5)::bigint << 16) | (get_byte(b, 6)::bigint << 8) | get_byte(b, 7)::bigint;
  IF expo = 0 THEN m := mant; e := -1074; ELSE m := mant + 4503599627370496; e := expo - 1075; END IF;
  IF e >= 0 THEN n := m * (2::numeric ^ e) * 10; d := 1; ELSE n := m * 10 * (5::numeric ^ (-e)); d := 10::numeric ^ (-e); END IF;
  q := div(n, d); rem := n - q * d;
  IF rem * 2 > d OR (rem * 2 = d AND mod(q, 2) = 1) THEN q := q + 1; END IF;
  RETURN ((CASE WHEN neg THEN -q ELSE q END) / 10)::double precision;
END $$;

CREATE OR REPLACE FUNCTION integration.phase1_from_row(p jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, integration AS $$
DECLARE
  rawpt text := p ->> 'product_type';
  pt text := lower(coalesce(p ->> 'product_type', ''));
  amount double precision := ((p ->> 'amount')::numeric)::double precision;
  term int := nullif(p ->> 'preferred_term_months', '')::int;
  parsed jsonb := '{}'::jsonb;
  income double precision; networth double precision; px double precision; existing double precision;
  col_type text; col_sub text; prop text; asset_val double precision; ltv double precision;
  dsr_cur double precision; dsr_post double precision; lb numeric; loan_balance double precision;
  band text; tier text; rs int; age int; yrs numeric; ph jsonb; pa jsonb; inv jsonb := '{}'::jsonb;
  verified boolean := coalesce((p ->> 'kyc_status') = 'verified', false);
BEGIN
  IF coalesce(p ->> 'purpose', '') <> '' THEN
    SELECT coalesce(jsonb_object_agg(z.k, z.v), '{}'::jsonb) INTO parsed FROM (
      SELECT DISTINCT ON (s.k) s.k, s.v FROM (
        SELECT t.ord,
               lower(replace(regexp_replace(split_part(t.sp, ':', 1), '^\s+|\s+$', '', 'g'), ' ', '_')) AS k,
               regexp_replace(substr(t.sp, strpos(t.sp, ':') + 1), '^\s+|\s+$', '', 'g') AS v
          FROM (SELECT regexp_replace(x.part, '^\s+|\s+$', '', 'g') AS sp, x.ord
                  FROM regexp_split_to_table(p ->> 'purpose', '\|') WITH ORDINALITY AS x(part, ord)) t
         WHERE strpos(t.sp, ':') > 0
      ) s ORDER BY s.k, s.ord DESC) z;
  END IF;
  income    := coalesce(nullif((p ->> 'monthly_income')::numeric, 0), nullif((p ->> 'snap_income')::numeric, 0))::double precision;
  networth  := coalesce(nullif((p ->> 'snap_net_worth')::numeric, 0), nullif((p ->> 'total_net_worth')::numeric, 0))::double precision;
  px        := nullif((p ->> 'monthly_loan_payments')::numeric, 0)::double precision;
  IF pt IN ('mortgage', 'home_loan') THEN
    prop := lower(coalesce(parsed ->> 'property_type', '')); col_sub := parsed ->> 'property_type';
    col_type := CASE WHEN position('land' IN prop) > 0 THEN 'land' ELSE 'residential_property' END;
  ELSIF pt IN ('auto', 'vehicle', 'car_loan') THEN
    col_type := 'vehicle'; col_sub := coalesce(nullif(parsed ->> 'vehicle_make', ''), parsed ->> 'vehicle_type');
  ELSIF pt IN ('business', 'business_loan') THEN col_type := 'business_asset'; col_sub := NULL;
  ELSE col_type := 'none'; col_sub := NULL; END IF;
  IF col_type <> 'none' THEN
    asset_val := integration._py_float(coalesce(nullif(parsed ->> 'property_value', ''), nullif(parsed ->> 'vehicle_value', ''), '0'));
    IF asset_val IS NOT NULL AND asset_val > 0 THEN ltv := integration.py_round1((amount / asset_val) * 100); END IF;
  END IF;
  IF income IS NOT NULL THEN
    existing := px;
    IF existing IS NULL THEN existing := integration._py_float(coalesce(nullif(parsed ->> 'monthly_debt', ''), '0')); END IF;
    existing := coalesce(existing, 0);
    dsr_cur := integration.py_round1((existing / income) * 100);
    IF term IS NOT NULL AND term <> 0 THEN dsr_post := integration.py_round1(((existing + amount / term::double precision) / income) * 100); END IF;
  END IF;
  lb := coalesce((p ->> 'mortgage_balance')::numeric, 0) + coalesce((p ->> 'personal_loan_balance')::numeric, 0)
      + coalesce((p ->> 'credit_card_balance')::numeric, 0) + coalesce((p ->> 'vehicle_loan_balance')::numeric, 0);
  loan_balance := nullif(lb, 0)::double precision;
  band := CASE WHEN networth IS NULL THEN NULL WHEN networth < 0 THEN 'negative' WHEN networth < 500000 THEN '< 500k'
               WHEN networth < 1000000 THEN '500k-1M' WHEN networth < 5000000 THEN '1M-5M' ELSE '> 5M' END;
  rs := nullif(p ->> 'risk_score', '')::int;
  tier := CASE WHEN rs IS NULL THEN NULL WHEN rs < 20 THEN 'A' WHEN rs < 40 THEN 'B' WHEN rs < 60 THEN 'C' ELSE 'D' END;
  age := nullif(p ->> 'client_age', '')::int; IF age = 0 THEN age := NULL; END IF;
  yrs := nullif((p ->> 'years_of_employment')::numeric, 0);
  ph := jsonb_build_object(
    'loan_purpose', parsed -> 'purpose', 'collateral_type', to_jsonb(col_type), 'collateral_sub', to_jsonb(col_sub),
    'ltv_pct', to_jsonb(ltv), 'kyc_verified', to_jsonb(verified),
    'employment_status', p -> 'employment_status', 'employment_type', p -> 'employment_type',
    'years_employed', to_jsonb(yrs::double precision), 'gross_monthly_income', to_jsonb(income),
    'income_verified', to_jsonb(verified), 'dsr_current_pct', to_jsonb(dsr_cur), 'dsr_post_pct', to_jsonb(dsr_post),
    'net_worth_band', to_jsonb(band), 'has_existing_loans', p -> 'has_existing_loans',
    'existing_monthly_repayment', to_jsonb(px), 'existing_loan_balance', to_jsonb(loan_balance),
    'loan_breakdown', p -> 'loan_breakdown', 'health_score', p -> 'health_score', 'risk_score', p -> 'risk_score',
    'affordability_score', p -> 'affordability_score', 'risk_tier', to_jsonb(tier), 'age', to_jsonb(age));
  pa := p -> 'product_answers';
  IF NOT (rawpt = ANY (ARRAY['sme_loan','personal_loan','mortgage','credit_card','business_loan','leasing','overdraft']))
     AND pa IS NOT NULL AND jsonb_typeof(pa) = 'object' AND pa <> '{}'::jsonb THEN
    inv := integration._strip_top_nulls(jsonb_build_object(
      'risk_appetite', pa -> 'risk_appetite', 'investment_horizon', pa -> 'investment_horizon',
      'liquidity_pref', CASE WHEN integration._py_truthy(pa -> 'liquidity') THEN pa -> 'liquidity'
                             WHEN integration._py_truthy(pa -> 'withdrawal') THEN pa -> 'withdrawal' ELSE pa -> 'flexibility' END,
      'investment_style', pa -> 'investment_style',
      'target_amount', to_jsonb(integration._pa_num(pa -> 'target_amount')), 'monthly_contribution', to_jsonb(integration._pa_num(pa -> 'monthly_contribution')),
      'investment_objective', pa -> 'objective', 'investment_product_answers', pa));
  END IF;
  RETURN integration._strip_top_nulls(ph || inv);
END $$;

-- 2. Publisher: anon id (HMAC key generated in Vault, never printed), payload builder, coalescing publisher, failure-proof triggers, backfill.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'borrower_anon_key') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'borrower_anon_key', 'HMAC key for anonymous borrower ids. Never share with the institution side.');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS integration.emit_error (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), request_id uuid, stage text, error text);
ALTER TABLE integration.emit_error ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration.emit_error FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION integration.anon_borrower_id(p_client uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, integration, extensions AS $$
DECLARE k text; h bytea;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'borrower_anon_key';
  IF k IS NULL THEN RAISE EXCEPTION 'borrower_anon_key missing'; END IF;
  h := extensions.hmac(p_client::text, k, 'sha256');
  RETURN encode(substring(h FROM 1 FOR 16), 'hex')::uuid;
END $$;

CREATE OR REPLACE FUNCTION integration.request_row(p_request_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
  SELECT to_jsonb(q) FROM (
    SELECT r.id, r.client_id, r.product_type::text AS product_type, r.amount, r.preferred_term_months, r.purpose,
           r.product_answers, r.max_rate, r.decision_deadline, r.status::text AS status, r.created_at, r.allocation_mode,
           (SELECT json_agg(json_build_object('product_type', ra.product_type::text, 'amount', ra.amount, 'sort_order', ra.sort_order) ORDER BY ra.sort_order)
              FROM public.request_allocations ra WHERE ra.request_id = r.id) AS allocations,
           c.kyc_status::text AS kyc_status, EXTRACT(YEAR FROM AGE(c.date_of_birth))::int AS client_age,
           cd.employment_status, cd.monthly_income, cd.total_net_worth, cd.has_existing_loans, cd.health_score, cd.risk_score, cd.affordability_score,
           ed.employment_type, ed.years_of_employment,
           s.monthly_loan_payments, s.monthly_income AS snap_income, s.net_worth AS snap_net_worth, s.mortgage_balance,
           s.personal_loan_balance, s.credit_card_balance, s.vehicle_loan_balance,
           (SELECT json_agg(json_build_object('type', l.loan_type, 'outstanding', l.outstanding_amount, 'monthly', l.monthly_repayment,
                                              'bank', l.bank_name, 'months_left', l.remaining_months) ORDER BY l.outstanding_amount DESC)
              FROM public.client_loan_details l WHERE l.client_id = r.client_id) AS loan_breakdown
    FROM public.requests r
    LEFT JOIN public.clients c ON c.id = r.client_id
    LEFT JOIN public.client_dossier cd ON cd.client_id = r.client_id
    LEFT JOIN public.employment_details ed ON ed.user_id = r.client_id
    LEFT JOIN public.client_financial_snapshot s ON s.client_id = r.client_id
    WHERE r.id = p_request_id LIMIT 1) q
$$;

CREATE OR REPLACE FUNCTION integration.build_request_published(p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
DECLARE row_ jsonb := integration.request_row(p_request_id);
BEGIN
  IF row_ IS NULL THEN RETURN NULL; END IF;
  RETURN integration._strip_top_nulls(jsonb_build_object(
    'request_id', row_ -> 'id', 'anon_borrower_id', to_jsonb(integration.anon_borrower_id((row_ ->> 'client_id')::uuid)),
    'product_type', row_ -> 'product_type', 'amount', row_ -> 'amount', 'currency', 'MUR',
    'term_months', row_ -> 'preferred_term_months', 'max_rate', row_ -> 'max_rate',
    'decision_deadline', row_ -> 'decision_deadline', 'allocation_mode', row_ -> 'allocation_mode',
    'allocations', coalesce(row_ -> 'allocations', '[]'::jsonb),
    'phase1', integration.phase1_from_row(row_), 'created_at', row_ -> 'created_at'));
END $$;

-- Refresh the newest UNSENT request.published instead of stacking duplicates; once attempted, a new one queues behind it, in order.
CREATE OR REPLACE FUNCTION integration.publish_request(p_request_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
DECLARE d jsonb; n int;
BEGIN
  d := integration.build_request_published(p_request_id);
  IF d IS NULL THEN RETURN; END IF;
  UPDATE integration.outbox SET envelope = jsonb_set(envelope, '{data}', d)
   WHERE id = (SELECT o.id FROM integration.outbox o WHERE o.aggregate_id = p_request_id::text AND o.type = 'request.published'
                 AND o.status = 'pending' AND o.attempts = 0 ORDER BY o.sequence DESC LIMIT 1);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN PERFORM integration.enqueue('request.published', p_request_id::text, d, 'borrower'); END IF;
END $$;

CREATE OR REPLACE FUNCTION integration.publish_status(p_request_id uuid, p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM integration.outbox WHERE aggregate_id = p_request_id::text AND type = 'request.published') THEN
    PERFORM integration.publish_request(p_request_id);
  END IF;
  PERFORM integration.enqueue('request.status_changed', p_request_id::text,
          jsonb_build_object('request_id', p_request_id, 'status', p_status, 'changed_at', now()), 'borrower');
END $$;

-- Triggers must NEVER break a borrower's request: any failure is logged to integration.emit_error, the transaction continues.
CREATE OR REPLACE FUNCTION integration.trg_requests_emit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN PERFORM integration.publish_request(NEW.id);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN PERFORM integration.publish_status(NEW.id, NEW.status::text);
    ELSIF (NEW.amount, NEW.preferred_term_months, NEW.purpose, NEW.product_answers, NEW.max_rate, NEW.decision_deadline, NEW.allocation_mode, NEW.product_type)
          IS DISTINCT FROM
          (OLD.amount, OLD.preferred_term_months, OLD.purpose, OLD.product_answers, OLD.max_rate, OLD.decision_deadline, OLD.allocation_mode, OLD.product_type)
    THEN PERFORM integration.publish_request(NEW.id); END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO integration.emit_error (request_id, stage, error) VALUES (NEW.id, 'requests ' || TG_OP, left(SQLERRM, 500));
  END;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION integration.trg_allocations_emit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
DECLARE rid uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.request_id ELSE NEW.request_id END;
BEGIN
  BEGIN PERFORM integration.publish_request(rid);
  EXCEPTION WHEN OTHERS THEN INSERT INTO integration.emit_error (request_id, stage, error) VALUES (rid, 'allocations ' || TG_OP, left(SQLERRM, 500));
  END;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION integration.backfill_request_events() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, integration AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id, status::text AS status FROM public.requests ORDER BY created_at LOOP
    IF NOT EXISTS (SELECT 1 FROM integration.outbox WHERE aggregate_id = r.id::text AND type = 'request.published') THEN
      PERFORM integration.publish_request(r.id);
      IF r.status <> 'open' THEN PERFORM integration.publish_status(r.id, r.status); END IF;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION integration._py_float(text), integration._py_truthy(jsonb), integration._strip_top_nulls(jsonb), integration._pa_num(jsonb),
  integration.py_round1(double precision), integration.phase1_from_row(jsonb), integration.anon_borrower_id(uuid), integration.request_row(uuid),
  integration.build_request_published(uuid), integration.publish_request(uuid), integration.publish_status(uuid, text),
  integration.trg_requests_emit(), integration.trg_allocations_emit(), integration.backfill_request_events() FROM PUBLIC, anon, authenticated;
