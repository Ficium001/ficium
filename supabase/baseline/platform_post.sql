-- Ficium App DB baseline. GENERATED: do not edit by hand.
-- Through 20261125100000_audit_logs_append_only. Regenerate with the schema-baseline workflow on a
-- schema-baseline/* branch; see supabase/baseline/README.md.

-- Storage buckets

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('documents', 'documents', 'f', 52428800, '{image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'::text[]) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('kyc-documents', 'kyc-documents', 'f', 5242880, '{image/jpeg,image/png,application/pdf}'::text[]) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies on Supabase-managed tables (storage, auth)

CREATE POLICY "Users read own KYC docs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'kyc-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Users upload own KYC docs" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'kyc-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY documents_storage_policy ON storage.objects AS PERMISSIVE FOR ALL TO public USING (((bucket_id = 'documents'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

-- Triggers on Supabase-managed tables that call Ficium functions

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cron jobs (commands read their secrets from Vault by name)

SELECT cron.schedule('admin-outbox-sweep', '7 * * * *', 'SELECT admin.trigger_outbox_dispatch()');
SELECT cron.schedule('api-traffic-purge', '37 2 * * *', 'DELETE FROM admin.api_traffic_hour WHERE hour < now() - interval ''35 days''');
SELECT cron.schedule('app-error-report-purge', '23 2 * * *', 'DELETE FROM public.app_error_report WHERE day < (now() AT TIME ZONE ''utc'')::date - 35');
SELECT cron.schedule('bom-fx-weekdays', '20 5,8,11,14 * * 1-5', '
  SELECT net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = ''functions_base_url'')
               || ''/bom-fx'',
    body    := ''{}''::jsonb,
    headers := jsonb_build_object(
      ''Content-Type'', ''application/json'',
      ''x-cron-secret'', (select decrypted_secret from vault.decrypted_secrets
                         where name = ''market_refresh_cron_secret'')),
    timeout_milliseconds := 60000
  ) AS request_id;
');
SELECT cron.schedule('expire-overdue-requests', '5 * * * *', 'select public.expire_overdue_requests();');
SELECT cron.schedule('expire-request-invitations', '*/15 * * * *', 'update public.request_invitation set status=''expired'', updated_at=now() where status=''pending'' and expires_at < now();');
SELECT cron.schedule('integration-dispatch', '* * * * *', 'SELECT integration.trigger_dispatch()');
SELECT cron.schedule('market-refresh-4h', '0 */4 * * *', '
  SELECT net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = ''functions_base_url'')
               || ''/market-refresh'',
    body    := ''{}''::jsonb,
    headers := jsonb_build_object(
      ''Content-Type'', ''application/json'',
      ''x-cron-secret'', (select decrypted_secret from vault.decrypted_secrets
                         where name = ''market_refresh_cron_secret'')),
    timeout_milliseconds := 60000
  ) AS request_id;
');
SELECT cron.schedule('notify-expiring-requests', '0 * * * *', ' SELECT public.notify_expiring_requests(); ');

-- Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;

-- Vault secrets this database needs (names only; values come from Doppler): admin_outbox_cron_secret, admin_outbox_dispatch_url, app_service_secret, borrower_anon_key, functions_base_url, integration_cron_secret, integration_dispatch_url, market_refresh_cron_secret
