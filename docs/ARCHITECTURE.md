# Ficium App — Architecture

_Last updated: 27 June 2026_

This document covers the consumer-facing Ficium App (`ficium.vercel.app`). For the full platform picture including the Portal, ficium-auth, and ficium-portal-api, see `ficium-portal/ARCHITECTURE.md`.

---

## 1. Frontend structure

```
src/
├── app/              # Router, protected routes, app shell
├── core/             # Error boundary, React Query client
├── features/
│   ├── auth/         # Login, register, reset, auth context
│   └── marketing/    # Splash, HowItWorks
├── individual/       # Consumer-facing features
│   ├── dashboard/    # Home, profile, net worth summary
│   ├── requests/     # Request list, detail, bids, accept
│   ├── vault/        # Document vault + extraction
│   │   ├── api/      # vault.ts — upload, list, signed URLs, status poll
│   │   ├── hooks/    # useVault.ts — all vault state, upload lifecycle, polling
│   │   ├── components/ # UploadSheet, ExtractionBanner, DocumentCard, PropertyCard
│   │   └── pages/    # Vault.tsx
│   ├── alerts/       # In-app notifications
│   │   ├── api/      # notifications.ts — fetch, mark read, unread count
│   │   ├── hooks/    # useAlerts.ts — React Query, mark mutations
│   │   └── pages/    # Alerts.tsx
│   ├── markets/      # Market rates feed
│   ├── onboarding/   # KYC + dossier
│   ├── networth/     # Net worth calculator
│   └── health/       # Financial health score
├── business/         # Business user flows (future)
├── admin/            # Internal admin panel
└── shared/
    ├── lib/          # supabase.ts, apiClient.ts, format.ts, audit.ts
    └── ui/           # Button, Card, Input, Select, Field, PageShell,
                      # BottomNav, FiciumLogo, CardScroller
```

---

## 2. Auth

Consumers authenticate via **Supabase Auth** (email/password). The Supabase session is stored in `localStorage` under `ficium-auth`.

`AuthContext` (`src/features/auth/context/AuthContext.tsx`):
- Initialises from the Supabase session on mount
- Resolves `role` via `get_my_role()` RPC (async, non-blocking)
- Pre-fetches dashboard data the moment role is confirmed
- `useAuth()` is the single hook for all auth state

The portal (institution) app uses a completely separate auth system (ficium-auth RS256 JWT). The two auth systems never interact.

---

## 3. Data fetching

All server state is managed by **TanStack Query v5**:
- Every query key is declared in a `*QueryKeys` object within the feature's hook file
- `staleTime` is always set explicitly
- Mutations always `invalidateQueries` on the relevant key namespace
- Dashboard data is prefetched in `AuthContext` before the router renders

Direct Supabase calls (`src/shared/lib/supabase.ts` client) are used for:
- All consumer data reads (requests, notifications, vault documents, profile)
- Writes that don't need server-side orchestration

Vercel API routes (`/api/*`) are used for:
- KYC (needs server-side AWS Rekognition + Claude)
- Bid operations (need to call portal-api server-side)
- Claude AI features (chat, request builder, market intelligence)

---

## 4. Vercel serverless functions

12 root-level functions (`api/*.ts`) — exactly at the Hobby plan limit.

**Consumer-facing (called from browser):**
- `accept-bid.ts` — Phase 2 identity reveal + atomic bid acceptance
- `request-bids.ts` — fetch bids for a single request
- `request-bids-bulk.ts` — fetch bids for multiple requests (dashboard)
- `request-actions.ts` — cancel, extend request
- `request-builder.ts` — AI-assisted request drafting
- `chat.ts` — Claude AI financial coach
- `intelligence.ts` — market intelligence
- `market.ts` — market data
- `rate-applicant.ts` — applicant risk scoring
- `kyc.ts` — identity verification

**Internal (called by pg_net triggers only):**
- `internal.ts` — router for all pg_net-triggered handlers

  | Action | Handler | Trigger |
  |--------|---------|---------|
  | `bid-notify` | `_lib/handlers/bid-notify.ts` | `trg_bid_notify` on `marketplace.bid` INSERT (Portal DB) |
  | `vault-extract` | `_lib/handlers/vault-extract.ts` | `trg_vault_extract` on `client_vault_document` INSERT (App DB) |
  | `request-expiring` | `_lib/handlers/request-expiring.ts` | pg_cron hourly, 23-25h before deadline (App DB) |
  | `request-expired` | `_lib/handlers/request-expired.ts` | `close_expired_windows()` on status→expired (Portal DB) |
  | `bid-accepted` | `_lib/handlers/bid-accepted.ts` | Called directly from `accept-bid.ts` |

**Keepalive:**
- `keepalive.ts` — pings Railway services to prevent cold starts

---

## 5. App DB schema (Supabase `wixfhjlsjkiwfvqewvmt`)

Key tables in `public.*`:

| Table | Purpose |
|---|---|
| `clients` | Consumer PII — full name, email, phone, DOB, address |
| `requests` | Consumer financing requests |
| `bid_acceptances` | Accepted bid record (App DB side) |
| `notifications` | In-app notifications (kind: text, idempotent by metadata) |
| `client_financial_snapshot` | Computed + verified financial profile |
| `client_dossier` | Employment, income, net worth (self-declared) |
| `client_loan_details` | Per-loan breakdown (from vault or self-declared) |
| `client_vault_document` | Vault document registry + extraction lifecycle |
| `client_vault_property` | Verified property records (from title deeds + valuations) |
| `client_vault_access_log` | Append-only audit trail on every document access |
| `kyc_submissions` | KYC verification attempts |
| `audit_events` | Consumer-facing audit trail |

Key DB schemas:
- `marketplace_sync.*` — pg_net dispatcher for App→Portal request sync
- `vault_extract.*` — pg_net dispatcher for document extraction

---

## 6. Migrations

All App DB migrations live in `supabase/migrations/`. Applied in order via Supabase SQL editor.

```
v2/                       Core v2 consumer schema
v2-phase2/
  marketplace_sync_automation.sql   pg_net sync trigger + pg_cron safety net
  notifications.sql                 public.notifications table + RLS
  bid_notify_trigger.sql            bid_notify schema (runs on Portal DB)
  vault_documents.sql               client_vault_document, _property, _access_log
  expiry_notifications.sql          notify_expiring_requests() + pg_cron
```

---

## 7. Vault extraction pipeline

```
Upload (browser)
  → supabase.from('client_vault_document').insert(...)     # DB record first
  → supabase.storage.from('documents').upload(...)         # then file
  → trg_vault_extract fires on INSERT
  → vault_extract.dispatch(document_id) via pg_net
  → POST ficium.vercel.app/api/internal { action: 'vault-extract' }

Extraction (Vercel)
  → Download file from Supabase Storage
  → POST anthropic /v1/messages (claude-sonnet-4-6, doc-type prompt)
  → Parse JSON, score confidence (fieldCount / expectedFields)
  → confidence < 0.4 → manual_review; error → failed; else → extracted

Attestation (if confident)
  → payslip/employment_letter/tax_return → attestIncome()
      → client_dossier.monthly_income
      → client_financial_snapshot.income_verified = true
  → loan_statement/credit_card_statement → attestLiabilities()
      → client_loan_details upsert (on conflict client_id,loan_type)
      → client_financial_snapshot.monthly_loan_payments, liabilities_verified
  → valuation_report → attestProperty()
      → client_vault_property upsert (on conflict client_id,address)
      → client_financial_snapshot.property_value, property_verified
  → title_deed → property record without value (needs valuation separately)
  → extract_status → 'attested'
```

Income priority: `payslip > employment_letter > tax_return > bank_statement`. Higher-confidence source never overwritten by lower.

Mauritius note: Registrar General title deeds carry no market value — upload both title deed and valuation report to get verified property value.

---

## 8. Double-blind bid flow

```
Consumer side (App DB)          Portal side (Institution DB)
──────────────────────          ────────────────────────────
requests.id = '35572ab8...'     marketplace.request.id = '35572ab8...'
  client_id = 'd6439707...'       consumer_id = _anon_uuid('d6439707...')
  (real UUID)                     (anonymised: MD5 of real_id+salt → UUID)

Institution sees:
  product, amount, term, purpose
  verified income flag, risk tier, DSR
  NEVER: client_id, name, email, NIC

On accept:
  portal-api fetches PII from App DB using real consumer_id
  writes to marketplace.bid_acceptance (institution DB)
  returns institution contact to consumer
```

---

## 9. TypeScript constraints

`tsconfig.node.json` (covers `api/*.ts`):
- `erasableSyntaxOnly: true` — no enums, no namespaces, no parameter properties
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports

`tsconfig.app.json` (covers `src/**`):
- Strict mode
- Path alias: `@/` → `src/`

Always run `npm run build` (not just `tsc --noEmit`) before pushing. Vercel runs `tsc -b` which enforces both configs.
