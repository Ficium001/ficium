-- =============================================================================
-- Notifications — consumer in-app alerts (APP DB)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  title      text NOT NULL,
  body       text,
  link       text,
  metadata   jsonb DEFAULT '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_owner  ON public.notifications
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY notifications_service ON public.notifications
  FOR ALL USING (auth.role() = 'service_role');

-- kind column must be text (not enum) for forward-compatible new kinds
ALTER TABLE public.notifications ALTER COLUMN kind TYPE text USING kind::text;
