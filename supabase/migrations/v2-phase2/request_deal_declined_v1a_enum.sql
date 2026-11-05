-- App DB (wixfhjlsjkiwfvqewvmt). Part 1 of 2: a new value can't be used in the transaction that adds it.
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'deal_declined';
