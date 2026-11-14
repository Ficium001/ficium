-- Financial profile: one home per fact, scores computed by the server — App DB.
--
-- Why
--   1. Health / risk / affordability scores were computed in the borrower's
--      browser and written straight into client_dossier, which the owner can
--      UPDATE. Anyone could set their own risk score; banks read it as the
--      risk tier. Scores are now computed here, by a BEFORE trigger, from the
--      stored inputs. Whatever a client sends for a derived column is ignored.
--   2. The same facts lived in up to four places and drifted apart:
--        income        client_dossier  +  client_financial_snapshot
--        loans         client_loan_details  +  snapshot liability buckets
--        cash/invest.  asset_details  +  snapshot  +  finance.accounts
--        PEP / tax / source of wealth   client_dossier  +  compliance_details
--      Each fact now has exactly one place it is written. Every other copy is
--      derived by a trigger and cannot drift.
--
-- Homes (the only place each fact is written)
--   employment, income, dependants  client_dossier
--   job / business details          employment_details
--   existing loans                  client_loan_details
--   PEP, tax residency, wealth,     compliance_details
--   credit history declarations
--   cash, deposits                  finance.accounts once the client adds one;
--                                   until then the declared figure on the snapshot
--   investments                     finance.holdings once the client adds one;
--                                   until then the declared figure on the snapshot
--   property, vehicles, business    client_financial_snapshot
--   and other assets, expenses,
--   monthly savings
--
-- Derived (written only by triggers here)
--   client_dossier:  health_score, risk_score, affordability_score,
--                    edd_required, has_existing_loans, total_net_worth
--   client_financial_snapshot:  monthly_income, monthly_loan_payments,
--                    every liability bucket, and cash / deposits / investments
--                    when the client has itemised them
--
-- Dropped duplicates
--   public.asset_details (written at onboarding, never read)
--   client_dossier.pep_declaration, tax_residency, source_of_wealth,
--   employer_name (copies of compliance_details / employment_details)
--   compliance_details.has_credit_issues (OR of four stored flags) and
--   enhanced_due_diligence_required (now derived: client_dossier.edd_required;
--   client_profile_view previously hard-coded it to false)
--
-- Scoring change on purpose
--   The browser formula called the sum of ASSETS "net worth". It now uses real
--   net worth (assets minus loan balances) for the wealth terms, so a large
--   mortgage no longer reads as wealth. EDD keeps total assets: it asks where
--   the wealth came from, not whether it is borrowed. Every other weight and
--   threshold is unchanged.
--
-- Trigger graph, and why it terminates
--   loans / compliance / employment change   -> touch dossier (recompute)
--   loans change                             -> touch snapshot (liabilities)
--   dossier income changed                   -> touch snapshot (income)
--   snapshot net worth / total assets changed-> touch dossier (recompute)
--   A touch that does not change income (dossier) or net worth (snapshot)
--   fires nothing further. pg_trigger_depth() caps it regardless.
--
-- Safe to apply: every table here was empty on 2026-11-14 (0 users).
--
-- Rollback: restore from the pre-migration backup. The dropped columns and
-- asset_details held no rows when this ran, so nothing is lost by dropping
-- them; the app code from before this migration writes those columns and
-- must be reverted together.

BEGIN;

-- ── 0. Views that pin the columns being changed ──────────────────────────────
DROP VIEW IF EXISTS public.client_profile_view;

-- ── 1. Scoring: one pure function, used by the trigger and the live preview ──
-- Inputs (all optional, missing = 0 / false):
--   income, employment_status, net_worth, total_assets, monthly_repayment,
--   annual_revenue, is_pep, bankruptcy, blacklisted, missed_repayments,
--   legal_disputes
CREATE OR REPLACE FUNCTION public.compute_client_scores(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  inc    numeric := greatest(coalesce((p ->> 'income')::numeric, 0), 0);
  emp    text    := p ->> 'employment_status';
  nw     numeric := coalesce((p ->> 'net_worth')::numeric, 0);
  ta     numeric := coalesce((p ->> 'total_assets')::numeric, 0);
  repay  numeric := greatest(coalesce((p ->> 'monthly_repayment')::numeric, 0), 0);
  rev    numeric := coalesce((p ->> 'annual_revenue')::numeric, 0);
  pep    boolean := coalesce((p ->> 'is_pep')::boolean, false);
  bkr    boolean := coalesce((p ->> 'bankruptcy')::boolean, false);
  blk    boolean := coalesce((p ->> 'blacklisted')::boolean, false);
  mis    boolean := coalesce((p ->> 'missed_repayments')::boolean, false);
  leg    boolean := coalesce((p ->> 'legal_disputes')::boolean, false);
  dti    numeric := CASE WHEN inc = 0 THEN 1 ELSE repay / inc END;
  months numeric;
  h      numeric := 50;
  r      numeric := 30;
  a      numeric := 0;
BEGIN
  -- Health
  h := h + CASE WHEN inc >= 200000 THEN 22 WHEN inc >= 100000 THEN 16
                WHEN inc >= 50000  THEN 10 WHEN inc >= 25000  THEN 5 ELSE 0 END;
  IF inc > 0 THEN
    months := nw / inc;
    h := h + CASE WHEN months >= 36 THEN 15 WHEN months >= 18 THEN 10
                  WHEN months >= 6  THEN 5  ELSE 0 END;
  END IF;
  IF emp IN ('employed', 'self_employed', 'business_owner') THEN h := h + 6; END IF;
  IF emp = 'unemployed' THEN h := h - 15; END IF;
  IF emp = 'student'    THEN h := h - 8;  END IF;
  h := h - CASE WHEN dti > 0.6 THEN 25 WHEN dti > 0.4 THEN 15
                WHEN dti > 0.25 THEN 8 WHEN dti > 0.1 THEN 3 ELSE 0 END;
  IF bkr THEN h := h - 30; END IF;
  IF blk THEN h := h - 25; END IF;
  IF mis THEN h := h - 12; END IF;
  IF leg THEN h := h - 10; END IF;

  -- Risk
  IF bkr THEN r := r + 35; END IF;
  IF blk THEN r := r + 30; END IF;
  IF mis THEN r := r + 18; END IF;
  IF leg THEN r := r + 12; END IF;
  IF pep THEN r := r + 10; END IF;
  r := r + CASE WHEN dti > 0.6 THEN 25 WHEN dti > 0.4 THEN 15 WHEN dti > 0.25 THEN 8 ELSE 0 END;
  IF emp = 'unemployed' THEN r := r + 20; END IF;
  IF emp IN ('freelance', 'student') THEN r := r + 8; END IF;
  r := r + CASE WHEN inc < 15000 THEN 15 WHEN inc < 30000 THEN 5 ELSE 0 END;

  -- Affordability
  IF inc > 0 THEN
    a := round((1 - dti) * 80);
    a := a + CASE WHEN nw > inc * 12 THEN 15 WHEN nw > inc * 6 THEN 8
                  WHEN nw > inc * 3  THEN 3  ELSE 0 END;
    IF inc < 20000 THEN a := a - 10; END IF;
  END IF;

  RETURN jsonb_build_object(
    'health_score',        greatest(0, least(100, round(h)))::int,
    'risk_score',          greatest(0, least(100, round(r)))::int,
    'affordability_score', greatest(0, least(100, round(a)))::int,
    'edd_required',        pep OR inc > 500000 OR ta > 10000000
                           OR (emp = 'business_owner' AND rev > 5000000)
  );
END $$;

REVOKE ALL ON FUNCTION public.compute_client_scores(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_client_scores(jsonb) TO authenticated, service_role;
COMMENT ON FUNCTION public.compute_client_scores(jsonb) IS
  'The one scoring formula. Pure: reads no tables. Stored scores come from trg_dossier_derive; '
  'the onboarding screen calls this for its live preview.';

-- ── 2. Schema changes ────────────────────────────────────────────────────────
ALTER TABLE public.client_dossier
  ADD COLUMN IF NOT EXISTS edd_required boolean NOT NULL DEFAULT false,
  DROP COLUMN IF EXISTS pep_declaration,
  DROP COLUMN IF EXISTS tax_residency,
  DROP COLUMN IF EXISTS source_of_wealth,
  DROP COLUMN IF EXISTS employer_name;

ALTER TABLE public.compliance_details
  DROP COLUMN IF EXISTS has_credit_issues,
  DROP COLUMN IF EXISTS enhanced_due_diligence_required;

DROP TABLE IF EXISTS public.asset_details;

-- Business assets get their own home instead of being folded into other_assets.
-- The totals are generated columns, so they are rebuilt to include it.
ALTER TABLE public.client_financial_snapshot
  DROP COLUMN IF EXISTS net_worth,
  DROP COLUMN IF EXISTS total_assets;
ALTER TABLE public.client_financial_snapshot
  ADD COLUMN IF NOT EXISTS business_assets numeric NOT NULL DEFAULT 0 CHECK (business_assets >= 0);
ALTER TABLE public.client_financial_snapshot
  ADD COLUMN total_assets numeric GENERATED ALWAYS AS (
    cash_savings + fixed_deposits + investments_value + property_value
    + vehicle_value + business_assets + other_assets) STORED,
  ADD COLUMN net_worth numeric GENERATED ALWAYS AS (
    (cash_savings + fixed_deposits + investments_value + property_value
     + vehicle_value + business_assets + other_assets)
    - (mortgage_balance + personal_loan_balance + credit_card_balance
       + vehicle_loan_balance + other_liabilities)) STORED;

-- anon never needs these; RLS stopped it, but the grant was still there.
REVOKE ALL ON public.compliance_details FROM anon;
REVOKE ALL ON public.employment_details FROM anon;

-- ── 3. Derive the dossier's computed columns ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_dossier_derive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_repay numeric; v_loans int;
  v_nw numeric;    v_ta numeric;
  v_pep boolean;   v_bkr boolean; v_blk boolean; v_mis boolean; v_leg boolean;
  v_rev numeric;
  s jsonb;
BEGIN
  SELECT coalesce(sum(monthly_repayment), 0), count(*)
    INTO v_repay, v_loans
    FROM public.client_loan_details WHERE client_id = NEW.client_id;

  SELECT net_worth, total_assets INTO v_nw, v_ta
    FROM public.client_financial_snapshot WHERE client_id = NEW.client_id;

  SELECT is_pep, bankruptcy, blacklisted, missed_repayments, legal_disputes
    INTO v_pep, v_bkr, v_blk, v_mis, v_leg
    FROM public.compliance_details WHERE user_id = NEW.client_id;

  SELECT annual_revenue INTO v_rev
    FROM public.employment_details WHERE user_id = NEW.client_id;

  s := public.compute_client_scores(jsonb_build_object(
    'income',            coalesce(NEW.monthly_income, 0) + coalesce(NEW.additional_income, 0),
    'employment_status', NEW.employment_status,
    'net_worth',         v_nw,
    'total_assets',      v_ta,
    'monthly_repayment', v_repay,
    'annual_revenue',    v_rev,
    'is_pep',            v_pep,
    'bankruptcy',        v_bkr,
    'blacklisted',       v_blk,
    'missed_repayments', v_mis,
    'legal_disputes',    v_leg));

  NEW.health_score        := (s ->> 'health_score')::int;
  NEW.risk_score          := (s ->> 'risk_score')::int;
  NEW.affordability_score := (s ->> 'affordability_score')::int;
  NEW.edd_required        := (s ->> 'edd_required')::boolean;
  NEW.has_existing_loans  := v_loans > 0;
  NEW.total_net_worth     := v_nw;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS dossier_derive ON public.client_dossier;
CREATE TRIGGER dossier_derive
  BEFORE INSERT OR UPDATE ON public.client_dossier
  FOR EACH ROW EXECUTE FUNCTION public.trg_dossier_derive();

-- ── 4. Derive the snapshot's computed columns ────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_snapshot_derive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, finance, pg_temp
AS $$
DECLARE
  v_inc numeric;
BEGIN
  -- Income: home is the dossier. Before a dossier exists, keep what is there
  -- (a payslip attested by the vault before onboarding, for example).
  SELECT coalesce(monthly_income, 0) + coalesce(additional_income, 0) INTO v_inc
    FROM public.client_dossier WHERE client_id = NEW.client_id;
  IF FOUND THEN NEW.monthly_income := v_inc; END IF;

  -- Liabilities: home is the loan list, always.
  SELECT coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'mortgage'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'personal'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'credit_card'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type = 'vehicle'), 0),
         coalesce(sum(outstanding_amount) FILTER (WHERE loan_type NOT IN ('mortgage','personal','credit_card','vehicle')), 0),
         coalesce(sum(monthly_repayment), 0)
    INTO NEW.mortgage_balance, NEW.personal_loan_balance, NEW.credit_card_balance,
         NEW.vehicle_loan_balance, NEW.other_liabilities, NEW.monthly_loan_payments
    FROM public.client_loan_details WHERE client_id = NEW.client_id;

  -- Cash and deposits: once itemised in Accounts, the accounts are the home.
  -- With no accounts the declared figure stands (and is editable again).
  IF EXISTS (SELECT 1 FROM finance.accounts WHERE user_id = NEW.client_id) THEN
    SELECT coalesce(sum(finance.convert_amount(balance, currency, NEW.currency))
                    FILTER (WHERE account_type IN ('savings', 'current')), 0),
           coalesce(sum(finance.convert_amount(balance, currency, NEW.currency))
                    FILTER (WHERE account_type = 'fixed_deposit'), 0)
      INTO NEW.cash_savings, NEW.fixed_deposits
      FROM finance.accounts WHERE user_id = NEW.client_id;
  END IF;

  IF EXISTS (SELECT 1 FROM finance.holdings WHERE user_id = NEW.client_id) THEN
    SELECT coalesce(sum(finance.convert_amount(h.quantity * coalesce(p.price, 0),
                                               coalesce(p.currency, h.currency), NEW.currency)), 0)
      INTO NEW.investments_value
      FROM finance.holdings h
      LEFT JOIN finance.holding_prices p
        ON p.symbol = h.symbol AND p.exchange = coalesce(h.exchange, '')
     WHERE h.user_id = NEW.client_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS snapshot_derive ON public.client_financial_snapshot;
CREATE TRIGGER snapshot_derive
  BEFORE INSERT OR UPDATE ON public.client_financial_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_derive();

-- ── 5. Propagation ───────────────────────────────────────────────────────────
-- "Touch" = an UPDATE that changes nothing but updated_at, so the BEFORE
-- trigger on that row re-derives it.
CREATE OR REPLACE FUNCTION public.touch_client_dossier(p_client uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF pg_trigger_depth() > 8 THEN RETURN; END IF;
  UPDATE public.client_dossier SET updated_at = now() WHERE client_id = p_client;
END $$;

CREATE OR REPLACE FUNCTION public.touch_client_snapshot(p_client uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF pg_trigger_depth() > 8 THEN RETURN; END IF;
  UPDATE public.client_financial_snapshot SET updated_at = now() WHERE client_id = p_client;
END $$;

REVOKE ALL ON FUNCTION public.touch_client_dossier(uuid)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_client_snapshot(uuid) FROM PUBLIC, anon, authenticated;

-- Dossier income changed -> snapshot income.
CREATE OR REPLACE FUNCTION public.trg_dossier_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.monthly_income    IS DISTINCT FROM OLD.monthly_income
     OR NEW.additional_income IS DISTINCT FROM OLD.additional_income THEN
    PERFORM public.touch_client_snapshot(NEW.client_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS dossier_propagate ON public.client_dossier;
CREATE TRIGGER dossier_propagate
  AFTER INSERT OR UPDATE ON public.client_dossier
  FOR EACH ROW EXECUTE FUNCTION public.trg_dossier_propagate();

-- Snapshot wealth changed -> dossier scores.
CREATE OR REPLACE FUNCTION public.trg_snapshot_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.net_worth    IS DISTINCT FROM OLD.net_worth
     OR NEW.total_assets IS DISTINCT FROM OLD.total_assets THEN
    PERFORM public.touch_client_dossier(NEW.client_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS snapshot_propagate ON public.client_financial_snapshot;
CREATE TRIGGER snapshot_propagate
  AFTER INSERT OR UPDATE ON public.client_financial_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_propagate();

-- Loans changed -> snapshot liabilities and dossier scores.
CREATE OR REPLACE FUNCTION public.trg_loans_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_client uuid := coalesce(NEW.client_id, OLD.client_id);
BEGIN
  PERFORM public.touch_client_snapshot(v_client);
  PERFORM public.touch_client_dossier(v_client);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS loans_propagate ON public.client_loan_details;
CREATE TRIGGER loans_propagate
  AFTER INSERT OR UPDATE OR DELETE ON public.client_loan_details
  FOR EACH ROW EXECUTE FUNCTION public.trg_loans_propagate();

-- Compliance or employment changed -> dossier scores.
CREATE OR REPLACE FUNCTION public.trg_user_inputs_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.touch_client_dossier(coalesce(NEW.user_id, OLD.user_id));
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS compliance_propagate ON public.compliance_details;
CREATE TRIGGER compliance_propagate
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_details
  FOR EACH ROW EXECUTE FUNCTION public.trg_user_inputs_propagate();

DROP TRIGGER IF EXISTS employment_propagate ON public.employment_details;
CREATE TRIGGER employment_propagate
  AFTER INSERT OR UPDATE OR DELETE ON public.employment_details
  FOR EACH ROW EXECUTE FUNCTION public.trg_user_inputs_propagate();

REVOKE ALL ON FUNCTION public.trg_dossier_derive()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_snapshot_derive()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_dossier_propagate()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_snapshot_propagate()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_loans_propagate()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_user_inputs_propagate() FROM PUBLIC, anon, authenticated;

-- ── 6. Accounts recompute: derivation now lives in trg_snapshot_derive ───────
-- The old body summed accounts itself and wrote 0 when there were none, which
-- silently wiped the declared savings figure. It now just touches the row and
-- records history from what the trigger derived.
CREATE OR REPLACE FUNCTION finance.recompute_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, finance, pg_temp
AS $$
DECLARE
  s public.client_financial_snapshot%ROWTYPE;
BEGIN
  INSERT INTO public.client_financial_snapshot (client_id)
  VALUES (p_user_id)
  ON CONFLICT (client_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO s;

  INSERT INTO finance.net_worth_history
    (user_id, snapshot_date, cash_savings, fixed_deposits, investments_value,
     total_assets, total_liabilities, net_worth, currency)
  VALUES
    (p_user_id, current_date, s.cash_savings, s.fixed_deposits, s.investments_value,
     s.total_assets, s.total_liabilities, s.net_worth, s.currency)
  ON CONFLICT (user_id, snapshot_date) DO UPDATE
    SET cash_savings      = excluded.cash_savings,
        fixed_deposits    = excluded.fixed_deposits,
        investments_value = excluded.investments_value,
        total_assets      = excluded.total_assets,
        total_liabilities = excluded.total_liabilities,
        net_worth         = excluded.net_worth,
        currency          = excluded.currency,
        captured_at       = now();
END $$;

-- ── 7. Profile view: compliance facts from their home ────────────────────────
CREATE VIEW public.client_profile_view WITH (security_invoker = on) AS
SELECT c.id AS user_id,
       c.email, c.full_name, c.first_name, c.last_name, c.kyc_status, c.date_of_birth,
       c.address_line_1, c.city, c.country, c.user_type,
       c.kyc_status = 'verified'::kyc_status AS kyc_verified,
       c.kyc_status = 'verified'::kyc_status AS proof_of_address_done,
       d.employment_status,
       d.monthly_income,
       d.total_net_worth,
       d.has_existing_loans,
       coalesce(cd.is_pep, false) AS is_pep,
       cd.tax_residency,
       cd.source_of_wealth,
       d.health_score,
       d.risk_score,
       d.affordability_score,
       d.id IS NOT NULL AS financial_profile_done,
       cd.source_of_wealth IS NOT NULL AS source_of_wealth_done,
       coalesce(d.edd_required, false) AS enhanced_due_diligence_required,
       CASE
         WHEN c.kyc_status = 'verified'::kyc_status AND d.id IS NOT NULL THEN 100
         WHEN c.kyc_status = 'verified'::kyc_status THEN 60
         WHEN c.kyc_status = 'pending'::kyc_status  THEN 20
         ELSE 10
       END AS completion_percent,
       s.total_assets, s.total_liabilities, s.net_worth AS snapshot_net_worth,
       s.cash_savings, s.fixed_deposits, s.investments_value, s.property_value,
       s.vehicle_value, s.other_assets, s.mortgage_balance, s.personal_loan_balance,
       s.credit_card_balance, s.vehicle_loan_balance, s.other_liabilities,
       s.monthly_expenses, s.monthly_loan_payments, s.monthly_savings,
       s.debt_to_income_ratio,
       s.business_assets
  FROM public.clients c
  LEFT JOIN public.client_dossier d      ON d.client_id = c.id
  LEFT JOIN public.compliance_details cd ON cd.user_id  = c.id
  LEFT JOIN public.client_financial_snapshot s ON s.client_id = c.id
 WHERE c.id = auth.uid();

REVOKE ALL ON public.client_profile_view FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.client_profile_view TO authenticated;

COMMIT;
