-- Per-user daily cap on paid AI calls (the coach in /api/chat and market Q&A in /api/market).
-- Before this, any signed-in account could call Claude without limit and run up the bill.
--
-- One row per (client, Mauritius day, kind). consume_ai_quota() increments and checks in ONE
-- statement, so concurrent calls cannot overshoot. Only the server (service_role) may call it;
-- the browser cannot read or reset its own counter.

CREATE TABLE IF NOT EXISTS public.ai_usage (
  client_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_day date        NOT NULL,
  kind      text        NOT NULL CHECK (kind IN ('chat', 'market')),
  calls     integer     NOT NULL DEFAULT 0 CHECK (calls >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, usage_day, kind)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_client_id uuid, p_kind text, p_daily_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'Indian/Mauritius')::date;
  v_calls integer;
BEGIN
  IF p_client_id IS NULL OR p_kind NOT IN ('chat', 'market') OR p_daily_limit IS NULL OR p_daily_limit < 1 THEN
    RAISE EXCEPTION 'consume_ai_quota: bad arguments';
  END IF;

  INSERT INTO public.ai_usage AS u (client_id, usage_day, kind, calls)
  VALUES (p_client_id, v_day, p_kind, 1)
  ON CONFLICT (client_id, usage_day, kind)
    DO UPDATE SET calls = u.calls + 1, updated_at = now()
    WHERE u.calls < p_daily_limit
  RETURNING calls INTO v_calls;

  IF v_calls IS NULL THEN  -- the conflict row was already at the limit: nothing was updated
    RETURN jsonb_build_object('allowed', false, 'limit', p_daily_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_calls, 'limit', p_daily_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer) TO service_role;
