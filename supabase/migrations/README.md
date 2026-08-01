# Ficium App — DB Migrations (App DB)

Target database: **Supabase App DB** (`wixfhjlsjkiwfvqewvmt` · `ap-south-1`)

All migrations are applied via the **Supabase SQL editor** in the order below. They are idempotent where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`).

> **Note:** `v2-phase2/bid_notify_trigger.sql` targets the **Portal DB** (`egwobcajdlragubtkpqp`), not this one. Run it there.

---

## Run order

### Phase 1 — v2 schema migration

| File | Purpose | Notes |
|------|---------|-------|
| `v2/1_backup.sql` | Snapshot V1 tables into `backup_v1` schema | Run first — safety net |
| `v2/2_create_v2_tables.sql` | Create V2 tables alongside V1 (non-destructive) | |
| `v2/3_migrate_data.sql` | Copy data V1→V2 | |
| `v2/4_verify.sql` | Verify migration — must show 0 issues | Do not proceed if issues found |
| `v2/5_swap_references.sql` | Update RLS, views, functions, triggers to V2 | |
| `v2/6_drop_old_tables.sql` | Drop empty/duplicate V1 tables | After frontend tested on V2 |
| `v2/8_rollback.sql` | Full restore from backup_v1 | Emergency only |

### Phase 2 — production hardening

| File | Purpose |
|------|---------|
| `v2-phase2/1_public_audit_events.sql` | `public.audit_events` — consumer action WORM table |
| `v2-phase2/2_admin_audit_events.sql` | `admin.audit_events` — platform admin actions |
| `v2-phase2/3_drop_v1_tables.sql` | Drop V1 backup schemas once migration confirmed |
| `v2-phase2/fix_kyc_settings_rls_leak.sql` | Patch RLS on `kyc_settings` |
| `v2-phase2/fix_missing_grants_client_docs_messages.sql` | Fix missing grants on client docs + messages |
| `v2-phase2/drop_v1_backup_schemas.sql` | Drop `backup_v1` schema (destructive — run last) |

### Phase 2 — marketplace integration

| File | Purpose | Notes |
|------|---------|-------|
| `v2-phase2/marketplace_sync_automation.sql` | `marketplace_sync` schema: pg_net trigger + pg_cron for App→Portal request sync | Requires `pg_net`, `pg_cron` extensions + Vault secrets |
| `v2-phase2/marketplace_sync_verification.sql` | Verification queries to confirm sync is working | Run after marketplace_sync_automation |

### Phase 2 — notifications

| File | Purpose |
|------|---------|
| `v2-phase2/notifications.sql` | `public.notifications` table + RLS policies (kind stored as `text`) |
| `v2-phase2/expiry_notifications.sql` | `notify_expiring_requests()` function + pg_cron hourly job |

> `v2-phase2/bid_notify_trigger.sql` — **Portal DB only.** Creates `bid_notify` schema on `egwobcajdlragubtkpqp`. Do not run on App DB.

### Phase 2 — request chat (per-lender, structured)

| File | Purpose | Notes |
|------|---------|-------|
| `v2-phase2/request_chat_per_lender_structured.sql` | Scopes `request_messages` per lender, adds the `request_message_template` catalogue, freezes losing threads, replaces the client RLS policies | Run before any institution-side chat is wired |

Scopes chat to `(request_id, institution_id)` — previously `request_messages` was keyed on `request_id` alone, so every institution bidding on a request shared one thread and could read each other's messages. Also restricts both sides to the seeded template catalogue until a bid is accepted, since the marketplace is anonymous until the Phase 2 reveal and free text is an identity-leak channel; free text unlocks for the winning lender only.

Enforcement is in a `BEFORE INSERT OR UPDATE` trigger, **not** RLS alone — `ficium-portal-api` reaches this DB with a service session and would otherwise bypass RLS entirely.

Verify after running (each should return zero rows):
```sql
-- Messages not scoped to a lender (pre-migration rows excepted)
SELECT id FROM public.request_messages
 WHERE institution_id IS NULL AND created_at > now() - interval '1 minute';

-- Structured messages whose template doesn't match the sender
SELECT m.id FROM public.request_messages m
  JOIN public.request_message_template t ON t.code = m.template_code
 WHERE m.kind = 'structured' AND t.sender_type <> m.sender_type;

-- Free-text messages on a thread that never won
SELECT m.id FROM public.request_messages m
 WHERE m.kind = 'free'
   AND NOT public.request_chat_is_winner(m.request_id, m.institution_id);
```

### Phase 2 — Vault

| File | Purpose |
|------|---------|
| `v2-phase2/vault_documents.sql` | `client_vault_document`, `client_vault_property`, `client_vault_access_log` tables + RLS + `vault_extract` dispatch schema |

---

## Required extensions

Enable before running any phase 2 migrations:

| Extension | Purpose | Enable in |
|---|---|---|
| `pg_net` | Outbound HTTP calls from triggers | Supabase dashboard → Extensions |
| `pg_cron` | Scheduled jobs (marketplace sync sweep, expiry warnings) | Supabase dashboard → Extensions |
| `pgcrypto` | UUID generation | Usually pre-enabled |

---

## Vault secrets (required for pg_net)

The `marketplace_sync` and `vault_extract` triggers read these from the Supabase Vault at runtime. Set them once after enabling the extensions:

```sql
SELECT vault.create_secret(
  'https://ficium-portal-api-production.up.railway.app',
  'portal_api_url'
);
SELECT vault.create_secret('<APP_SERVICE_SECRET>', 'app_service_secret');

-- Verify
SELECT name, created_at FROM vault.secrets
WHERE name IN ('portal_api_url', 'app_service_secret');
```

---

## Table inventory (current production schema)

### Core consumer tables

| Table | Schema | Description |
|---|---|---|
| `clients` | `public` | Consumer PII — name, email, phone, DOB, address, KYC status |
| `requests` | `public` | Financing requests |
| `bid_acceptances` | `public` | Accepted bid record (App DB side; full reveal on Portal DB) |
| `notifications` | `public` | In-app notifications — `kind` (text), `title`, `body`, `link`, `metadata` (jsonb), `read_at` |
| `request_messages` | `public` | Chat, scoped per lender via `(request_id, institution_id)`. `kind` = `structured` (template-driven, pre-acceptance) or `free` (winning lender only). Append-only — no UPDATE/DELETE policy |
| `request_message_template` | `public` | Catalogue of permitted pre-acceptance messages; `sender_type` fixes who may send each one |

### Financial profile

| Table | Schema | Description |
|---|---|---|
| `client_dossier` | `public` | Employment, income, net worth, has_existing_loans (self-declared) |
| `client_financial_snapshot` | `public` | Computed snapshot — income/property/liabilities verified flags + values |
| `client_loan_details` | `public` | Per-loan breakdown; unique on `(client_id, loan_type)` |

### Vault (document storage + extraction)

| Table | Schema | Description |
|---|---|---|
| `client_vault_document` | `public` | Document registry — type, storage path, extraction lifecycle, confidence score |
| `client_vault_property` | `public` | Verified property records from title deeds + valuations; unique on `(client_id, address)` |
| `client_vault_access_log` | `public` | Append-only audit trail — every upload, view, extract action |

### Notification dispatch schemas (DB-level pg_net triggers)

| Schema | Tables/Functions | Purpose |
|---|---|---|
| `marketplace_sync` | `dispatch()`, `on_request_change()`, `health()`, `recent_calls()` | App→Portal request sync |
| `vault_extract` | `dispatch(uuid)`, `on_document_upload()` | Document extraction trigger |

> `bid_notify` schema lives on the **Portal DB**, not here.

---

## pg_cron jobs

| Job name | Schedule | Function | Purpose |
|---|---|---|---|
| `marketplace-sync-sweep` | `*/5 * * * *` | `marketplace_sync.dispatch()` | Safety-net sweep — catches any pg_net misses |
| `notify-expiring-requests` | `0 * * * *` | `notify_expiring_requests()` | Warn consumers 24h before bid window closes |

View scheduled jobs:
```sql
SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;
```

---

## RLS design principles

Every table follows these rules:
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- Clients can only access their own rows (`user_id = auth.uid()` or `client_id = auth.uid()`)
- `service_role` has unrestricted access for server-side Vercel handlers
- Audit tables are append-only (no UPDATE/DELETE policies for non-service roles)

> **Caveat:** `service_role` bypasses RLS entirely, and `ficium-portal-api` reaches this DB with a service session. Any rule that must also hold against the portal belongs in a trigger, not only in a policy — see `request_messages_enforce()` in the request-chat migration.

---

## Checking migration health

```sql
-- Verify sync trigger is live
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%marketplace%' OR trigger_name LIKE '%vault%';

-- Check pg_cron jobs are active
SELECT jobname, schedule, active FROM cron.job;

-- Check vault secrets are set
SELECT name FROM vault.secrets
WHERE name IN ('portal_api_url', 'app_service_secret');

-- Check recent sync health
SELECT * FROM marketplace_sync.health();

-- Check recent sync calls
SELECT * FROM marketplace_sync.recent_calls(5);
```
