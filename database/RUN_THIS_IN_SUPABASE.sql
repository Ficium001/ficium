-- =============================================================
-- FICIUM — Complete Database Migration
-- Paste this entire script into Supabase SQL Editor and run it.
-- Safe to re-run (uses IF NOT EXISTS throughout).
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SHARED TRIGGER FUNCTION (updated_at)
-- ─────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;


-- ─────────────────────────────────────────────────────────────
-- 2. CLIENT GOALS
--    Stores financial goals per client (Buy a house, save for
--    travel, build investments, etc.)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_goals (
  id             uuid        primary key default gen_random_uuid(),
  client_id      uuid        not null references auth.users(id) on delete cascade,
  type           text        not null check (type in (
                               'mortgage','vehicle','personal','investment',
                               'education','business','savings','other'
                             )),
  title          text        not null,
  target_amount  numeric(15,2) not null,
  saved_amount   numeric(15,2) not null default 0,
  target_date    date,
  ai_insight     text,
  banks_ready    int         not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.client_goals enable row level security;

drop policy if exists "client_goals_select" on public.client_goals;
drop policy if exists "client_goals_insert" on public.client_goals;
drop policy if exists "client_goals_update" on public.client_goals;
drop policy if exists "client_goals_delete" on public.client_goals;

create policy "client_goals_select" on public.client_goals for select using (auth.uid() = client_id);
create policy "client_goals_insert" on public.client_goals for insert with check (auth.uid() = client_id);
create policy "client_goals_update" on public.client_goals for update using (auth.uid() = client_id);
create policy "client_goals_delete" on public.client_goals for delete using (auth.uid() = client_id);

drop trigger if exists client_goals_updated_at on public.client_goals;
create trigger client_goals_updated_at
  before update on public.client_goals
  for each row execute function update_updated_at();

create index if not exists client_goals_client_id_idx
  on public.client_goals(client_id, created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 3. CLIENT JOURNEYS
--    Full goal journey (wizard answers + AI results).
--    One journey per goal — e.g. "Buy house in Flic en Flac".
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_journeys (
  id           uuid        primary key default gen_random_uuid(),
  client_id    uuid        not null references auth.users(id) on delete cascade,
  type         text        not null check (type in (
                             'mortgage','vehicle','investment',
                             'education','travel','business'
                           )),
  title        text        not null,
  status       text        not null default 'active'
                 check (status in ('active','paused','completed','cancelled')),
  -- Wizard Q&A stored as flexible JSON
  answers      jsonb       not null default '{}',
  -- AI-calculated results: affordability, eligibility, repayment, etc.
  ai_results   jsonb       not null default '{}',
  -- Linked marketplace request (set when user posts to banks)
  request_id   uuid        references public.requests(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.client_journeys enable row level security;

drop policy if exists "journeys_select" on public.client_journeys;
drop policy if exists "journeys_insert" on public.client_journeys;
drop policy if exists "journeys_update" on public.client_journeys;
drop policy if exists "journeys_delete" on public.client_journeys;

create policy "journeys_select" on public.client_journeys for select using (auth.uid() = client_id);
create policy "journeys_insert" on public.client_journeys for insert with check (auth.uid() = client_id);
create policy "journeys_update" on public.client_journeys for update using (auth.uid() = client_id);
create policy "journeys_delete" on public.client_journeys for delete using (auth.uid() = client_id);

drop trigger if exists journeys_updated_at on public.client_journeys;
create trigger journeys_updated_at
  before update on public.client_journeys
  for each row execute function update_updated_at();

create index if not exists journeys_client_idx
  on public.client_journeys(client_id, created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 4. JOURNEY TASKS
--    Auto-generated checklist per journey type.
--    e.g. Upload payslip, Upload bank statements, Review offers.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.journey_tasks (
  id          uuid        primary key default gen_random_uuid(),
  journey_id  uuid        not null references public.client_journeys(id) on delete cascade,
  client_id   uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text,
  type        text        not null check (type in ('upload','action','verify','review')),
  status      text        not null default 'pending'
                check (status in ('pending','in_progress','done','skipped')),
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.journey_tasks enable row level security;

drop policy if exists "tasks_select" on public.journey_tasks;
drop policy if exists "tasks_insert" on public.journey_tasks;
drop policy if exists "tasks_update" on public.journey_tasks;

create policy "tasks_select" on public.journey_tasks for select using (auth.uid() = client_id);
create policy "tasks_insert" on public.journey_tasks for insert with check (auth.uid() = client_id);
create policy "tasks_update" on public.journey_tasks for update using (auth.uid() = client_id);

create index if not exists tasks_journey_idx
  on public.journey_tasks(journey_id, sort_order);


-- ─────────────────────────────────────────────────────────────
-- 5. CLIENT DOCUMENTS (Secure Vault)
--    One upload, used everywhere. Linked to journey optionally.
--    Files stored in Supabase Storage bucket "documents".
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_documents (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references auth.users(id) on delete cascade,
  journey_id    uuid        references public.client_journeys(id),
  type          text        not null check (type in (
                              'payslip','bank_statement','id_document',
                              'utility_bill','tax_return','business_plan',
                              'property_valuation','vehicle_quote','other'
                            )),
  label         text        not null,
  storage_path  text        not null,   -- path in Supabase Storage bucket
  file_name     text        not null,
  file_size     int,                    -- bytes
  mime_type     text,
  extracted     jsonb,                  -- OCR/AI extracted data
  verified      boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table public.client_documents enable row level security;

drop policy if exists "docs_select" on public.client_documents;
drop policy if exists "docs_insert" on public.client_documents;
drop policy if exists "docs_update" on public.client_documents;
drop policy if exists "docs_delete" on public.client_documents;

create policy "docs_select" on public.client_documents for select using (auth.uid() = client_id);
create policy "docs_insert" on public.client_documents for insert with check (auth.uid() = client_id);
create policy "docs_update" on public.client_documents for update using (auth.uid() = client_id);
create policy "docs_delete" on public.client_documents for delete using (auth.uid() = client_id);

create index if not exists docs_client_idx
  on public.client_documents(client_id, created_at desc);

create index if not exists docs_journey_idx
  on public.client_documents(journey_id);


-- ─────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKET FOR DOCUMENTS
--    Run this separately if the bucket doesn't exist yet.
--    Go to Storage → New bucket → name: "documents", private.
--    Then run the policy below.
-- ─────────────────────────────────────────────────────────────
-- Uncomment if bucket doesn't exist:
-- insert into storage.buckets (id, name, public)
-- values ('documents', 'documents', false)
-- on conflict do nothing;

-- Storage RLS: each user can only access their own folder
drop policy if exists "documents_storage_policy" on storage.objects;
create policy "documents_storage_policy" on storage.objects
  for all using (
    bucket_id = 'documents'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );


-- ─────────────────────────────────────────────────────────────
-- VERIFY — run after migration to confirm all tables exist
-- ─────────────────────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'client_goals',
    'client_journeys',
    'journey_tasks',
    'client_documents'
  )
order by table_name;
-- Should return 4 rows
