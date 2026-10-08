-- =============================================================================
-- FICO advisor — persistent chat history
-- APP DB (wixfhjlsjkiwfvqewvmt)
--
-- One row per message. Owner-only RLS: a user can read, append and delete
-- their own history; nobody can edit a stored message. Written directly from
-- the browser (RLS-scoped), so no serverless function is involved.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.advisor_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid()
                         REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advisor_messages_user_created_idx
  ON public.advisor_messages (user_id, created_at DESC);

ALTER TABLE public.advisor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_messages_select_own ON public.advisor_messages;
CREATE POLICY advisor_messages_select_own ON public.advisor_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS advisor_messages_insert_own ON public.advisor_messages;
CREATE POLICY advisor_messages_insert_own ON public.advisor_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS advisor_messages_delete_own ON public.advisor_messages;
CREATE POLICY advisor_messages_delete_own ON public.advisor_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS alone is not enough: the role also needs table privileges.
REVOKE ALL ON public.advisor_messages FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.advisor_messages TO authenticated;
