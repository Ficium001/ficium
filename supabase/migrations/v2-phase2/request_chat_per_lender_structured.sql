-- =============================================================================
-- Per-lender, structured request chat
-- Target: App DB (wixfhjlsjkiwfvqewvmt)
--
-- WHY
-- ---
-- public.request_messages was keyed on request_id ALONE. One request therefore
-- meant one shared thread across every institution bidding on it: if MCB and
-- Absa both bid, each would read the other's messages — competitor pricing,
-- objections, everything. Nothing has leaked yet only because the portal side
-- of chat is still an unbuilt stub and the existing RLS policies are
-- client-only, so institutions have had no read path at all. This migration
-- lands the scoping BEFORE that stub is wired.
--
-- Two things this enforces:
--
--   1. Thread scoping — a message belongs to (request_id, institution_id).
--      Keyed on institution rather than bid on purpose: a bank can withdraw
--      and resubmit, or revise a bid, and the conversation should survive that.
--
--   2. Anonymity — the marketplace is anonymised until the Phase 2 reveal at
--      acceptance. Free text is an identity-leak channel (a borrower can
--      volunteer "I already bank with you, account 1234"), so before
--      acceptance BOTH sides are restricted to a fixed template catalogue with
--      typed parameters. Free text unlocks only for the winning lender, after
--      acceptance, once identity is already revealed.
--
-- Losing threads are frozen, not deleted: writes stop, history stays readable.
-- For an FSC/BOM-regulated go-live, "what was said to the bank that lost" is
-- exactly the record wanted in a dispute.
--
-- Idempotent. Apply via the Supabase SQL editor.
-- =============================================================================

BEGIN;

-- ── 1. Template catalogue ───────────────────────────────────────────────────
-- The set of things either side may say before acceptance. Seeded below and
-- extensible without a schema change.

CREATE TABLE IF NOT EXISTS public.request_message_template (
  code          text PRIMARY KEY,
  sender_type   text        NOT NULL CHECK (sender_type IN ('client', 'institution')),
  label         text        NOT NULL,   -- shown in the picker
  body_template text        NOT NULL,   -- rendered text; {param} placeholders
  -- JSON-schema-ish description of allowed params, e.g.
  --   {"days": {"type": "int", "min": 1, "max": 365}}
  -- Empty object means the template takes no parameters.
  params_schema jsonb       NOT NULL DEFAULT '{}'::jsonb,
  sort_order    smallint    NOT NULL DEFAULT 100,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.request_message_template IS
  'Allowed pre-acceptance messages. Both sides are template-only until a bid is accepted, so neither party can volunteer or solicit identifying detail while the marketplace is still anonymous.';

-- ── 2. Scope + structure columns on request_messages ────────────────────────

ALTER TABLE public.request_messages
  -- Which lender this message is with. NULL only on pre-migration rows.
  ADD COLUMN IF NOT EXISTS institution_id uuid,
  ADD COLUMN IF NOT EXISTS kind           text NOT NULL DEFAULT 'structured',
  ADD COLUMN IF NOT EXISTS template_code  text,
  ADD COLUMN IF NOT EXISTS params         jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.request_messages.institution_id IS
  'The lender this thread is with. One thread per (request_id, institution_id) — NOT per bid, so a withdrawn/resubmitted bid does not fork or lose the conversation.';
COMMENT ON COLUMN public.request_messages.kind IS
  'structured = template-driven (pre-acceptance, both sides). free = free text, permitted only for the winning lender after acceptance.';

-- Pre-migration rows predate scoping (a single test row at time of writing).
-- Leave institution_id NULL and let every institution-side policy below
-- require a non-NULL match, so legacy rows are invisible to institutions
-- rather than broadcast to all of them.
--
-- This MUST run before the CHECK constraints below: `kind` is added with a
-- 'structured' default, so every pre-existing row lands as structured with a
-- NULL template_code and would fail request_messages_template_chk on creation.
UPDATE public.request_messages
   SET kind = 'free'
 WHERE template_code IS NULL
   AND kind <> 'free';

DO $$
BEGIN
  -- kind is a closed set
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_messages_kind_chk'
  ) THEN
    ALTER TABLE public.request_messages
      ADD CONSTRAINT request_messages_kind_chk
      CHECK (kind IN ('structured', 'free'));
  END IF;

  -- A structured message must name its template; a free one must not.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_messages_template_chk'
  ) THEN
    ALTER TABLE public.request_messages
      ADD CONSTRAINT request_messages_template_chk
      CHECK (
        (kind = 'structured' AND template_code IS NOT NULL)
        OR
        (kind = 'free'       AND template_code IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_messages_template_fk'
  ) THEN
    ALTER TABLE public.request_messages
      ADD CONSTRAINT request_messages_template_fk
      FOREIGN KEY (template_code) REFERENCES public.request_message_template(code);
  END IF;
END $$;


-- Thread reads are always (request, institution) ordered by time.
CREATE INDEX IF NOT EXISTS request_messages_thread_idx
  ON public.request_messages (request_id, institution_id, created_at);

-- ── 3. Seed the catalogue ───────────────────────────────────────────────────
-- Borrower asks; institution answers with typed values. Nothing here can carry
-- a name, account number, employer or address.

INSERT INTO public.request_message_template
  (code, sender_type, label, body_template, params_schema, sort_order)
VALUES
  -- Borrower → lender
  ('q.docs_required',    'client', 'What documents will you need?',
   'What documents will you need from me?', '{}'::jsonb, 10),
  ('q.processing_time',  'client', 'How long does approval take?',
   'How long does approval take?', '{}'::jsonb, 20),
  ('q.rate_negotiable',  'client', 'Is this rate negotiable?',
   'Is the offered rate negotiable?', '{}'::jsonb, 30),
  ('q.early_repayment',  'client', 'Any early repayment penalty?',
   'Is there a penalty for early repayment?', '{}'::jsonb, 40),
  ('q.fees_breakdown',   'client', 'Can you break down the fees?',
   'Can you break down the fees on this offer?', '{}'::jsonb, 50),
  ('q.disbursement',     'client', 'How soon are funds disbursed?',
   'How soon would funds be disbursed after approval?', '{}'::jsonb, 60),
  ('q.insurance',        'client', 'Is insurance required?',
   'Is insurance required for this facility?', '{}'::jsonb, 70),
  ('q.conditions',       'client', 'Can you clarify the conditions?',
   'Can you clarify the conditions attached to this offer?', '{}'::jsonb, 80),

  -- Lender → borrower
  ('a.docs_list',        'institution', 'List required documents',
   'We will need the following: {documents}.',
   '{"documents": {"type": "string_list", "max_items": 12, "max_len": 60}}'::jsonb, 10),
  ('a.processing_days',  'institution', 'State processing time',
   'Approval typically takes {days} business days.',
   '{"days": {"type": "int", "min": 1, "max": 365}}'::jsonb, 20),
  ('a.rate_final',       'institution', 'Rate is final',
   'The offered rate is final.', '{}'::jsonb, 30),
  ('a.rate_negotiable',  'institution', 'Rate may improve',
   'The rate may be improved subject to review.', '{}'::jsonb, 31),
  ('a.early_rep_none',   'institution', 'No early repayment penalty',
   'There is no penalty for early repayment.', '{}'::jsonb, 40),
  ('a.early_rep_fee',    'institution', 'Early repayment fee applies',
   'Early repayment carries a fee of {percent}% of the outstanding balance.',
   '{"percent": {"type": "decimal", "min": 0, "max": 100}}'::jsonb, 41),
  ('a.fees_breakdown',   'institution', 'Break down the fees',
   'Fee breakdown: {fees}.',
   '{"fees": {"type": "label_amount_list", "max_items": 12}}'::jsonb, 50),
  ('a.disbursement_days','institution', 'State disbursement time',
   'Funds are disbursed within {days} business days of approval.',
   '{"days": {"type": "int", "min": 1, "max": 365}}'::jsonb, 60),
  ('a.insurance_yes',    'institution', 'Insurance required',
   'Insurance is required for this facility.', '{}'::jsonb, 70),
  ('a.insurance_no',     'institution', 'Insurance not required',
   'Insurance is not required for this facility.', '{}'::jsonb, 71),
  ('a.conditions_note',  'institution', 'Clarify a condition',
   'Clarification on conditions: {note}.',
   '{"note": {"type": "enum", "values": ["salary_domiciliation", "guarantor_required", "collateral_valuation", "min_tenure", "employment_confirmation"]}}'::jsonb, 80)
ON CONFLICT (code) DO UPDATE
  SET label         = EXCLUDED.label,
      body_template = EXCLUDED.body_template,
      params_schema = EXCLUDED.params_schema,
      sort_order    = EXCLUDED.sort_order,
      is_active     = true;

-- ── 4. Acceptance state helper ──────────────────────────────────────────────
-- Free text is allowed only once the borrower has accepted this institution's
-- bid — at that point identity is already revealed, so there is nothing left
-- to protect. Returns false for every other institution on the same request,
-- which is what freezes the losing threads.

CREATE OR REPLACE FUNCTION public.request_chat_is_winner(p_request_id uuid, p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.bid_acceptances ba
     WHERE ba.request_id     = p_request_id
       AND ba.institution_id = p_institution_id
  );
$$;

CREATE OR REPLACE FUNCTION public.request_chat_is_open(p_request_id uuid, p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Before any acceptance every bidder's thread is open (structured only).
    NOT EXISTS (SELECT 1 FROM public.bid_acceptances ba WHERE ba.request_id = p_request_id)
    -- After acceptance only the winner's thread stays writable.
    OR public.request_chat_is_winner(p_request_id, p_institution_id);
$$;

COMMENT ON FUNCTION public.request_chat_is_open(uuid, uuid) IS
  'Whether new messages may be written on this thread. Losing threads become read-only at acceptance rather than being deleted, so the record survives for dispute/audit.';

-- ── 5. Write-time enforcement ───────────────────────────────────────────────
-- Kept in a trigger, not only in RLS, so the rules hold for service-role
-- writers too (the portal API reaches this DB with a service session).

CREATE OR REPLACE FUNCTION public.request_messages_enforce()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl public.request_message_template%ROWTYPE;
BEGIN
  IF NEW.institution_id IS NULL THEN
    RAISE EXCEPTION 'request_messages.institution_id is required — chat is scoped per lender';
  END IF;

  IF NOT public.request_chat_is_open(NEW.request_id, NEW.institution_id) THEN
    RAISE EXCEPTION 'This conversation is closed: another lender''s offer was accepted';
  END IF;

  IF NEW.kind = 'free' THEN
    -- Free text only after this institution has actually won.
    IF NOT public.request_chat_is_winner(NEW.request_id, NEW.institution_id) THEN
      RAISE EXCEPTION 'Free-text messages are only available after this lender''s offer is accepted; use a structured message';
    END IF;
  ELSE
    SELECT * INTO v_tpl
      FROM public.request_message_template
     WHERE code = NEW.template_code AND is_active;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown or inactive message template: %', NEW.template_code;
    END IF;

    -- A borrower cannot send a lender's template, or vice versa.
    IF v_tpl.sender_type <> NEW.sender_type THEN
      RAISE EXCEPTION 'Template % is not available to sender_type %', NEW.template_code, NEW.sender_type;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS request_messages_enforce_trg ON public.request_messages;
CREATE TRIGGER request_messages_enforce_trg
  BEFORE INSERT OR UPDATE ON public.request_messages
  FOR EACH ROW EXECUTE FUNCTION public.request_messages_enforce();

-- ── 6. RLS ──────────────────────────────────────────────────────────────────
-- The pre-existing client policies were ALL-command and unscoped by
-- institution, and client_own_messages/client_rw overlapped. Replace both with
-- an explicit read/write pair.

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_own_messages ON public.request_messages;
DROP POLICY IF EXISTS client_rw           ON public.request_messages;

-- Borrower reads every thread on their own request (all lenders).
CREATE POLICY request_messages_client_read
  ON public.request_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
       WHERE r.id = request_messages.request_id
         AND r.client_id = auth.uid()
    )
  );

-- Borrower writes only as themselves, only on their own request, and only on
-- a thread that is still open.
CREATE POLICY request_messages_client_write
  ON public.request_messages FOR INSERT
  WITH CHECK (
    sender_type = 'client'
    AND sender_id = auth.uid()
    AND institution_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.requests r
       WHERE r.id = request_messages.request_id
         AND r.client_id = auth.uid()
    )
    AND public.request_chat_is_open(request_id, institution_id)
  );

-- No UPDATE/DELETE policy for anyone: the thread is an append-only record.

ALTER TABLE public.request_message_template ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS request_message_template_read ON public.request_message_template;
CREATE POLICY request_message_template_read
  ON public.request_message_template FOR SELECT
  USING (is_active);

GRANT SELECT ON public.request_message_template TO authenticated;
GRANT SELECT, INSERT ON public.request_messages TO authenticated;

COMMIT;

-- =============================================================================
-- Verification — expect zero rows from each.
-- =============================================================================
-- Any message not scoped to a lender (pre-migration rows excepted):
--   SELECT id FROM public.request_messages
--    WHERE institution_id IS NULL AND created_at > now() - interval '1 minute';
--
-- Any structured message whose template does not match its sender:
--   SELECT m.id FROM public.request_messages m
--     JOIN public.request_message_template t ON t.code = m.template_code
--    WHERE m.kind = 'structured' AND t.sender_type <> m.sender_type;
--
-- Any free-text message on a thread that never won:
--   SELECT m.id FROM public.request_messages m
--    WHERE m.kind = 'free'
--      AND NOT public.request_chat_is_winner(m.request_id, m.institution_id);
