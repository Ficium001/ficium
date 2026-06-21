# Ficium — Database Reference

_Last updated: June 2026 · Supabase project: wixfhjlsjkiwfvqewvmt_

---

## 1. Overview

Ficium uses a single Postgres 15 instance managed by Supabase, with three isolated schemas providing hard security boundaries between user types.

| Schema | Purpose | Row Count (est.) |
|---|---|---|
| `public` | Client-facing data | Primary tables |
| `institution` | Institution-facing data | Secondary tables |
| `admin` | Platform configuration | Small |

Every table has **Row Level Security (RLS) enabled**. No data is accessible without a valid JWT.

---

## 2. Auth integration

Supabase manages auth in the `auth` schema. The main integration points:

- `auth.users` — every user (clients, institution members, admins)
- `auth.uid()` — available in RLS policies to identify the calling user
- `get_my_role()` — Postgres RPC that returns `client | bank | admin` for the calling user
- `write_client_audit()` — Postgres RPC for writing audit events (bypasses direct-insert permissions)

User metadata set at sign-up (`options.data`) is mirrored into profile tables by triggers.

---

## 3. Public schema

### 3.1 `clients`

Core profile for individual and business users.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Matches `auth.users.id` |
| `email` | `text` | User email |
| `full_name` | `text` | Display name |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `kyc_status` | `kyc_status` enum | `pending \| submitted \| verified \| rejected` |
| `role` | `user_role` enum | `client \| bank \| admin` |
| `user_type` | `text` | `individual \| business` |
| `country` | `text` | ISO-3166 country code |
| `created_at` | `timestamptz` | |

**RLS:** clients can read/write only their own row (`id = auth.uid()`).

### 3.2 `client_dossier`

Financial profile — the core data institutions use to score requests.

| Column | Type | Description |
|---|---|---|
| `client_id` | `uuid` PK/FK → clients | |
| `employment_status` | `text` | employed / self_employed / etc. |
| `monthly_income` | `numeric` | MUR |
| `additional_income` | `numeric` | MUR |
| `total_net_worth` | `numeric` | Computed by frontend |
| `has_existing_loans` | `boolean` | |
| `health_score` | `integer` | 0–100, computed on save |
| `risk_score` | `integer` | 0–100, computed on save |
| `affordability_score` | `integer` | 0–100, computed on save |
| `pep_declaration` | `boolean` | Politically Exposed Person |
| `source_of_wealth` | `text` | salary / business / investments / etc. |
| `tax_residency` | `text` | ISO country code |
| `updated_at` | `timestamptz` | |

**RLS:** client reads/writes own row only. Institution sees anonymised aggregates via views.

### 3.3 `requests`

A client's request for a financial product.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → clients | |
| `product_type` | `product_type` enum | personal_loan / mortgage / etc. |
| `amount` | `numeric` | MUR |
| `purpose` | `text` | |
| `preferred_term_months` | `integer` | |
| `max_rate` | `numeric` | Optional max APR client will accept |
| `decision_deadline` | `date` | |
| `anonymized_brief` | `text` | What institutions see — no PII |
| `status` | `request_status` enum | `open \| closed \| cancelled` |
| `created_at` | `timestamptz` | |

**RLS:** clients see only their own requests. Institutions see open requests through `marketplace_requests` view (anonymised).

### 3.4 `bid_acceptances`

Written when a client accepts an institution's bid.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `bid_id` | `uuid` FK → institution.institution_bids | |
| `request_id` | `uuid` FK → requests | |
| `client_id` | `uuid` FK → clients | |
| `institution_id` | `uuid` FK → institution.institutions | |
| `accepted_at` | `timestamptz` | |

**RLS:** client reads/writes own rows. Institution reads its own accepted bids.

### 3.5 `client_goals`

Financial goals tracked by the client.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → clients | |
| `type` | `text` | mortgage / vehicle / savings / etc. |
| `title` | `text` | User-defined label |
| `target_amount` | `numeric` | MUR |
| `saved_amount` | `numeric` | MUR |
| `target_date` | `date` | |
| `ai_insight` | `text` | Claude-generated insight |
| `status` | `text` | on-track / needs-attention / ahead |
| `created_at` | `timestamptz` | |

### 3.6 `audit_events`

Append-only audit trail. Never updated, never deleted.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → clients | |
| `actor_id` | `uuid` | User who performed the action |
| `actor_type` | `text` | client_user / institution_user / admin |
| `action_category` | `text` | kyc.status_change / bid.accept / etc. |
| `event_label` | `text` | Human-readable |
| `resource_type` | `text` | Table name |
| `resource_id` | `uuid` | Row ID |
| `outcome` | `text` | success / rejected |
| `outcome_note` | `text` | Error message if failed |
| `actor_device` | `text` | desktop / mobile / tablet |
| `created_at` | `timestamptz` | |

**RLS:** client reads own events. Admin reads all.

### 3.7 Key views

| View | Purpose |
|---|---|
| `client_profile_view` | Joins clients + dossier + snapshot — used by dashboard and AI coach |
| `v_market_rates` | Anonymised average rates by product type (last 90 days) |
| `v_request_patterns` | Demand patterns — volume, average amounts |
| `v_acceptance_intelligence` | Winning bid patterns |
| `v_market_competitiveness` | Number of institutions and bids per product |

---

## 4. Institution schema

### 4.1 `institutions`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | Display name |
| `legal_name` | `text` | |
| `institution_type` | `text` | commercial_bank / fintech / etc. |
| `reg_number` | `text` | FSC license number |
| `regulator` | `text` | Regulatory body |
| `country` | `text` | ISO-3166 |
| `approved` | `boolean` | Platform approval status |
| `compliance_status` | `text` | not_submitted / pending / approved |
| `modules` | `text[]` | Enabled modules: `["marketplace"]` |
| `onboarding_stage` | `text` | registered / documents / approved |
| `primary_contact_email` | `text` | |
| `created_at` | `timestamptz` | |

### 4.2 `institution_members`

Users who belong to an institution.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `institution_id` | `uuid` FK → institutions | |
| `auth_user_id` | `uuid` | Matches `auth.users.id` |
| `email` | `text` | |
| `full_name` | `text` | |
| `role` | `text` | admin / maker / checker / viewer |
| `is_primary_admin` | `boolean` | |
| `active` | `boolean` | |

### 4.3 `institution_bids`

Bids placed by institutions on client requests.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `request_id` | `uuid` FK → public.requests | |
| `institution_id` | `uuid` FK → institutions | |
| `rate` | `numeric` | APR % |
| `rate_type` | `text` | fixed / variable |
| `amount_offered` | `numeric` | MUR |
| `term_months` | `integer` | |
| `conditions` | `jsonb` | Any special conditions |
| `status` | `text` | submitted / accepted / expired / withdrawn |
| `submitted_at` | `timestamptz` | |
| `response_time_ms` | `integer` | Time from request creation to bid |

### 4.4 `pending_actions`

Maker-checker queue. All material actions sit here until a second admin approves.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `institution_id` | `uuid` FK → institutions | |
| `maker_user_id` | `uuid` | Who created the action |
| `checker_user_id` | `uuid` | Who approved (null until approved) |
| `action_category` | `text` | bid.submit / bid.withdraw / etc. |
| `action_status` | `text` | pending / approved / rejected / expired |
| `payload` | `jsonb` | The action to execute on approval |
| `expires_at` | `timestamptz` | Actions expire after 4 hours |
| `created_at` | `timestamptz` | |

### 4.5 Key views

| View | Purpose |
|---|---|
| `marketplace_requests` | Open client requests with anonymised financial data |
| `my_bids` | Institution's own bids with status |

---

## 5. Postgres functions / RPCs

| Function | Schema | Purpose |
|---|---|---|
| `get_my_role()` | public | Returns `client \| bank \| admin` for calling user |
| `write_client_audit(...)` | public | Writes audit event — bypasses direct-insert RLS |
| `submit_for_approval(category, payload)` | institution | Creates pending_action for maker-checker |
| `approve_action(action_id, note)` | institution | Approves pending action (checker ≠ maker enforced) |
| `reject_action(action_id, note)` | institution | Rejects pending action |

---

## 6. Migrations

Migrations live in `supabase/migrations/`. Run with:

```bash
supabase db push           # apply pending migrations
supabase db reset          # reset local DB to clean state
```

Migration naming convention: `YYYYMMDD_description.sql`

**Current migration history:**

| File | Description |
|---|---|
| `v2/` | V2 schema — client_dossier, institution_members, audit_events |
| `v2-phase2/` | V2 phase 2 — journeys, goals, networth snapshot |
| `markets_tables.sql` | market_data, market_fx_rates, market_news tables |
| `fix_market_rls_grants.sql` | RLS policy fixes for market tables |

---

## 7. Indexes

Key indexes for query performance:

```sql
-- Requests — most common query
CREATE INDEX ON public.requests (client_id, created_at DESC);
CREATE INDEX ON public.requests (status) WHERE status = 'open';

-- Bids — lookup by request
CREATE INDEX ON institution.institution_bids (request_id, status);
CREATE INDEX ON institution.institution_bids (institution_id, status);

-- Audit — client history
CREATE INDEX ON public.audit_events (client_id, created_at DESC);

-- Pending actions — institution queue
CREATE INDEX ON institution.pending_actions (institution_id, action_status);
CREATE INDEX ON institution.pending_actions (expires_at) WHERE action_status = 'pending';
```

---

## 8. Backup and retention

- Supabase daily automated backups (7-day retention on Free/Pro, 30-day on Team+)
- `audit_events` is append-only — never deleted (regulatory requirement)
- `client_dossier` is upserted — previous values are not retained (consider versioning for compliance)

---

## 9. Scaling the database

See [SCALING.md](SCALING.md) for the full discussion. Key milestones:

| Users | Action |
|---|---|
| < 10k | Current setup is fine |
| 10k–100k | Add indexes on `requests.status`, enable connection pooling (PgBouncer) |
| 100k–500k | Materialise intelligence views with `pg_cron`, add read replica |
| 500k+ | Partition `audit_events` by month, consider TimescaleDB for market data |
| 1M+ | Dedicated analytics DB (Supabase Analytics or separate OLAP) |
