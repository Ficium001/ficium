-- Migration: joint_finance_invitation
-- Target: App DB (wixfhjlsjkiwfvqewvmt) — borrower marketplace
-- Applied 2026-07-03. Adds the joint request participation + invitation layer.

-- ── Enums ────────────────────────────────────────────────────────────────
do $$ begin create type public.participant_role as enum ('primary','co_applicant','guarantor'); exception when duplicate_object then null; end $$;
do $$ begin create type public.liability_type as enum ('joint_and_several','several','guarantor'); exception when duplicate_object then null; end $$;
do $$ begin create type public.consent_state as enum ('invited','consented','declined','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invitation_status as enum ('pending','accepted','declined','expired','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invitation_channel as enum ('email','sms'); exception when duplicate_object then null; end $$;
alter type public.request_status add value if not exists 'awaiting_consent';

-- ── Participation layer ──────────────────────────────────────────────────
create table if not exists public.request_participant (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  role public.participant_role not null default 'co_applicant',
  liability_type public.liability_type,
  ownership_bps integer check (ownership_bps between 0 and 10000),
  consent_state public.consent_state not null default 'invited',
  is_initiator boolean not null default false,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, client_id)
);

-- ── Invitation record ────────────────────────────────────────────────────
create table if not exists public.request_invitation (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  inviter_client_id uuid not null references public.clients(id),
  invited_email text not null,
  invited_phone text,
  channel public.invitation_channel not null default 'email',
  invited_client_id uuid references public.clients(id),
  proposed_role public.participant_role not null default 'co_applicant',
  proposed_liability public.liability_type,
  proposed_ownership_bps integer check (proposed_ownership_bps between 0 and 10000),
  token_hash bytea not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_invite check (invited_client_id is null or invited_client_id <> inviter_client_id)
);

create unique index if not exists request_invitation_active_uniq
  on public.request_invitation (request_id, invited_email) where status = 'pending';
create index if not exists request_invitation_token_idx on public.request_invitation (token_hash);
create index if not exists request_invitation_request_idx on public.request_invitation (request_id);

-- ── SECURITY DEFINER helpers (avoid recursive RLS) ───────────────────────
create or replace function public.is_request_participant(p_request_id uuid, p_client_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.request_participant where request_id = p_request_id and client_id = p_client_id);
$$;

create or replace function public.current_client_email()
returns text language sql security definer stable set search_path = public as $$
  select email from public.clients where id = auth.uid();
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.request_participant enable row level security;
alter table public.request_participant force row level security;
alter table public.request_invitation enable row level security;
alter table public.request_invitation force row level security;

drop policy if exists request_participant_select on public.request_participant;
create policy request_participant_select on public.request_participant
  for select using (public.is_request_participant(request_id, auth.uid()));

drop policy if exists request_invitation_select on public.request_invitation;
create policy request_invitation_select on public.request_invitation
  for select using (
    inviter_client_id = auth.uid()
    or invited_client_id = auth.uid()
    or public.is_request_participant(request_id, auth.uid())
    or lower(invited_email) = lower(coalesce(public.current_client_email(), ''))
  );

-- ── Lifecycle functions (create / accept / decline / revoke) ─────────────
create or replace function public.create_request_invitation(
  p_request_id uuid, p_inviter_client_id uuid, p_invited_email text, p_token_hash bytea,
  p_invited_phone text default null, p_channel public.invitation_channel default 'email',
  p_proposed_role public.participant_role default 'co_applicant',
  p_proposed_liability public.liability_type default null,
  p_proposed_ownership_bps integer default null, p_ttl_days integer default 7
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_invited_email)); v_match uuid; v_id uuid;
begin
  if v_email is null or v_email = '' then raise exception 'invited_email_required'; end if;
  select id into v_match from public.clients where lower(email) = v_email limit 1;
  if v_match is not null and v_match = p_inviter_client_id then raise exception 'cannot_invite_self'; end if;
  update public.request_invitation set status='revoked', revoked_at=now(), updated_at=now()
    where request_id = p_request_id and invited_email = v_email and status = 'pending';
  insert into public.request_invitation (
    request_id, inviter_client_id, invited_email, invited_phone, channel,
    invited_client_id, proposed_role, proposed_liability, proposed_ownership_bps, token_hash, expires_at
  ) values (
    p_request_id, p_inviter_client_id, v_email, p_invited_phone, p_channel,
    v_match, p_proposed_role, p_proposed_liability, p_proposed_ownership_bps,
    p_token_hash, now() + make_interval(days => p_ttl_days)
  ) returning id into v_id;
  return v_id;
end $$;

create or replace function public.accept_request_invitation(p_token_hash bytea, p_client_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv public.request_invitation; v_kyc public.kyc_status; v_participant_id uuid;
begin
  select * into v_inv from public.request_invitation where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_inv.expires_at < now() then
    update public.request_invitation set status='expired', updated_at=now() where id=v_inv.id;
    raise exception 'invitation_expired';
  end if;
  select kyc_status into v_kyc from public.clients where id = p_client_id;
  if v_kyc is distinct from 'verified'::public.kyc_status then raise exception 'kyc_required'; end if;
  insert into public.request_participant
    (request_id, client_id, role, liability_type, ownership_bps, consent_state, consented_at)
  values
    (v_inv.request_id, p_client_id, v_inv.proposed_role, v_inv.proposed_liability,
     v_inv.proposed_ownership_bps, 'consented', now())
  on conflict (request_id, client_id) do update
    set consent_state='consented', consented_at=now(), updated_at=now()
  returning id into v_participant_id;
  update public.request_invitation
    set status='accepted', invited_client_id=p_client_id, responded_at=now(), updated_at=now()
    where id = v_inv.id;
  insert into public.notifications (user_id, kind, title, link, metadata)
  values (v_inv.inviter_client_id, 'joint_invitation_accepted', 'Your co-applicant accepted',
          '/requests/' || v_inv.request_id,
          jsonb_build_object('request_id', v_inv.request_id, 'participant_id', v_participant_id));
  return v_participant_id;
end $$;

create or replace function public.decline_request_invitation(p_token_hash bytea)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv public.request_invitation;
begin
  select * into v_inv from public.request_invitation where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  update public.request_invitation set status='declined', responded_at=now(), updated_at=now() where id=v_inv.id;
  insert into public.notifications (user_id, kind, title, link, metadata)
  values (v_inv.inviter_client_id, 'joint_invitation_declined', 'Your co-applicant declined',
          '/requests/' || v_inv.request_id, jsonb_build_object('request_id', v_inv.request_id));
end $$;

create or replace function public.revoke_request_invitation(p_invitation_id uuid, p_inviter_client_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv public.request_invitation;
begin
  select * into v_inv from public.request_invitation where id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if v_inv.inviter_client_id <> p_inviter_client_id then raise exception 'not_authorized'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  update public.request_invitation set status='revoked', revoked_at=now(), updated_at=now() where id=v_inv.id;
end $$;

-- ── Grants ───────────────────────────────────────────────────────────────
grant execute on function public.is_request_participant(uuid, uuid) to authenticated, anon, service_role;
grant execute on function public.current_client_email() to authenticated, anon, service_role;
grant execute on function public.create_request_invitation(uuid, uuid, text, bytea, text, public.invitation_channel, public.participant_role, public.liability_type, integer, integer) to service_role;
grant execute on function public.accept_request_invitation(bytea, uuid) to service_role;
grant execute on function public.decline_request_invitation(bytea) to service_role;
grant execute on function public.revoke_request_invitation(uuid, uuid) to service_role;

-- ── Expiry sweep (pg_cron, every 15 min) ─────────────────────────────────
do $$ begin perform cron.unschedule('expire-request-invitations'); exception when others then null; end $$;
select cron.schedule('expire-request-invitations', '*/15 * * * *',
  $job$update public.request_invitation set status='expired', updated_at=now() where status='pending' and expires_at < now();$job$);
