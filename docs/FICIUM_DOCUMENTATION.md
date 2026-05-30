# Ficium 3 — Complete Technical Documentation

> **Reverse-banking marketplace for Mauritius.** Clients post anonymized financial
> requests; licensed institutions compete with bids. This document is the
> single, authoritative A–Z reference: architecture, data dictionary, API surface,
> security model, and operational runbook.

| | |
|---|---|
| **Version** | 3.0 |
| **Last updated** | 30 May 2026 |
| **Repository** | github.com/Ficium001/ficium |
| **Production** | ficium.vercel.app |
| **Supabase project** | `wixfhjlsjkiwfvqewvmt` (region `ap-south-1`, Mumbai) |
| **Document owner** | Engineering |

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [System architecture](#2-system-architecture)
3. [Technology stack](#3-technology-stack)
4. [Repository structure](#4-repository-structure)
5. [Database — schemas overview](#5-database--schemas-overview)
6. [Data dictionary — `public` schema](#6-data-dictionary--public-schema)
7. [Data dictionary — `institution` schema](#7-data-dictionary--institution-schema)
8. [Data dictionary — `admin` schema](#8-data-dictionary--admin-schema)
9. [Enumerated types](#9-enumerated-types)
10. [Cross-schema views](#10-cross-schema-views)
11. [Stored procedures & RPC functions](#11-stored-procedures--rpc-functions)
12. [Triggers](#12-triggers)
13. [Row-Level Security model](#13-row-level-security-model)
14. [Maker-checker workflow](#14-maker-checker-workflow)
15. [Authentication & authorization](#15-authentication--authorization)
16. [Frontend architecture](#16-frontend-architecture)
17. [Supabase client factory](#17-supabase-client-factory)
18. [Routing map](#18-routing-map)
19. [Design system](#19-design-system)
20. [Key user flows](#20-key-user-flows)
21. [Product catalogue](#21-product-catalogue)
22. [Webhooks](#22-webhooks)
23. [Audit & compliance](#23-audit--compliance)
24. [Environment & configuration](#24-environment--configuration)
25. [Deployment](#25-deployment)
26. [Operational runbook](#26-operational-runbook)
27. [Glossary](#27-glossary)

---

## 1. Product overview

Ficium inverts the traditional lending model. Instead of a borrower approaching banks
one by one, the borrower posts a single **anonymized request** to a marketplace, and
**multiple licensed institutions bid** to win the business. The borrower then picks the
best offer.

### Actors

| Actor | Description | Primary surface |
|-------|-------------|-----------------|
| **Individual client** | A retail consumer in Mauritius seeking a loan, deposit, or investment product. | `/dashboard` |
| **Business client** | An SME or corporate seeking financing. | `/dashboard` |
| **Institution** | A licensed bank, fintech, or credit provider that bids on requests. Operates as an organization with multiple staff users. | `/institution` |
| **Institution user** | A staff member of an institution (admin, analyst, viewer, or compliance role). | `/institution` |
| **Ficium admin** | Platform operator. Approves institutions, manages the product catalogue, monitors the unified audit log. | `/admin` |

### Core value loop

```
Client posts request  ─►  Institutions see it in marketplace  ─►  Institution bids
        ▲                                                              │
        │                                                    (maker-checker approval)
        │                                                              ▼
   Client accepts  ◄──  Client compares bids on request page  ◄──  Bid published
        │
        ▼
  bid_acceptance recorded ─► institution notified ─► loan origination begins
```

### Design principles

- **Anonymized requests.** Institutions never see the client's identity until a bid is
  accepted. The marketplace exposes only a hashed `client_ref`.
- **Maker-checker on every material action.** No single institution user can unilaterally
  submit a bid, invite a colleague, or change an API key. A second admin must approve.
- **Append-only audit.** Every action is logged WORM-style (write once, read many) for
  FSC Mauritius regulatory reporting.
- **Schema isolation.** Client data, institution data, and platform-admin data live in
  three separate Postgres schemas with independent RLS.

---

## 2. System architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT (browser)                             │
│   React 19 + TypeScript + Vite SPA · Tailwind · TanStack Query       │
│                                                                      │
│   ┌───────────┐   ┌───────────────┐   ┌──────────────┐              │
│   │ Individual │   │  Institution  │   │    Admin     │              │
│   │   app      │   │    portal     │   │    panel     │              │
│   │ /dashboard │   │ /institution  │   │   /admin     │              │
│   └─────┬─────┘   └───────┬───────┘   └──────┬───────┘              │
│         │                  │                   │                      │
│         └──────────────────┼───────────────────┘                     │
│                            │                                         │
│              Unified Supabase client factory                        │
│              (one auth session, schema-scoped data clients)         │
└────────────────────────────┼────────────────────────────────────────┘
                             │ HTTPS (PostgREST + GoTrue + Realtime)
┌────────────────────────────┼────────────────────────────────────────┐
│                        SUPABASE                                      │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                   PostgreSQL                               │     │
│   │  ┌──────────┐   ┌───────────────┐   ┌──────────────┐      │     │
│   │  │  public  │   │  institution  │   │    admin     │      │     │
│   │  │  schema  │◄──┤    schema     │──►│   schema     │      │     │
│   │  └──────────┘   └───────────────┘   └──────────────┘      │     │
│   │       ▲  Row-Level Security on every table  ▲             │     │
│   └───────┼─────────────────────────────────────┼────────────┘     │
│           │                                       │                  │
│   ┌───────┴────────┐                    ┌────────┴────────┐         │
│   │   GoTrue auth   │                    │  Edge Functions │         │
│   │ (auth.users)    │                    │ (webhook worker)│         │
│   └────────────────┘                    └─────────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │   Anthropic Claude API   │  (AI advisor — /api/chat.ts)
                └─────────────────────────┘
```

### Request flow at runtime

1. Browser loads the SPA from Vercel's CDN.
2. `AuthProvider` hydrates the session from Supabase GoTrue and reads the user's `role`
   from `public.users`.
3. The router mounts the correct app shell based on role (`client` → individual,
   `bank` → institution, `admin` → admin panel).
4. Data is fetched via TanStack Query hooks that call schema-scoped Supabase clients.
5. PostgREST enforces RLS on every query using the JWT from the shared auth session.

---

## 3. Technology stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| UI framework | React | 19 | Functional components + hooks only |
| Language | TypeScript | 5.x | Strict mode enabled |
| Build tool | Vite | 6.x | Rolldown-based, manual chunk splitting |
| Styling | Tailwind CSS | 3.x | Custom design tokens (see §19) |
| Data fetching | TanStack Query | v5 | `useQuery` / `useMutation`, 30s polling on marketplace |
| Forms | React Hook Form + Zod | — | Schema validation co-located with forms |
| Icons | Lucide React | 0.383 | Tree-shaken |
| Backend | Supabase | — | Postgres + PostgREST + GoTrue + Realtime + Edge Functions |
| Database | PostgreSQL | 15 | 3 schemas, RLS everywhere |
| AI | Anthropic Claude API | — | Advisor feature via `/api/chat.ts` serverless fn |
| Hosting | Vercel | — | SPA + serverless API routes |
| Auth | Supabase GoTrue | — | Email/password, JWT-based |

### Why these choices

- **Supabase over a custom backend** — RLS gives row-level multi-tenancy for free, and
  PostgREST removes the need for a hand-written CRUD API. Edge Functions cover the few
  cases needing server-side logic (webhook delivery).
- **Three schemas over one** — clean security boundaries. A bug in institution RLS can
  never expose client PII because client data lives in a separate schema with separate
  policies.
- **TanStack Query over Redux** — server state is the dominant state; Query handles
  caching, polling, and invalidation declaratively.

---

## 4. Repository structure

Feature-sliced architecture. Each top-level feature owns its pages, hooks, API calls,
and types.

```
ficium/
├── api/
│   └── chat.ts                    # Vercel serverless fn — Claude AI advisor proxy
├── database/                       # SQL migrations (see §5)
├── public/                         # Static assets (favicon, icons)
├── src/
│   ├── main.tsx                    # App entry — mounts React, QueryClient, AuthProvider
│   ├── index.css                   # Tailwind directives + base styles
│   │
│   ├── app/
│   │   ├── routes.tsx              # Central route table (createBrowserRouter)
│   │   └── ProtectedRoute.tsx      # Route guards: PublicOnly, ClientOnly, BankOnly
│   │
│   ├── shared/                     # Cross-feature, framework-level code
│   │   ├── lib/
│   │   │   ├── supabase.ts         # ★ Unified Supabase client factory (see §17)
│   │   │   ├── auth.ts             # signUp/signIn/signOut for all 3 user types
│   │   │   ├── audit.ts            # Client-side audit event helpers
│   │   │   └── tokens.ts           # Design tokens (mirror of tailwind.config.js)
│   │   ├── components/
│   │   │   └── RegisterShell.tsx   # Shared split-panel registration layout
│   │   ├── ui/                     # Primitive components
│   │   │   ├── Button.tsx · Card.tsx · Field.tsx · Input.tsx
│   │   │   ├── Select.tsx · BottomNav.tsx · index.ts
│   │   └── pages/
│   │       └── NotFound.tsx
│   │
│   ├── features/                   # Shared cross-cutting pages
│   │   ├── auth/
│   │   │   ├── context/AuthContext.tsx   # ★ Global auth state + role resolution
│   │   │   └── pages/                     # Login, RegisterTypeSelect, Forgot/Reset, CheckEmail
│   │   └── marketing/pages/               # Splash, HowItWorks
│   │
│   ├── individual/                 # Individual + business client app
│   │   ├── auth/pages/RegisterIndividual.tsx
│   │   ├── dashboard/              # Dashboard, Profile (+ api, hooks)
│   │   ├── onboarding/             # KYC, Dossier (+ api)
│   │   ├── requests/               # Requests, NewRequest, RequestDetail (+ api, hooks)
│   │   ├── advisor/                # AI advisor (+ api)
│   │   └── alerts/                 # Notifications (+ api, hooks)
│   │
│   ├── business/
│   │   └── auth/pages/RegisterBusiness.tsx
│   │
│   ├── institution/                # Institution portal (see §16)
│   │   ├── lib/
│   │   │   ├── institutionSupabase.ts    # Re-exports shared factory clients
│   │   │   └── utils.ts                   # formatRate, formatAmount, formatDistanceToNow
│   │   ├── hooks/useInstitution.ts        # ★ All institution TanStack hooks
│   │   ├── types/institution.ts           # ★ All institution types (single source)
│   │   ├── components/
│   │   │   ├── InstitutionPortalShell.tsx # Sidebar + topbar + outlet
│   │   │   └── InstitutionRoute.tsx        # 4-layer access guard
│   │   ├── auth/pages/             # InstitutionLogin, RegisterInstitution, Pending, Onboarding
│   │   ├── dashboard/pages/InstitutionDashboard.tsx
│   │   ├── marketplace/pages/InstitutionMarketplace.tsx
│   │   ├── bids/pages/InstitutionBids.tsx
│   │   ├── approvals/pages/InstitutionApprovals.tsx
│   │   ├── products/pages/InstitutionProducts.tsx
│   │   ├── webhooks/pages/InstitutionWebhooks.tsx
│   │   ├── audit/pages/InstitutionAudit.tsx
│   │   └── settings/pages/InstitutionSettings.tsx
│   │
│   └── admin/                      # Ficium platform admin panel
│       ├── lib/adminSupabase.ts            # Re-exports shared factory clients
│       ├── hooks/useAdminData.ts           # ★ All admin TanStack hooks
│       └── pages/FiciumAdminPanel.tsx      # Single-page admin console
│
├── vite.config.ts                  # Build config + manual chunk splitting
├── tailwind.config.js              # Design tokens
├── tsconfig.*.json                 # TypeScript config
└── vercel.json                     # Deployment + SPA rewrites
```

★ = architecturally significant file.

---

## 5. Database — schemas overview

Ficium uses three isolated PostgreSQL schemas, all exposed via the Supabase Data API.

| Schema | Purpose | Primary owner | RLS gate |
|--------|---------|---------------|----------|
| `public` | Client-facing data: users, requests, bids, notifications, KYC. | Client app | `auth.uid()` ownership |
| `institution` | Institution operations: profiles, users, bids, products, webhooks, maker-checker, audit. | Institution portal | `institution_users` membership |
| `admin` | Platform governance: config, cross-schema views, unified audit. | Admin panel | `ficium_admin` JWT claim |

### Migration files (in `database/`, run in order)

| Order | File | Creates |
|-------|------|---------|
| 1 | `p1_enums.sql` | All enum types |
| 2 | `p2_tables.sql` | `public` core tables |
| 3 | `p2b_product_catalogue.sql` | Product catalogue tables |
| 4 | `p2b_tables_seed.sql` | Catalogue seed data |
| 5 | `p3_rls.sql` / `p3_rls_policies.sql` | `public` RLS |
| 6 | `p4_functions.sql` | `public` functions & triggers |
| 7 | `p6_create_schemas.sql` | Creates `institution` + `admin` schemas |
| 8 | `p7_institution_schema.sql` | All 17 institution tables + RLS helpers |
| 9 | `p8a_public_stubs.sql` | `public.client_requests`, `public.bid_acceptances` |
| 10 | `p9_seed_institution_catalogue.sql` | Seeds 17 products |
| 11 | `p10_admin_schema.sql` | Admin tables + views |
| 12 | `p11_migrate_bank_to_institution.sql` | Migrates RLS off `bank_profiles` |
| — | `fix_view_security.sql` | Cross-schema views with `security_invoker = false` |

---

## 6. Data dictionary — `public` schema

### `public.users`

Mirror of `auth.users` enriched with profile and role data. Populated by the
`handle_new_user()` trigger on signup.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | — | PK, FK → `auth.users.id` |
| `email` | `text` | no | — | User email |
| `full_name` | `text` | yes | `''` | Display name |
| `first_name` | `text` | yes | `''` | Given name |
| `middle_name` | `text` | yes | `''` | Middle name |
| `last_name` | `text` | yes | `''` | Surname |
| `phone` | `text` | yes | `''` | Contact phone |
| `title` | `title_type` | yes | — | Mr/Mrs/Ms/Dr etc. |
| `role` | `user_role` | no | `client` | `client` \| `bank` \| `admin` |
| `kyc_status` | `kyc_status` | no | `pending` | KYC verification state |
| `user_type` | `text` | yes | `individual` | `individual` \| `business` \| `institution` |
| `company_name` | `text` | yes | — | For business users |
| `company_registration` | `text` | yes | — | Company reg number |
| `date_of_birth` | `date` | yes | — | DOB |
| `gender` | `gender_type` | yes | — | Gender |
| `id_document_type` | `id_document_type` | yes | — | NIC/passport |
| `created_at` | `timestamptz` | no | `now()` | Row creation |
| `updated_at` | `timestamptz` | no | `now()` | Last update |

**RLS:** users read/update only their own row (`auth.uid() = id`); admins via JWT claim.

### `public.requests`

Client financing requests — the heart of the marketplace.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `client_id` | `uuid` | no | — | FK → `users.id` |
| `product_type` | `product_type` | no | — | Requested product (enum) |
| `status` | `request_status` | no | `open` | `open` \| `closed` \| `cancelled` |
| `amount` | `numeric` | no | — | Requested amount (MUR) |
| `purpose` | `text` | yes | — | Free-text purpose |
| `preferred_term_months` | `integer` | yes | — | Desired term |
| `max_rate` | `numeric` | yes | — | Max acceptable APR (%) |
| `decision_deadline` | `timestamptz` | yes | — | Bid window close |
| `anonymized_brief` | `text` | yes | — | Auto-generated institution-facing summary |
| `created_at` | `timestamptz` | no | `now()` | Row creation |

**RLS:**
- Clients: full CRUD on own rows (`auth.uid() = client_id`).
- Institution users: SELECT on `status = 'open'` rows **if** their institution is
  approved and not suspended (post-migration policy checks `institution.institutions`,
  not the legacy `bank_profiles`).

### `public.bids` (legacy)

Original single-schema bid table. Retained for backward compatibility; new bids go to
`institution.institution_bids`. The client request page merges both sources.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `request_id` | `uuid` | no | — | FK → `requests.id` |
| `bank_id` | `uuid` | no | — | FK → `users.id` (bank user) |
| `rate` | `numeric` | no | — | Offered APR (stored as percentage, e.g. `8.5`) |
| `terms` | `text` | yes | — | Free-text terms |
| `status` | `bid_status` | no | `submitted` | Bid state |
| `created_at` | `timestamptz` | no | `now()` | Row creation |

### `public.bid_acceptances`

Records a client accepting an institution bid. Insert here triggers downstream
notification and closes the request.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `bid_id` | `uuid` | no | — | FK → `institution.institution_bids.id` |
| `request_id` | `uuid` | no | — | FK → `requests.id` |
| `client_id` | `uuid` | no | — | FK → `users.id` |
| `institution_id` | `uuid` | no | — | FK → `institution.institutions.id` |
| `los_reference` | `text` | yes | — | Loan-origination-system ref |
| `crm_reference` | `text` | yes | — | CRM ref |
| `core_banking_ref` | `text` | yes | — | Core banking ref |
| `disbursement_status` | `text` | yes | `pending` | Disbursement state |
| `accepted_at` | `timestamptz` | no | `now()` | Acceptance timestamp |

### `public.bank_profiles` (legacy — deprecated)

Original institution profile table. Superseded by `institution.institutions`. Kept only
to satisfy the `handle_new_user()` trigger; **no longer the RLS gate** after the p11
migration. Slated for removal once all institution flows route through the
`institution` schema.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users.id`, unique |
| `institution_name` | `text` | Institution name |
| `institution_type` | `text` | Type |
| `license_number` | `text` | Licence |
| `regulatory_body` | `text` | Regulator |
| `approved` | `boolean` | (deprecated gate) |
| `plan_tier` | `text` | `starter` etc. |
| `win_rate` · `total_bids` · `deals_closed` | `numeric`/`int` | Legacy stats |

### `public.notifications`

In-app notifications. Drives the unread badge in `AuthContext`.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | no | PK |
| `user_id` | `uuid` | no | Recipient FK → `users.id` |
| `title` | `text` | no | Notification heading |
| `body` | `text` | yes | Body text |
| `read_at` | `timestamptz` | yes | Null = unread |
| `created_at` | `timestamptz` | no | Row creation |

---

## 7. Data dictionary — `institution` schema

The institution schema contains 17 tables. They divide into five groups:
**core** (institutions, users), **bidding** (bids, pending actions), **catalogue**
(products and their config), **integration** (webhooks, API keys, SLA), and
**audit** (audit_events, webhook_events).

### `institution.institutions`

The institution organization record.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `name` | `text` | no | — | Trading name |
| `legal_name` | `text` | no | — | Registered legal name |
| `institution_type` | `text` | no | — | `bank` \| `fintech` \| `micro_credit` \| `insurance` \| `investment_firm` \| `other` |
| `reg_number` | `text` | yes | — | Company/licence registration |
| `country` | `text` | no | — | Country of operation |
| `regulator` | `text` | yes | — | Regulatory body (FSC, BOM) |
| `website` | `text` | yes | — | Corporate website |
| `deployment_model` | `text` | no | `saas` | `saas` \| `paas` \| `on_prem` |
| `modules` | `jsonb` | no | `[]` | Licensed modules array, e.g. `["marketplace","credit"]` |
| `onboarding_stage` | `text` | no | `registered` | See OnboardingStage enum (§9) |
| `compliance_status` | `text` | no | `not_submitted` | See ComplianceStatus enum (§9) |
| `compliance_notes` | `text` | yes | — | Reviewer notes |
| `approved` | `boolean` | no | `false` | Live on marketplace |
| `approved_at` | `timestamptz` | yes | — | Approval timestamp |
| `suspended_at` | `timestamptz` | yes | — | Suspension timestamp (null = active) |
| `suspension_reason` | `text` | yes | — | Why suspended |
| `primary_contact_name` | `text` | yes | — | Main contact |
| `primary_contact_email` | `text` | yes | — | Main contact email |
| `primary_contact_phone` | `text` | yes | — | Main contact phone |
| `created_at` | `timestamptz` | no | `now()` | Row creation |
| `updated_at` | `timestamptz` | no | `now()` | Last update |

### `institution.institution_users`

Maps `auth.users` to an institution with a role. Many-to-one (an institution has many
users; a user belongs to one institution).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `institution_id` | `uuid` | no | — | FK → `institutions.id` |
| `user_id` | `uuid` | no | — | FK → `auth.users.id` |
| `role` | `text` | no | `analyst` | `admin` \| `analyst` \| `viewer` \| `compliance` |
| `is_primary_admin` | `boolean` | no | `false` | The founding admin |
| `invited_by` | `uuid` | yes | — | FK → user who invited |
| `created_at` | `timestamptz` | no | `now()` | Row creation |

**Unique constraint:** `(institution_id, user_id)`.

### `institution.institution_bids`

The new canonical bid table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `request_id` | `uuid` | no | — | References `public.requests.id` (no cross-schema FK) |
| `institution_id` | `uuid` | no | — | FK → `institutions.id` |
| `product_id` | `uuid` | yes | — | FK → `products.id` |
| `submitted_by` | `uuid` | yes | — | FK → user who submitted |
| `rate` | `numeric` | no | — | Offered rate as **decimal** (e.g. `0.085` = 8.5%) |
| `rate_type` | `text` | no | `fixed` | `fixed` \| `variable` |
| `amount_offered` | `numeric` | no | — | Amount the institution will lend (MUR) |
| `term_months` | `integer` | no | — | Offered term |
| `conditions` | `jsonb` | yes | — | Free-form conditions, e.g. `{"notes": "..."}` |
| `status` | `text` | no | `draft` | See BidStatus enum (§9) |
| `submitted_via` | `text` | no | `portal` | `portal` \| `webhook` \| `api_pull` \| `core_banking` |
| `response_time_ms` | `integer` | yes | — | Time from request to bid |
| `submitted_at` | `timestamptz` | no | `now()` | Submission timestamp |
| `expires_at` | `timestamptz` | yes | — | Bid expiry |
| `withdrawn_at` | `timestamptz` | yes | — | Withdrawal timestamp |
| `withdraw_reason` | `text` | yes | — | Why withdrawn |

> **Rate format note:** institution bids store rate as a decimal fraction (`0.085`),
> while legacy `public.bids` store it as a percentage (`8.5`). The client request page
> normalizes for display using the `source` field.

### `institution.pending_actions`

The maker-checker queue. Every material action lands here awaiting a second admin.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `action_category` | `text` | no | — | e.g. `bid.submit`, `user.invite`, `api_key.create` |
| `action_status` | `text` | no | `pending` | See ActionStatus enum (§9) |
| `maker_id` | `uuid` | no | — | Who initiated |
| `maker_role` | `text` | no | — | Maker's role |
| `institution_id` | `uuid` | yes | — | Owning institution |
| `initiated_at` | `timestamptz` | no | `now()` | When initiated |
| `resource_type` | `text` | no | — | Target table |
| `resource_id` | `uuid` | yes | — | Target row (if update) |
| `payload` | `jsonb` | no | — | Proposed new state |
| `payload_before` | `jsonb` | yes | — | Prior state (for updates) |
| `checker_id` | `uuid` | yes | — | Who approved/rejected |
| `checker_role` | `text` | yes | — | Checker's role |
| `checker_note` | `text` | yes | — | Approval/rejection note |
| `checked_at` | `timestamptz` | yes | — | Decision timestamp |
| `expires_at` | `timestamptz` | no | — | Auto-expiry deadline |
| `executed_at` | `timestamptz` | yes | — | When the approved action ran |
| `execution_error` | `text` | yes | — | If execution failed |
| `created_at` | `timestamptz` | no | `now()` | Row creation |

### `institution.institution_webhooks`

Outbound webhook endpoints for real-time event delivery.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | no | `uuid_generate_v4()` | PK |
| `institution_id` | `uuid` | no | — | FK → `institutions.id` |
| `label` | `text` | no | — | Human-readable name |
| `endpoint_url` | `text` | no | — | Destination URL |
| `event_types` | `jsonb` | no | `[]` | Subscribed events, e.g. `["request.new","bid.accepted"]` |
| `secret_hash` | `text` | yes | — | HMAC signing secret hash |
| `active` | `boolean` | no | `true` | Enabled |
| `retry_max` | `integer` | no | `5` | Max delivery retries |
| `timeout_ms` | `integer` | no | `10000` | Request timeout |
| `last_fired_at` | `timestamptz` | yes | — | Last delivery attempt |
| `last_status` | `text` | yes | — | `delivered` \| `failed` |
| `created_at` | `timestamptz` | no | `now()` | Row creation |
| `updated_at` | `timestamptz` | no | `now()` | Last update |

### `institution.institution_api_keys`

API keys for programmatic access. Raw key shown once at creation; only the hash stored.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | no | PK |
| `institution_id` | `uuid` | no | FK → `institutions.id` |
| `label` | `text` | no | Key name |
| `key_hash` | `text` | no | SHA-256 of the raw key |
| `key_prefix` | `text` | yes | First chars for identification |
| `scopes` | `jsonb` | no | e.g. `["bids:write","requests:read"]` |
| `last_used_at` | `timestamptz` | yes | Last use |
| `revoked_at` | `timestamptz` | yes | Revocation (null = active) |
| `created_at` | `timestamptz` | no | Row creation |

### `institution.institution_sla_config`

Per-product SLA timing overrides per institution.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | no | PK |
| `institution_id` | `uuid` | no | FK → `institutions.id` |
| `product_code` | `text` | no | Product code |
| `bid_window_minutes` | `integer` | no | How long bids stay open |
| `auto_withdraw_minutes` | `integer` | no | Auto-withdraw timer |

**Unique constraint:** `(institution_id, product_code)`.

### `institution.audit_events`

Append-only audit log (WORM). No UPDATE or DELETE permitted.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` | no | PK |
| `institution_id` | `uuid` | yes | Owning institution |
| `pending_action_id` | `uuid` | yes | Related maker-checker action |
| `actor_id` | `uuid` | yes | Who acted |
| `actor_type` | `text` | no | `user` \| `system` \| `api` |
| `actor_role` | `text` | yes | Actor's role |
| `actor_ip` | `text` | yes | Source IP |
| `action_category` | `text` | yes | Category |
| `event_label` | `text` | no | Human-readable event |
| `resource_type` | `text` | yes | Target table |
| `resource_id` | `text` | yes | Target row |
| `state_before` | `jsonb` | yes | Prior state |
| `state_after` | `jsonb` | yes | New state |
| `outcome` | `text` | no | `success` \| `rejected` \| `failed` \| `expired` \| `logged` |
| `outcome_note` | `text` | yes | Detail |
| `created_at` | `timestamptz` | no | Event timestamp |

### `institution.webhook_events`

Webhook delivery queue and history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `webhook_id` | `uuid` | FK → `institution_webhooks.id` |
| `event_type` | `text` | Event name |
| `payload` | `jsonb` | Delivered body |
| `status` | `text` | `pending` \| `delivered` \| `failed` |
| `attempts` | `integer` | Delivery attempts |
| `next_retry_at` | `timestamptz` | Next retry time |
| `response_code` | `integer` | HTTP status received |
| `created_at` | `timestamptz` | Enqueued |

### Product catalogue tables

The catalogue is modular — a product's rate, SLA, eligibility, documents, and
parameters live in separate tables keyed to `products.id`.

| Table | Purpose |
|-------|---------|
| `institution.product_families` | Top-level groups: credit, deposits_savings, investments |
| `institution.products` | Individual products (17 total) |
| `institution.product_parameters` | Configurable parameters per product |
| `institution.product_documents` | Required documents per product |
| `institution.product_rate_config` | Min/max rate, amount, term per product |
| `institution.product_sla_defaults` | Default bid window / auto-withdraw |
| `institution.product_eligibility` | Eligibility rules and required modules |
| `institution.institution_product_config` | Per-institution product limit overrides |

**`institution.products`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `family_id` | `uuid` | FK → `product_families.id` |
| `code` | `text` | Stable code, e.g. `personal_loan` |
| `label` | `text` | Display name |
| `description` | `text` | Description |
| `currency` | `text` | Default `MUR` |
| `active` | `boolean` | Catalogue visibility |
| `sort_order` | `integer` | Display order |

**`institution.product_rate_config`**

| Column | Type | Description |
|--------|------|-------------|
| `product_id` | `uuid` | FK → `products.id` |
| `rate_type` | `text` | `fixed` \| `variable` \| `both` |
| `min_rate` · `max_rate` | `numeric` | Platform rate caps (decimal) |
| `min_amount` · `max_amount` | `numeric` | Platform amount bounds (MUR) |
| `min_term_months` · `max_term_months` | `integer` | Term bounds |

**`institution.institution_product_config`**

| Column | Type | Description |
|--------|------|-------------|
| `institution_id` | `uuid` | FK → `institutions.id` |
| `product_id` | `uuid` | FK → `products.id` |
| `enabled` | `boolean` | Institution offers this product |
| `min_rate` · `max_rate` | `numeric` | Institution-specific rate limits |
| `min_amount` · `max_amount` | `numeric` | Institution-specific amount limits |

**Unique constraint:** `(institution_id, product_id)`.

---

## 8. Data dictionary — `admin` schema

### `admin.platform_config`

Key-value platform configuration (11 seeded entries).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `key` | `text` | Config key (unique) |
| `value` | `jsonb` | Config value |
| `description` | `text` | What it controls |
| `updated_at` | `timestamptz` | Last change |

### `admin.admin_users`

Ficium staff with platform-admin rights.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `role` | `text` | `super_admin` \| `compliance` \| `support` |
| `created_at` | `timestamptz` | Row creation |

### Admin views

| View | Reads from | Purpose |
|------|-----------|---------|
| `admin.institution_overview` | `institution.institutions` + aggregates | Institution list with user/bid/webhook counts |
| `admin.unified_audit` | `institution.audit_events` + `public` logs | Cross-schema audit trail with institution names |
| `admin.pending_approvals` | `institution.pending_actions` | All pending maker-checker actions platform-wide |
| `admin.webhook_delivery_stats` | `institution.webhook_events` | Delivery success/failure rates |

---

## 9. Enumerated types

### `public` schema enums

| Type | Values |
|------|--------|
| `user_role` | `client`, `bank`, `admin` |
| `kyc_status` | `pending`, `submitted`, `verified`, `rejected` |
| `request_status` | `open`, `closed`, `cancelled` |
| `bid_status` | `submitted`, `accepted`, `rejected`, `withdrawn` |
| `product_type` | `personal_loan`, `housing_loan`, `vehicle_loan`, `business_loan`, … (mirrors catalogue) |
| `title_type` | `mr`, `mrs`, `ms`, `dr`, `prof` |
| `gender_type` | `male`, `female`, `other`, `prefer_not_to_say` |
| `id_document_type` | `national_id`, `passport`, `residence_permit` |

### `institution` schema enums (modeled as text + TS unions)

These are enforced as TypeScript unions in `types/institution.ts` and as text columns
with check constraints in the DB.

| Type | Values |
|------|--------|
| `DeploymentModel` | `saas`, `paas`, `on_prem` |
| `OnboardingStage` | `registered`, `commercial_review`, `deployment_selected`, `modules_assigned`, `technical_setup`, `compliance_review`, `pending_approval`, `approved`, `suspended` |
| `ComplianceStatus` | `not_submitted`, `under_review`, `passed`, `failed`, `expired` |
| `InstitutionType` | `bank`, `fintech`, `micro_credit`, `insurance`, `investment_firm`, `other` |
| `BidStatus` | `draft`, `submitted`, `accepted`, `rejected`, `expired`, `withdrawn` |
| `ActionStatus` | `pending`, `approved`, `rejected`, `expired`, `cancelled` |
| `IntegrationMode` | `portal`, `webhook`, `api_pull`, `core_banking` |
| Institution user role | `admin`, `analyst`, `viewer`, `compliance` |

---

## 10. Cross-schema views

Views in the `institution` schema read from `public.requests` and `public.bid_acceptances`.
**Critical:** these views are created `WITH (security_invoker = false)` so they execute
with the view owner's privileges, bypassing the calling user's RLS on `public.requests`.
This is what allows an institution user to read open requests without needing direct
RLS access to the `public` schema.

### `institution.marketplace_requests`

Open client requests, joined to the product catalogue, with the client identity hashed.

```sql
CREATE VIEW institution.marketplace_requests
WITH (security_invoker = false) AS
SELECT
  r.id, r.product_type::text, r.status::text, r.amount,
  'MUR' AS currency, r.preferred_term_months AS term_months,
  r.purpose, r.decision_deadline AS bid_window_closes_at, r.created_at,
  encode(digest(r.client_id::text, 'sha256'), 'hex') AS client_ref,
  'individual' AS client_type,
  p.id AS product_id, p.label AS product_label, pf.label AS family_label
FROM public.requests r
LEFT JOIN institution.products p  ON p.code = r.product_type::text
LEFT JOIN institution.product_families pf ON pf.id = p.family_id
WHERE r.status::text = 'open'
  AND (r.decision_deadline IS NULL OR r.decision_deadline > now());
```

### `institution.my_bids`

An institution's bids joined to the originating request and product.

### `institution.accepted_bids`

Accepted bids joined to acceptance records — the institution's won deals.

> **Type-casting note:** `product_type` and `status` are Postgres enums on
> `public.requests`. The views cast them `::text` so the join against the text
> `products.code` column works (`operator does not exist: text = product_type` otherwise).

---

## 11. Stored procedures & RPC functions

All callable from the client via `supabase.rpc(name, args)`.

### Maker-checker RPCs (`institution` schema)

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `submit_for_approval` | `p_action_category text, p_resource_type text, p_resource_id uuid, p_payload jsonb` | `uuid` (action id) | Creates a `pending_actions` row. Used for bids, invites, key creation, webhook changes. |
| `approve_action` | `p_action_id uuid, p_note text` | `void` | Approves a pending action. **Enforces maker ≠ checker.** Executes the action and logs to audit. |
| `reject_action` | `p_action_id uuid, p_note text` | `void` | Rejects a pending action with a mandatory reason. |
| `execute_approved_action` | `p_action_id uuid` | `void` | Internal — runs the approved action against the target table. |

### Helper functions (`institution` schema)

| Function | Returns | Description |
|----------|---------|-------------|
| `get_my_institution_id()` | `uuid` | The caller's institution from `institution_users`. Used in RLS. |
| `is_ficium_admin()` | `boolean` | True if JWT carries the `ficium_admin` claim. |
| `has_role(role text)` | `boolean` | True if caller has the given institution role. |
| `is_active()` | `boolean` | True if caller's institution is approved and not suspended. |
| `has_module(module text)` | `boolean` | True if caller's institution licenses the module. |

### `public` schema functions

| Function | Description |
|----------|-------------|
| `handle_new_user()` | Trigger fn — populates `public.users` (+ `bank_profiles` for banks) on signup. |
| `claim_webhook_batch()` | Atomically claims a batch of pending webhook events for the worker. |

---

## 12. Triggers

| Trigger | Table | Event | Function | Purpose |
|---------|-------|-------|----------|---------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` | Create profile rows on signup |
| `trg_audit_row_change` | various institution tables | AFTER INSERT/UPDATE | audit logger | Append to `audit_events` using `row_to_json()::jsonb` |
| `trg_set_updated_at` | tables with `updated_at` | BEFORE UPDATE | `set_updated_at()` | Maintain `updated_at` |
| `on_bid_accepted` | `public.bid_acceptances` | AFTER INSERT | acceptance handler | Mark winning bid, reject others, close request, enqueue webhooks |

### `handle_new_user()` (current definition)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  INSERT INTO public.users (
    id, email, full_name, first_name, last_name, phone, title,
    role, kyc_status, user_type, company_name, company_registration
  ) VALUES (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'first_name',''),
    coalesce(new.raw_user_meta_data->>'last_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'title',''),
    coalesce(new.raw_user_meta_data->>'role','client')::user_role,
    'pending',
    coalesce(new.raw_user_meta_data->>'user_type','institution'),
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'company_registration'
  ) ON CONFLICT (id) DO NOTHING;

  IF new.raw_user_meta_data->>'role' = 'bank' THEN
    INSERT INTO public.bank_profiles (
      user_id, institution_name, institution_type,
      license_number, regulatory_body, approved
    ) VALUES (
      new.id,
      coalesce(new.raw_user_meta_data->>'institution_name',''),
      new.raw_user_meta_data->>'institution_type',
      new.raw_user_meta_data->>'license_number',
      new.raw_user_meta_data->>'regulatory_body',
      false
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
end; $$;
```

> The `ON CONFLICT DO NOTHING` clauses make signup idempotent — a retried signup won't
> error on duplicate rows.

---

## 13. Row-Level Security model

RLS is enabled on every table. Policies fall into four patterns:

### Pattern 1 — ownership (`public` client tables)

```sql
-- users, requests, notifications
USING (auth.uid() = <owner_column>)
```

### Pattern 2 — institution membership (`institution` tables)

```sql
USING (institution_id = institution.get_my_institution_id())
```

Combined with `is_active()` for write policies so suspended institutions are read-only.

### Pattern 3 — admin claim (`admin` tables)

```sql
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ficium_admin')
```

### Pattern 4 — cross-schema marketplace read (`public.requests`)

The institution-facing read policy (post p11 migration):

```sql
CREATE POLICY "Institution users read open requests"
ON public.requests FOR SELECT
USING (
  client_id = auth.uid()                       -- clients see their own
  OR (
    status::text = 'open'
    AND EXISTS (
      SELECT 1 FROM institution.institution_users iu
      JOIN institution.institutions i ON i.id = iu.institution_id
      WHERE iu.user_id = auth.uid()
        AND i.approved = true
        AND i.suspended_at IS NULL
    )
  )
);
```

### Security definer views

The three cross-schema views use `security_invoker = false` so they read
`public.requests` with the view-owner's privileges. The institution-side access control
is then enforced by the `institution` schema's own RLS on who can query the view.

---

## 14. Maker-checker workflow

Every material action in the institution portal requires two different admins —
the **maker** initiates, the **checker** approves. The system enforces maker ≠ checker.

### Lifecycle

```
  Maker submits action
        │  submit_for_approval(category, resource_type, resource_id, payload)
        ▼
  pending_actions row created (status = 'pending', expires_at = now + window)
        │
        ├──────────────► Appears in /institution/approvals for all admins
        │
        ▼
  Checker decides
   ┌──────────────┬───────────────┐
   │   approve    │    reject      │
   │ approve_     │  reject_       │
   │ action()     │  action()      │
   └──────┬───────┴───────┬────────┘
          │               │
   maker ≠ checker?   note required?
          │ yes           │ yes
          ▼               ▼
   execute_approved   status = 'rejected'
   _action()          audit logged
          │
          ▼
   Target table mutated
   status = 'approved'
   audit logged
          │
   (if expires_at passes first)
          ▼
   status = 'expired'  (auto)
```

### Action categories

| Category | Triggered by | Target |
|----------|-------------|--------|
| `bid.submit` | Placing a bid | `institution_bids` |
| `bid.withdraw` | Withdrawing a bid | `institution_bids` |
| `user.invite` | Inviting a colleague | `institution_users` |
| `user.role_change` | Changing a role | `institution_users` |
| `user.remove` | Removing a user | `institution_users` |
| `api_key.create` | Generating an API key | `institution_api_keys` |
| `api_key.revoke` | Revoking a key | `institution_api_keys` |
| `webhook.create` | Adding an endpoint | `institution_webhooks` |
| `webhook.delete` | Removing an endpoint | `institution_webhooks` |

---

## 15. Authentication & authorization

### Auth provider

Supabase GoTrue, email/password. The session JWT is persisted in `localStorage` under
the single key `ficium-auth` (set in the unified client factory).

### Role resolution

Roles are **not** read from the JWT. `AuthContext` queries `public.users.role` after the
session hydrates:

```
Session hydrates (GoTrue)
        ▼
fetchUserMeta(userId):
  SELECT role FROM public.users WHERE id = userId
        ▼
  role ∈ { client, bank, admin }
        ▼
  If row missing → stale session → force signout + reload
```

The unread-notifications count is fetched in the same call and exposed as
`unreadCount` for the nav badge.

### Authorization layers

| Layer | Mechanism | Where |
|-------|-----------|-------|
| Route guard | `PublicOnlyRoute`, `ClientOnlyRoute`, `BankOnlyRoute` | `src/app/ProtectedRoute.tsx` |
| Portal guard | `InstitutionRoute` (4 checks: authed, role=bank, institution exists, active) | `src/institution/components/` |
| Data | Postgres RLS | Every table |
| Action | Maker-checker | `pending_actions` + RPCs |

### Sign-up functions (`src/shared/lib/auth.ts`)

| Function | Creates |
|----------|---------|
| `signUpIndividual()` | auth user (role=client, user_type=individual) → trigger creates `public.users` |
| `signUpBusiness()` | auth user (role=client, user_type=business) + company fields |
| `signUpInstitution()` | auth user (role=bank) → trigger creates `public.users` + `bank_profiles`; then inserts `institution.institutions` + `institution.institution_users` (primary admin) |
| `signIn()` | password sign-in, optional remember-me |
| `signOut()` | audit logout + GoTrue signout |

---

## 16. Frontend architecture

Three apps share one React SPA, gated by role. Each follows the same feature-sliced
pattern: `pages/` for routes, `hooks/` for TanStack Query, `api/` for data functions,
`types/` for TypeScript interfaces.

### Individual / business client app (`src/individual`, `src/business`)

| Feature | Pages | Hooks/API |
|---------|-------|-----------|
| Dashboard | `Dashboard`, `Profile` | `useDashboard`, `profile.ts` |
| Onboarding | `Kyc`, `Dossier` | `kyc.ts`, `dossier.ts` |
| Requests | `Requests`, `NewRequest`, `RequestDetail` | `useRequests`, `requests.ts` |
| Advisor (AI) | `Advisor` | `advisor.ts` → `/api/chat.ts` |
| Alerts | `Alerts` | `useAlerts`, `notifications.ts` |

### Institution portal (`src/institution`)

All pages render inside `InstitutionPortalShell` (sidebar + topbar + `<Outlet/>`).

| Page | Route | Reads | Writes |
|------|-------|-------|--------|
| `InstitutionDashboard` | `/institution` | marketplace, bids, pending | — |
| `InstitutionMarketplace` | `/institution/marketplace` | `marketplace_requests` view | bid via `submit_for_approval` |
| `InstitutionBids` | `/institution/bids` | `my_bids` view | withdraw via maker-checker |
| `InstitutionApprovals` | `/institution/approvals` | `pending_actions` | `approve_action`, `reject_action` |
| `InstitutionProducts` | `/institution/products` | `products` + rate config | `institution_product_config` |
| `InstitutionWebhooks` | `/institution/webhooks` | `institution_webhooks` | webhook CRUD via maker-checker |
| `InstitutionAudit` | `/institution/audit` | `audit_events` | — (read-only, CSV export) |
| `InstitutionSettings` | `/institution/settings` | institution, users, products | invite/key/SLA via maker-checker |

The single hook module `useInstitution.ts` exposes:
`useMyInstitution`, `useMyRole`, `useMarketplace`, `useMyBids`, `useSubmitBid`,
`usePendingActions`, `useApproveAction`, `useRejectAction`, `useWebhooks`,
`useProducts`, `useAuditEvents`, `useInstitutionUsers`.

### Admin panel (`src/admin`)

Single-page console (`FiciumAdminPanel`) with three sections: Institutions, Products,
Audit. Hook module `useAdminData.ts` exposes:
`useAdminInstitutions`, `useApproveInstitution`, `useSuspendInstitution`,
`useUpdateModules`, `useAdminProducts`, `useToggleProduct`, `useAdminAudit`,
`useAdminPendingApprovals`, `usePlatformConfig`, `useUpdatePlatformConfig`.

---

## 17. Supabase client factory

**The single most important architectural file:** `src/shared/lib/supabase.ts`.

Before refactor, the codebase had **8 separate `createClient()` calls** scattered across
6 files, each spawning its own GoTrue auth instance. This caused session divergence —
one client signed in, another anonymous — which silently broke RLS-gated institution
reads (the marketplace returned empty despite valid data).

### The fix

One `GoTrueClient` (one `storageKey: "ficium-auth"`) shared by all schema-scoped clients:

```ts
const AUTH_CONFIG = {
  persistSession: true, autoRefreshToken: true,
  detectSessionInUrl: true, storageKey: "ficium-auth",
};

export const supabase = createClient(url, key, { auth: AUTH_CONFIG });

const schemaClients = new Map<SchemaName, SupabaseClient>();
schemaClients.set("public", supabase);

export function db(schema: SchemaName = "public"): SupabaseClient {
  const cached = schemaClients.get(schema);
  if (cached) return cached;
  const client = createClient(url, key, { auth: AUTH_CONFIG, db: { schema } });
  schemaClients.set(schema, client);
  return client;
}

export const institutionDb = db("institution");
export const adminDb       = db("admin");
```

### Consumers

| File | Imports |
|------|---------|
| `institution/lib/institutionSupabase.ts` | re-exports `institutionDb`, `supabase` |
| `admin/lib/adminSupabase.ts` | re-exports `institutionDb`, `adminDb`, `publicDb` |
| `shared/lib/auth.ts` | `supabase`, `institutionDb` |
| `individual/requests/api/requests.ts` | `supabase`, `institutionDb` |
| `institution/hooks/useInstitution.ts` | `db("public")` for fallback |

No file should ever call `createClient()` directly again — always import from the factory.

---

## 18. Routing map

Defined in `src/app/routes.tsx` via `createBrowserRouter`. All pages lazy-loaded.

### Public routes

| Path | Page | Guard |
|------|------|-------|
| `/` | Splash | — |
| `/how-it-works` | HowItWorks | — |
| `/login` | Login | PublicOnly |
| `/register` | RegisterTypeSelect | — |
| `/register/individual` | RegisterIndividual | — |
| `/register/business` | RegisterBusiness | — |
| `/register/institution` | RegisterInstitution | — |
| `/forgot-password` | ForgotPassword | PublicOnly |
| `/reset-password` | ResetPassword | — |
| `/onboarding/check-email` | CheckEmail | — |

> Registration routes are intentionally **not** `PublicOnly` — a logged-in user can
> still register an additional account type.

### Client routes (ClientOnly)

| Path | Page |
|------|------|
| `/dashboard` | Dashboard |
| `/profile` | Profile |
| `/kyc` | Kyc |
| `/dossier` | Dossier |
| `/requests` | Requests |
| `/requests/new` | NewRequest |
| `/requests/:id` | RequestDetail |
| `/advisor` | Advisor |
| `/alerts` | Alerts |

### Institution routes

| Path | Page | Guard |
|------|------|-------|
| `/institution/login` | InstitutionLogin | — |
| `/institution/register` | RegisterInstitution | — |
| `/institution/pending` | InstitutionPending | — |
| `/institution/onboarding` | InstitutionOnboarding | — |
| `/institution` | InstitutionDashboard | BankOnly + shell |
| `/institution/marketplace` | InstitutionMarketplace | BankOnly + shell |
| `/institution/bids` | InstitutionBids | BankOnly + shell |
| `/institution/approvals` | InstitutionApprovals | BankOnly + shell |
| `/institution/products` | InstitutionProducts | BankOnly + shell |
| `/institution/webhooks` | InstitutionWebhooks | BankOnly + shell |
| `/institution/audit` | InstitutionAudit | BankOnly + shell |
| `/institution/settings` | InstitutionSettings | BankOnly + shell |

### Admin route

| Path | Page | Guard |
|------|------|-------|
| `/admin` | FiciumAdminPanel | internal role check (no PublicOnly wrapper) |

### Fallback

| Path | Page |
|------|------|
| `*` | NotFound |

---

## 19. Design system

Single source of truth: `tailwind.config.js` (raw values) mirrored in
`src/shared/lib/tokens.ts` (TS access).

### Colour tokens

| Token | Hex | Use |
|-------|-----|-----|
| `ficium` | `#2A1FE6` | Primary brand indigo |
| `ficium-deep` | `#1A14A8` | Hover, gradients |
| `ficium-bright` | `#3D32FF` | Decorative |
| `ink` | `#0A0A1A` | Text, dark sections |
| `cream` | `#FAF7F0` | Page background |
| `muted` | `#6B6B85` | Subdued text |
| `accent` | `#FFD84D` | Yellow highlight |
| `mint` | `#7DF9C5` | Success |
| `peach` | `#FF9F7A` | Warm accent |
| `danger` | `#DC2626` | Errors |

### Typography

| Token | Font | Use |
|-------|------|-----|
| `font-display` | Bricolage Grotesque | Headings |
| `font-body` | Inter Tight | Body |

### Component conventions

| Element | Classes |
|---------|---------|
| Card | `bg-white rounded-2xl shadow-card` |
| Primary button | `bg-ficium text-white rounded-xl hover:bg-ficium-deep` |
| Filter pill (active) | `bg-ficium text-white rounded-full` |
| Filter pill (inactive) | `bg-white border border-ink/10 text-muted rounded-full` |
| Input | `border-ink/[0.12] focus:border-ficium focus:ring-2 focus:ring-ficium/20` |
| Status badge | `rounded-full text-[11px] font-semibold px-3 py-1` |
| Loading spinner | `border-ficium border-t-transparent animate-spin` |

### Ficium logo (SVG path)

```
M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58
L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z
```

**Rules:** No dark theme. No maker-checker badge in persistent chrome (only on the audit
page footer). Cream background everywhere; white cards.

---

## 20. Key user flows

### Flow A — client posts a request

```
/requests/new → NewRequest form → createRequest()
  → INSERT public.requests (status=open, anonymized_brief auto-generated)
  → request appears in institution.marketplace_requests view within 30s
```

### Flow B — institution bids (maker-checker)

```
/institution/marketplace → "Place bid" → BidModal
  → useSubmitBid() → submit_for_approval('bid.submit', ...)
  → pending_actions row created
  → second admin opens /institution/approvals
  → approve_action() (maker ≠ checker enforced)
  → execute_approved_action() inserts institution.institution_bids (status=submitted)
  → audit_events logged
```

### Flow C — client accepts a bid

```
/requests/:id → getRequestBids() merges public.bids + institution.institution_bids
  → client compares, clicks "Accept"
  → acceptBid() detects schema:
      institution bid → INSERT public.bid_acceptances
      legacy bid       → UPDATE public.bids SET status=accepted
  → on_bid_accepted trigger: mark winner, reject others, close request, enqueue webhooks
  → UPDATE public.requests SET status=closed
```

### Flow D — institution onboarding

```
/register/institution (3 steps: details → deployment → admin account)
  → signUpInstitution()
      1. auth.signUp (role=bank) → handle_new_user trigger
      2. INSERT institution.institutions (onboarding_stage=registered, approved=false)
      3. INSERT institution.institution_users (role=admin, is_primary_admin=true)
  → /institution/pending (live stage tracker)
  → Ficium admin reviews in /admin → useApproveInstitution()
  → institution.approved=true, onboarding_stage=approved
  → institution user now sees marketplace
```

---

## 21. Product catalogue

17 products across 3 families, seeded by `p9_seed_institution_catalogue.sql`.

### Family: credit (7 products)

| Code | Label |
|------|-------|
| `personal_loan` | Personal Loan |
| `housing_loan` | Housing Loan |
| `investment_loan` | Investment Loan |
| `business_loan` | Business Loan |
| `vehicle_loan` | Vehicle Loan |
| `credit_card` | Credit Card |
| `overdraft` | Overdraft |

### Family: deposits_savings (5 products)

| Code | Label |
|------|-------|
| `fixed_deposit` | Fixed Deposit |
| `savings_account` | Savings Account |
| `notice_deposit` | Notice Deposit |
| `recurring_deposit` | Recurring Deposit |
| `current_account` | Current Account |

### Family: investments (5 products)

| Code | Label |
|------|-------|
| `unit_trust` | Unit Trust |
| `government_bond` | Government Bond |
| `corporate_bond` | Corporate Bond |
| `structured_product` | Structured Product |
| `pension` | Pension |

Each product carries a `product_rate_config` (platform caps) and
`product_sla_defaults`. Institutions narrow these via `institution_product_config`.

---

## 22. Webhooks

Institutions register endpoints to receive real-time events.

### Event types

| Event | Fired when |
|-------|-----------|
| `request.new` | A new open request matches the institution's licensed products |
| `bid.accepted` | The institution's bid is accepted by a client |
| `bid.rejected` | The institution's bid is rejected (client chose another) |
| `bid.expired` | The institution's bid expires unaccepted |
| `request.cancelled` | A client cancels a request the institution bid on |

### Delivery

1. Trigger enqueues a `webhook_events` row.
2. The Edge Function worker (`database/webhook-worker/`) claims a batch via
   `claim_webhook_batch()`.
3. Each event is POSTed to the endpoint with an `X-Ficium-Signature` HMAC-SHA256 header.
4. On failure, retried up to `retry_max` with backoff; status tracked in `webhook_events`.

> Webhook create/delete go through maker-checker. The signing secret is generated
> server-side and never exposed in full to the client.

---

## 23. Audit & compliance

### Append-only guarantee

`institution.audit_events` permits only INSERT — no UPDATE or DELETE. This satisfies the
FSC Mauritius WORM (write-once-read-many) reporting requirement.

### What's logged

Every maker-checker action, every approval/rejection, every bid lifecycle change, every
webhook delivery, every login/logout. Each row captures actor, role, IP, resource,
before/after state, and outcome.

### Reporting surfaces

| Surface | Scope | Export |
|---------|-------|--------|
| `/institution/audit` | Single institution | CSV |
| `/admin` → Audit | All institutions (`unified_audit` view) | CSV |

CSV export uses `JSON.stringify(value)` per cell to safely escape commas and quotes.

---

## 24. Environment & configuration

### Required environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Vercel + `.env` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel + `.env` | Supabase publishable (anon) key |
| `ANTHROPIC_API_KEY` | Vercel (server-only) | For `/api/chat.ts` AI advisor |

> **Note:** the codebase uses `VITE_SUPABASE_PUBLISHABLE_KEY`, **not**
> `VITE_SUPABASE_ANON_KEY`. The old name in early docs was incorrect.

### Supabase project settings

- **Exposed schemas** (Settings → API → Data API): `public`, `institution`, `admin`,
  `graphql_public` — all four must be checked or schema-scoped clients return empty.
- **Extra search path:** `public`, `extensions`.

### Build config (`vite.config.ts`)

Manual chunk splitting:
- `vendor-react` — react, react-dom, react-router-dom
- `vendor-query` — @tanstack/react-query
- `vendor-supabase` — @supabase/supabase-js
- `vendor-ui` — lucide-react, react-hook-form, zod
- `institution` — all institution portal pages (loaded only for bank users)

`chunkSizeWarningLimit: 600`.

---

## 25. Deployment

| Step | Command / action |
|------|------------------|
| Local dev | `npm run dev` |
| Type-check + build | `npm run build` |
| Deploy | Push to `main` → Vercel auto-deploys |
| Database migrations | Run SQL files in `database/` in order via Supabase SQL Editor |

`vercel.json` rewrites all routes to `index.html` for SPA client-side routing, except
`/api/*` which hits serverless functions.

---

## 26. Operational runbook

### Marketplace shows zero requests

1. Confirm requests exist: `SELECT count(*) FROM public.requests WHERE status='open';`
2. Confirm the view returns them: `SELECT count(*) FROM institution.marketplace_requests;`
3. Confirm the institution is approved and has the `marketplace` module:
   `SELECT approved, modules FROM institution.institutions WHERE id = '<id>';`
4. Confirm exposed schemas include `institution` (Supabase → Settings → API).
5. Confirm the views are `security_invoker = false` (run `fix_view_security.sql`).

### "Database error saving new user" on signup

Cause: `handle_new_user()` trigger failing — usually a missing table or column it
inserts into. Check `bank_profiles` exists and the trigger has `ON CONFLICT DO NOTHING`.
Run `fix_trigger_v2.sql`.

### Institution user can't see their institution

The `institution_users` link row is missing. Confirm:
`SELECT * FROM institution.institution_users WHERE user_id = auth.uid();`
If empty, the signup didn't complete the institution insert — link manually or re-run
the institution creation.

### `/admin` redirect loop

The `/admin` route must **not** be wrapped in `PublicOnlyRoute`. It checks role
internally.

### TypeScript build errors

- **TS6133 unused import** — remove the import.
- **enum vs text comparison** (`operator does not exist: text = product_type`) — cast
  enums `::text` in views.
- **`unknown` not assignable to ReactNode** — type-guard with `typeof x === "string"`.

---

## 27. Glossary

| Term | Definition |
|------|------------|
| **Anonymized brief** | Auto-generated institution-facing summary of a request that hides client identity. |
| **Bid window** | The period during which institutions may bid on a request. |
| **Checker** | The second admin who approves/rejects a maker-checker action. |
| **Client ref** | SHA-256 hash of a client's ID, shown to institutions instead of identity. |
| **Deployment model** | How an institution consumes Ficium: SaaS, PaaS, or on-premises. |
| **Maker** | The admin who initiates a maker-checker action. |
| **Maker-checker** | Four-eyes control requiring two different admins per material action. |
| **Module** | A licensed capability (marketplace, credit, ai_advisory, analytics). |
| **Onboarding stage** | Where an institution is in the approval pipeline. |
| **Reverse banking** | The Ficium model — institutions compete for clients, not vice versa. |
| **Security invoker** | A Postgres view setting; `false` means the view runs with owner privileges. |
| **WORM** | Write-once-read-many; the append-only audit guarantee. |

---

*End of document. For the executable SQL data dictionary, see the companion
`SCHEMA_REFERENCE.sql`. For per-table migration history, see `database/`.*
