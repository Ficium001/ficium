-- KYC outcomes are set by the server only (2026-10-30).
--
-- Before: the browser wrote kyc_submissions (status, risk score, flags) and
-- clients.kyc_status itself, under policies that allowed it. A borrower could
-- mark themselves verified with one API call and appear KYC-verified to banks.
-- Now api/_kyc/verify.ts records the outcome with the service role for the
-- signed-in user; borrowers can read their submissions but write neither.
--
-- Apply AFTER the app version that records server-side is deployed.

DROP POLICY IF EXISTS "kyc: users can insert own submissions" ON public.kyc_submissions;

CREATE OR REPLACE FUNCTION public.guard_client_kyc_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- current_user is the API role of the caller: 'authenticated'/'anon' for a
  -- browser, 'service_role' for the server, the owner for definer triggers.
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.kyc_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'kyc_status is set by verification only' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
      RAISE EXCEPTION 'kyc_status is set by verification only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS clients_guard_kyc_status ON public.clients;
CREATE TRIGGER clients_guard_kyc_status
  BEFORE INSERT OR UPDATE OF kyc_status ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_kyc_status();
