-- =============================================================================
-- Bid notification trigger (PORTAL DB — egwobcajdlragubtkpqp)
--
-- Fires on every marketplace.bid INSERT.
-- Calls Vercel /api/bid-notify via pg_net with full enriched payload:
--   bid_id, request_id, rate, rate_type, amount_offered, term_months,
--   product_label, product_code, request_amount, currency, consumer_ref
--
-- Vercel endpoint:
--   1. Resolves consumer from App DB via request_id
--   2. Writes public.notifications row (idempotent on bid_id)
--   3. Sends Resend email
--
-- Vault keys required (already set):
--   portal_api_url, app_service_secret
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS bid_notify;

CREATE OR REPLACE FUNCTION bid_notify.dispatch(p_bid_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = bid_notify, marketplace, catalog, public, extensions, vault AS $$
DECLARE
  v_url     text;
  v_secret  text;
  v_payload jsonb;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'portal_api_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'app_service_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'bid_notify.dispatch: vault keys not configured, skipping';
    RETURN;
  END IF;

  SELECT jsonb_build_object(
    'bid_id',         b.id,
    'request_id',     b.request_id,
    'rate',           b.rate,
    'rate_type',      b.rate_type,
    'amount_offered', b.amount_offered,
    'term_months',    b.term_months,
    'submitted_at',   b.submitted_at,
    'product_label',  p.label,
    'product_code',   p.code,
    'request_amount', r.amount,
    'currency',       r.currency,
    'consumer_ref',   r.consumer_ref
  )
  INTO v_payload
  FROM marketplace.bid     b
  JOIN marketplace.request r ON r.id = b.request_id
  JOIN catalog.product     p ON p.id = r.product_id
  WHERE b.id = p_bid_id;

  IF v_payload IS NULL THEN
    RAISE NOTICE 'bid_notify.dispatch: bid % not found', p_bid_id;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://ficium.vercel.app/api/bid-notify',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Service-Secret', v_secret
    ),
    body    := v_payload,
    timeout_milliseconds := 15000
  );
END; $$;
REVOKE ALL ON FUNCTION bid_notify.dispatch(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION bid_notify.on_bid_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = bid_notify, public AS $$
BEGIN
  BEGIN
    PERFORM bid_notify.dispatch(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'bid_notify dispatch failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bid_notify ON marketplace.bid;
CREATE TRIGGER trg_bid_notify
  AFTER INSERT ON marketplace.bid
  FOR EACH ROW EXECUTE FUNCTION bid_notify.on_bid_insert();
