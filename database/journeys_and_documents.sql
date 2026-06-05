-- =============================================================
-- Ficium — Journey System + Document Vault
-- Run in Supabase SQL Editor
-- =============================================================

-- ── client_journeys ──────────────────────────────────────────
create table if not exists public.client_journeys (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references auth.users(id) on delete cascade,
  type            text not null check (type in (
                    'mortgage','vehicle','investment','education','travel','business'
                  )),
  title           text not null,
  status          text not null default 'active'
                    check (status in ('active','paused','completed','cancelled')),
  -- Wizard answers stored as JSONB (flexible per journey type)
  answers         jsonb not null default '{}',
  -- AI-calculated results
  ai_results      jsonb not null default '{}',
  -- e.g. { affordability: 82, monthlyRepayment: 35000, depositGap: 500000 }
  -- Linked request (set when user posts to marketplace)
  request_id      uuid references public.requests(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.client_journeys enable row level security;
create policy "journeys_select" on public.client_journeys for select using (auth.uid() = client_id);
create policy "journeys_insert" on public.client_journeys for insert with check (auth.uid() = client_id);
create policy "journeys_update" on public.client_journeys for update using (auth.uid() = client_id);
create policy "journeys_delete" on public.client_journeys for delete using (auth.uid() = client_id);

-- ── journey_tasks ─────────────────────────────────────────────
create table if not exists public.journey_tasks (
  id          uuid primary key default gen_random_uuid(),
  journey_id  uuid not null references public.client_journeys(id) on delete cascade,
  client_id   uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  type        text not null check (type in ('upload','action','verify','review')),
  status      text not null default 'pending'
                check (status in ('pending','in_progress','done','skipped')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.journey_tasks enable row level security;
create policy "tasks_select" on public.journey_tasks for select using (auth.uid() = client_id);
create policy "tasks_insert" on public.journey_tasks for insert with check (auth.uid() = client_id);
create policy "tasks_update" on public.journey_tasks for update using (auth.uid() = client_id);

-- ── client_documents ─────────────────────────────────────────
create table if not exists public.client_documents (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references auth.users(id) on delete cascade,
  journey_id    uuid references public.client_journeys(id),
  type          text not null check (type in (
                  'payslip','bank_statement','id_document',
                  'utility_bill','tax_return','business_plan',
                  'property_valuation','vehicle_quote','other'
                )),
  label         text not null,
  storage_path  text not null,
  file_name     text not null,
  file_size     int,
  mime_type     text,
  -- Auto-extracted data from OCR/KYC pipeline
  extracted     jsonb,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.client_documents enable row level security;
create policy "docs_select" on public.client_documents for select using (auth.uid() = client_id);
create policy "docs_insert" on public.client_documents for insert with check (auth.uid() = client_id);
create policy "docs_update" on public.client_documents for update using (auth.uid() = client_id);
create policy "docs_delete" on public.client_documents for delete using (auth.uid() = client_id);

-- Storage bucket for documents (run separately if needed)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- create policy "docs_storage" on storage.objects for all using (auth.uid()::text = (storage.foldername(name))[1]);

-- Auto-update triggers
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger journeys_updated_at before update on public.client_journeys
  for each row execute function update_updated_at();

-- Indexes
create index if not exists journeys_client_idx on public.client_journeys(client_id, created_at desc);
create index if not exists tasks_journey_idx   on public.journey_tasks(journey_id, sort_order);
create index if not exists docs_client_idx     on public.client_documents(client_id, created_at desc);
