-- Migration: couple_link_entity
-- Target: App DB (wixfhjlsjkiwfvqewvmt) — borrower marketplace
-- Applied 2026-07-03. Pivots relationship verification from request-scoped
-- to a persistent, symmetric couple_link entity visible from both profiles.
-- Supersedes and drops the earlier request_relationship_document approach
-- (docs/joint-finance/20260703_joint_finance_marriage_certificate.sql) —
-- no production data existed on that table, so it was a clean cutover.

do $$ begin
  create type public.couple_status as enum ('pending_verification','verified','dissolved');
exception when duplicate_object then null; end $$;

create table if not exists public.couple_link (
  id uuid primary key default gen_random_uuid(),
  client_a_id uuid not null references public.clients(id),
  client_b_id uuid not null references public.clients(id),
  status public.couple_status not null default 'pending_verification',
  initiated_by_client_id uuid not null references public.clients(id),
  verified_at timestamptz,
  dissolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_link_ordered_pair check (client_a_id < client_b_id),
  unique (client_a_id, client_b_id)
);

create index if not exists couple_link_client_a_idx on public.couple_link (client_a_id);
create index if not exists couple_link_client_b_idx on public.couple_link (client_b_id);

alter table public.couple_link enable row level security;
alter table public.couple_link force row level security;

create or replace function public.is_couple_member(p_couple_id uuid, p_client_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.couple_link
    where id = p_couple_id and (client_a_id = p_client_id or client_b_id = p_client_id)
  );
$$;

drop policy if exists couple_link_select on public.couple_link;
create policy couple_link_select on public.couple_link
  for select using (client_a_id = auth.uid() or client_b_id = auth.uid());

create or replace function public.get_or_create_couple_link(
  p_client_x uuid, p_client_y uuid, p_initiated_by uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_lo uuid; v_hi uuid; v_id uuid;
begin
  if p_client_x = p_client_y then raise exception 'cannot_link_self'; end if;
  if p_client_x < p_client_y then v_lo := p_client_x; v_hi := p_client_y;
  else v_lo := p_client_y; v_hi := p_client_x; end if;

  select id into v_id from public.couple_link where client_a_id = v_lo and client_b_id = v_hi;
  if v_id is not null then return v_id; end if;

  insert into public.couple_link (client_a_id, client_b_id, initiated_by_client_id)
  values (v_lo, v_hi, p_initiated_by)
  returning id into v_id;
  return v_id;
end $$;

create table if not exists public.couple_relationship_document (
  id uuid primary key default gen_random_uuid(),
  couple_link_id uuid not null unique references public.couple_link(id) on delete cascade,
  vault_document_id uuid not null references public.client_vault_document(id),
  uploaded_by_client_id uuid not null references public.clients(id),

  doc_type public.vault_doc_type not null default 'marriage_certificate'
    check (doc_type = 'marriage_certificate'),

  extracted_text text,
  name_a_matched boolean not null default false,
  name_b_matched boolean not null default false,
  match_score_a numeric,
  match_score_b numeric,
  match_status public.relationship_match_status not null default 'pending',
  verification_status public.relationship_doc_status not null default 'pending_ocr',
  reject_reason text,

  reviewed_by uuid references public.clients(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.couple_relationship_document enable row level security;
alter table public.couple_relationship_document force row level security;

drop policy if exists couple_relationship_document_select on public.couple_relationship_document;
create policy couple_relationship_document_select on public.couple_relationship_document
  for select using (public.is_couple_member(couple_link_id, auth.uid()));

create or replace function public.submit_couple_relationship_document(
  p_couple_link_id uuid,
  p_vault_document_id uuid,
  p_uploader_client_id uuid,
  p_extracted_text text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_couple public.couple_link;
  v_name_a text; v_name_b text; v_norm_text text;
  v_matched_a boolean; v_matched_b boolean;
  v_score_a numeric; v_score_b numeric;
  v_match_status public.relationship_match_status;
  v_verification public.relationship_doc_status;
  v_reject text := null;
  v_id uuid;
begin
  if not public.is_couple_member(p_couple_link_id, p_uploader_client_id) then
    raise exception 'not_authorized';
  end if;

  select * into v_couple from public.couple_link where id = p_couple_link_id;
  select full_name into v_name_a from public.clients where id = v_couple.client_a_id;
  select full_name into v_name_b from public.clients where id = v_couple.client_b_id;

  v_norm_text := public.normalize_name(p_extracted_text);
  v_matched_a := v_norm_text ilike '%' || public.normalize_name(v_name_a) || '%';
  v_matched_b := v_norm_text ilike '%' || public.normalize_name(v_name_b) || '%';
  v_score_a := similarity(v_norm_text, public.normalize_name(v_name_a));
  v_score_b := similarity(v_norm_text, public.normalize_name(v_name_b));

  if v_matched_a and v_matched_b then
    v_match_status := 'both_matched'; v_verification := 'verified';
  elsif v_matched_a or v_matched_b then
    v_match_status := 'partial_match'; v_verification := 'rejected';
    v_reject := 'only one partner name was found on the document';
  else
    v_match_status := 'no_match'; v_verification := 'rejected';
    v_reject := 'neither partner name was found on the document';
  end if;

  insert into public.couple_relationship_document (
    couple_link_id, vault_document_id, uploaded_by_client_id, extracted_text,
    name_a_matched, name_b_matched, match_score_a, match_score_b,
    match_status, verification_status, reject_reason, reviewed_at
  ) values (
    p_couple_link_id, p_vault_document_id, p_uploader_client_id, p_extracted_text,
    v_matched_a, v_matched_b, v_score_a, v_score_b,
    v_match_status, v_verification, v_reject,
    case when v_verification = 'verified' then now() else null end
  )
  on conflict (couple_link_id) do update set
    vault_document_id = excluded.vault_document_id,
    uploaded_by_client_id = excluded.uploaded_by_client_id,
    extracted_text = excluded.extracted_text,
    name_a_matched = excluded.name_a_matched,
    name_b_matched = excluded.name_b_matched,
    match_score_a = excluded.match_score_a,
    match_score_b = excluded.match_score_b,
    match_status = excluded.match_status,
    verification_status = excluded.verification_status,
    reject_reason = excluded.reject_reason,
    reviewed_by = null,
    reviewed_at = excluded.reviewed_at,
    updated_at = now()
  returning id into v_id;

  if v_verification = 'verified' then
    update public.couple_link set status = 'verified', verified_at = now(), updated_at = now()
      where id = p_couple_link_id;
  end if;

  insert into public.notifications (user_id, kind, title, link, metadata)
  select c, case when v_verification = 'verified' then 'couple_verified' else 'couple_verification_rejected' end,
         case when v_verification = 'verified' then 'Your couple is verified' else 'Marriage certificate needs attention' end,
         '/couple',
         jsonb_build_object('couple_link_id', p_couple_link_id, 'verification_status', v_verification, 'reject_reason', v_reject)
  from unnest(array[v_couple.client_a_id, v_couple.client_b_id]) as c;

  return v_id;
end $$;

create or replace function public.accept_request_invitation(p_token_hash bytea, p_client_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_inv public.request_invitation;
  v_kyc public.kyc_status;
  v_participant_id uuid;
  v_couple_id uuid;
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

  v_couple_id := public.get_or_create_couple_link(v_inv.inviter_client_id, p_client_id, v_inv.inviter_client_id);

  insert into public.notifications (user_id, kind, title, link, metadata)
  values (v_inv.inviter_client_id, 'joint_invitation_accepted', 'Your co-applicant accepted',
          '/requests/' || v_inv.request_id,
          jsonb_build_object('request_id', v_inv.request_id, 'participant_id', v_participant_id, 'couple_link_id', v_couple_id));

  return v_participant_id;
end $$;

create or replace function public.can_release_request(p_request_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_participants uuid[];
  v_unconsented_count int;
  v_couple_status public.couple_status;
begin
  select array_agg(client_id order by created_at),
         count(*) filter (where consent_state <> 'consented')
    into v_participants, v_unconsented_count
    from public.request_participant where request_id = p_request_id;

  if v_participants is null or array_length(v_participants, 1) <= 1 then
    return coalesce(v_unconsented_count, 0) = 0;
  end if;

  if array_length(v_participants, 1) <> 2 then
    return false;
  end if;

  select status into v_couple_status from public.couple_link
    where (client_a_id = least(v_participants[1], v_participants[2])
       and client_b_id = greatest(v_participants[1], v_participants[2]));

  return v_unconsented_count = 0 and v_couple_status = 'verified';
end $$;

drop function if exists public.submit_relationship_document(uuid, uuid, uuid, text);
drop table if exists public.request_relationship_document;

grant execute on function public.is_couple_member(uuid, uuid) to authenticated, anon, service_role;
grant execute on function public.get_or_create_couple_link(uuid, uuid, uuid) to service_role;
grant execute on function public.submit_couple_relationship_document(uuid, uuid, uuid, text) to service_role;
grant execute on function public.accept_request_invitation(bytea, uuid) to service_role;
grant execute on function public.can_release_request(uuid) to authenticated, service_role;
