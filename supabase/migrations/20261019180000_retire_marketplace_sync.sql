-- 20261019180000_retire_marketplace_sync.sql  (App DB)
-- Contract 1.10.0 (portal-api #90) removed the last direct link between the
-- borrower and institution sides; this removes what the old pull-sync left
-- behind on the App DB:
--   * marketplace_sync.* (dispatch, on_request_change, health, recent_calls):
--     no triggers, no cron, still holding a route + secret to portal-api.
--   * vault secret portal_api_url.
-- Hidden dependency fixed first: notify_expiring_requests() and
-- vault_extract.dispatch() read portal_api_url ONLY as a "configured?" guard
-- and posted to a hard-coded borrower URL. Deleting the secret would have
-- silently stopped expiry reminders and KYC document extraction. Both now
-- read the borrower endpoint from integration_dispatch_url (same value),
-- so the address is configuration, not code (lift-and-shift).

begin;

create or replace function public.notify_expiring_requests()
 returns void language plpgsql security definer
 set search_path to 'public', 'vault' as
$function$
declare
  v_url    text;
  v_secret text;
  v_row    record;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'integration_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'app_service_secret';
  if v_url is null or v_secret is null then
    raise warning 'notify_expiring_requests: integration_dispatch_url or app_service_secret missing; nothing sent';
    return;
  end if;

  -- Requests with decision_deadline 23-25h out (hourly job fires once each)
  for v_row in
    select r.id, r.client_id, r.product_type, r.decision_deadline, r.amount
      from public.requests r
     where r.status = 'open'
       and r.decision_deadline between now() + interval '23 hours'
                                   and now() + interval '25 hours'
       and not exists (
         select 1 from public.notifications n
          where n.user_id = r.client_id
            and n.kind    = 'request_expiring'
            and n.metadata->>'request_id' = r.id::text)
  loop
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'X-Service-Secret', v_secret),
      body    := jsonb_build_object(
        'action', 'request-expiring', 'request_id', v_row.id, 'client_id', v_row.client_id,
        'product_type', v_row.product_type, 'amount', v_row.amount, 'deadline', v_row.decision_deadline),
      timeout_milliseconds := 10000);
  end loop;
end; $function$;

create or replace function vault_extract.dispatch(p_document_id uuid)
 returns void language plpgsql security definer
 set search_path to 'vault_extract', 'public', 'extensions', 'vault' as
$function$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'integration_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'app_service_secret';
  if v_url is null or v_secret is null then
    raise warning 'vault_extract.dispatch: integration_dispatch_url or app_service_secret missing; skipping';
    return;
  end if;

  update public.client_vault_document
     set extract_status = 'processing', updated_at = now()
   where id = p_document_id;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Service-Secret', v_secret),
    body    := jsonb_build_object('action', 'vault-extract', 'document_id', p_document_id),
    timeout_milliseconds := 25000);
end; $function$;

-- Retire marketplace_sync explicitly (RESTRICT: anything unexpected fails loudly).
drop view if exists marketplace_sync.recent_calls;
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'marketplace_sync' loop
    execute format('drop function %s', f);
  end loop;
end $$;
drop schema if exists marketplace_sync restrict;

delete from vault.secrets where name = 'portal_api_url';

do $verify$
begin
  if exists (select 1 from pg_proc where prosrc ilike '%portal_api_url%') then
    raise exception 'a function still references portal_api_url';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'marketplace_sync') then
    raise exception 'marketplace_sync still exists';
  end if;
  if (select count(*) from pg_proc where prosrc ilike '%''integration_dispatch_url''%') < 3 then
    raise exception 'expected trigger_dispatch, notify_expiring_requests and vault_extract.dispatch on integration_dispatch_url';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'integration_dispatch_url') then
    raise exception 'integration_dispatch_url missing: reminders and KYC extraction would stop';
  end if;
end
$verify$;

commit;
