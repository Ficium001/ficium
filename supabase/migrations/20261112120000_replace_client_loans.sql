-- Atomic replace of the signed-in client's existing-loan list — App DB.
--
-- Why: the onboarding save did DELETE then INSERT as two separate API calls,
-- with the delete result unchecked. If the insert failed (validation, network,
-- RLS), the client was left with NO loans, and every DSR / health score after
-- that was computed on an empty set. A function body runs in one transaction,
-- so either the whole new list is stored or the old list is untouched.
--
-- SECURITY INVOKER on purpose: the caller's own RLS policies and table grants
-- still apply, exactly as they did for the two direct calls this replaces.
-- The client is always auth.uid() — it is never taken from the arguments.
--
-- Rollback: DROP FUNCTION public.replace_client_loans(jsonb);
--           (the app then needs the previous delete+insert code).

CREATE OR REPLACE FUNCTION public.replace_client_loans(p_loans jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_loans IS NULL OR jsonb_typeof(p_loans) <> 'array' THEN
    RAISE EXCEPTION 'p_loans must be a JSON array' USING ERRCODE = '22023';
  END IF;

  -- A person does not have more than a few dozen loans; this only stops abuse.
  IF jsonb_array_length(p_loans) > 50 THEN
    RAISE EXCEPTION 'too many loans (max 50)' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.client_loan_details WHERE client_id = v_uid;

  INSERT INTO public.client_loan_details
    (client_id, loan_type, outstanding_amount, monthly_repayment, bank_name, remaining_months)
  SELECT v_uid,
         x ->> 'loan_type',
         (x ->> 'outstanding_amount')::numeric,
         (x ->> 'monthly_repayment')::numeric,
         x ->> 'bank_name',
         (x ->> 'remaining_months')::integer
  FROM jsonb_array_elements(p_loans) AS x;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_client_loans(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_client_loans(jsonb) TO authenticated;
