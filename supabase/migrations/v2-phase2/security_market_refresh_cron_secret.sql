-- Applied to the App DB 2026-10-24 (Supabase migration "security_market_refresh_cron_secret").
-- market-refresh was publicly invokable (verify_jwt=false, no check): anyone could
-- burn Anthropic credit and scrape BOM/SEM from our IPs. The cron job now sends a
-- secret held only in Vault; the function verifies it via a service_role-only
-- definer function. Verified: no/wrong secret -> 401, cron call -> 200.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'market_refresh_cron_secret',
                           'Shared secret: pg_cron -> market-refresh edge function')
 where not exists (select 1 from vault.secrets where name = 'market_refresh_cron_secret');

create or replace function public.verify_market_refresh_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_secret is not null and length(p_secret) = 64 and exists (
    select 1 from vault.decrypted_secrets
     where name = 'market_refresh_cron_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.verify_market_refresh_secret(text) from public, anon, authenticated;
grant execute on function public.verify_market_refresh_secret(text) to service_role;

select cron.alter_job(
  job_id  := (select jobid from cron.job where jobname = 'market-refresh-4h'),
  command := $cmd$
  SELECT net.http_post(
    url     := 'https://wixfhjlsjkiwfvqewvmt.supabase.co/functions/v1/market-refresh',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                         where name = 'market_refresh_cron_secret')),
    timeout_milliseconds := 60000
  ) AS request_id;
  $cmd$);
