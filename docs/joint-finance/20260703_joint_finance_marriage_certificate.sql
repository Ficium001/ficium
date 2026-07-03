-- Migration: joint_finance_marriage_certificate
-- Target: App DB (wixfhjlsjkiwfvqewvmt) — borrower marketplace
-- Applied 2026-07-03 (two-step: enum value committed separately, per PG 55P04 rule).
-- Adds OCR-driven marriage certificate verification, gating joint request release.

-- ── Step 1 (separate transaction) ───────────────────────────────────────
-- alter type public.vault_doc_type add value if not exists 'marriage_certificate';

-- ── Step 2 ───────────────────────────────────────────────────────────────
create extension if not exists pg_trgm;

do $$ begin
  create type public.relationship_match_status as enum ('pending','both_matched','partial_match','no_match');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.relationship_doc_status as enum ('pending_ocr','verified','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.request_relationship_document (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  vault_document_id uuid not null references public.client_vault_document(id),
  uploaded_by_client_id uuid not null references public.clients(id),

  doc_type public.vault_doc_type not null default 'marriage_certificate'
    check (doc_type = 'marriage_certificate'),

  extracted_text text,
  name_a_client_id uuid references public.clients(id),
  name_a_matched boolean not null default false,
  name_b_client_id uuid references public.clients(id),
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

create index if not exists request_relationship_document_request_idx
  on public.request_relationship_document (request_id);

alter table public.request_relationship_document enable row level security;
alter table public.request_relationship_document force row level security;

drop policy if exists request_relationship_document_select on public.request_relationship_document;
create policy request_relationship_document_select on public.request_relationship_document
  for select using (public.is_request_participant(request_id, auth.uid()));

create or replace function public.normalize_name(p_name text)
returns text language sql immutable as $$
  select nullif(trim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z ]+', ' ', 'g')), '')
$$;

create or replace function public.submit_relationship_document(
  p_request_id uuid,
  p_vault_document_id uuid,
  p_uploader_client_id uuid,
  p_extracted_text text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_participants uuid[];
  v_a uuid;
  v_b uuid;
  v_name_a text;
  v_name_b text;
  v_norm_text text;
  v_matched_a boolean := false;
  v_matched_b boolean := false;
  v_score_a numeric := 0;
  v_score_b numeric := 0;
  v_match_status public.relationship_match_status;
  v_verification public.relationship_doc_status;
  v_reject text := null;
  v_id uuid;
begin
  if not public.is_request_participant(p_request_id, p_uploader_client_id) then
    raise exception 'not_authorized';
  end if;

  select array_agg(client_id order by created_at) into v_participants
  from public.request_participant
  where request_id = p_request_id and consent_state = 'consented';

  if v_participants is null or array_length(v_participants, 1) <> 2 then
    raise exception 'requires_exactly_two_consented_participants';
  end if;

  v_a := v_participants[1];
  v_b := v_participants[2];

  select full_name into v_name_a from public.clients where id = v_a;
  select full_name into v_name_b from public.clients where id = v_b;

  v_norm_text := public.normalize_name(p_extracted_text);

  v_matched_a := v_norm_text ilike '%' || public.normalize_name(v_name_a) || '%';
  v_matched_b := v_norm_text ilike '%' || public.normalize_name(v_name_b) || '%';
  v_score_a := similarity(v_norm_text, public.normalize_name(v_name_a));
  v_score_b := similarity(v_norm_text, public.normalize_name(v_name_b));

  if v_matched_a and v_matched_b then
    v_match_status := 'both_matched'; v_verification := 'verified';
  elsif v_matched_a or v_matched_b then
    v_match_status := 'partial_match'; v_verification := 'rejected';
    v_reject := 'only one applicant name was found on the document';
  else
    v_match_status := 'no_match'; v_verification := 'rejected';
    v_reject := 'neither applicant name was found on the document';
  end if;

  insert into public.request_relationship_document (
    request_id, vault_document_id, uploaded_by_client_id, extracted_text,
    name_a_client_id, name_a_matched, name_b_client_id, name_b_matched,
    match_score_a, match_score_b, match_status, verification_status, reject_reason,
    reviewed_at
  ) values (
    p_request_id, p_vault_document_id, p_uploader_client_id, p_extracted_text,
    v_a, v_matched_a, v_b, v_matched_b,
    v_score_a, v_score_b, v_match_status, v_verification, v_reject,
    case when v_verification = 'verified' then now() else null end
  )
  on conflict (request_id) do update set
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

  insert into public.notifications (user_id, kind, title, link, metadata)
  select p, case when v_verification = 'verified' then 'relationship_doc_verified' else 'relationship_doc_rejected' end,
         case when v_verification = 'verified' then 'Marriage certificate verified' else 'Marriage certificate needs attention' end,
         '/requests/' || p_request_id,
         jsonb_build_object('request_id', p_request_id, 'verification_status', v_verification, 'reject_reason', v_reject)
  from unnest(v_participants) as p;

  return v_id;
end $$;

create or replace function public.can_release_request(p_request_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_participant_count int;
  v_unconsented_count int;
  v_reldoc_status public.relationship_doc_status;
begin
  select count(*), count(*) filter (where consent_state <> 'consented')
    into v_participant_count, v_unconsented_count
    from public.request_participant where request_id = p_request_id;

  if v_participant_count <= 1 then
    return v_unconsented_count = 0;
  end if;

  select verification_status into v_reldoc_status
    from public.request_relationship_document where request_id = p_request_id;

  return v_unconsented_count = 0 and v_reldoc_status = 'verified';
end $$;

grant execute on function public.normalize_name(text) to authenticated, anon, service_role;
grant execute on function public.submit_relationship_document(uuid, uuid, uuid, text) to service_role;
grant execute on function public.can_release_request(uuid) to authenticated, service_role;
