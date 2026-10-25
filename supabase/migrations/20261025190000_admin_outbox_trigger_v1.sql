-- APPLIED to the App DB (wixfhjlsjkiwfvqewvmt) on 2026-10-25 as migration admin_outbox_trigger_v1.
-- Free scheduler for ficium-admin's outbox dispatcher (Vercel Hobby allows daily crons only;
-- GitHub Actions minutes are too scarce). Hourly on purpose: each call wakes the Neon admin DB.
-- No-op until both Vault entries exist; the secret is added by hand:
--   select vault.create_secret('<CRON_SECRET>', 'admin_outbox_cron_secret');

CREATE OR REPLACE FUNCTION admin.trigger_outbox_dispatch() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_url text; v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'admin_outbox_dispatch_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'admin_outbox_cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RETURN; END IF;
  PERFORM net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000);
END $$;
REVOKE ALL ON FUNCTION admin.trigger_outbox_dispatch() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'admin_outbox_dispatch_url') THEN
    PERFORM vault.create_secret('https://ficium-admin.vercel.app/api/outbox-dispatch', 'admin_outbox_dispatch_url',
                                'ficium-admin outbox dispatcher endpoint');
  END IF;
END $$;

SELECT cron.schedule('admin-outbox-sweep', '7 * * * *', 'SELECT admin.trigger_outbox_dispatch()');
