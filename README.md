# Ficium App

> **Reverse-banking marketplace for Mauritius.** Consumers post anonymised financial requests; FSC-licensed institutions compete with bids. The consumer picks the winner.

**Production:** [ficium.vercel.app](https://ficium.vercel.app) · **Stack:** React 19 · TypeScript · Supabase · Vercel · Tailwind

---

## Quick start

```bash
npm install
cp .env.example .env   # fill in credentials
npm run dev            # http://localhost:5173
npm run build          # tsc -b + vite build (always run before pushing)
```

> **Build note:** `npm run build` runs `tsc -b`, which is stricter than `tsc --noEmit`. It enforces `noUnusedLocals` and `erasableSyntaxOnly` (no enums, no namespaces, no parameter properties). A clean `--noEmit` can still fail the Vercel build. Always run `npm run build` locally before pushing.

---

## Environment variables

**Vercel / `.env` (runtime):**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | App DB Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side Vercel only) |
| `ANTHROPIC_API_KEY` | Claude AI (vault extraction, chat, KYC) |
| `RESEND_API_KEY` | Transactional email (bid notifications, KYC) |
| `APP_SERVICE_SECRET` | Shared secret for s2s calls (portal-api ↔ Vercel) |
| `PORTAL_API_URL` | ficium-portal-api base URL |

---

## Architecture

Three role-gated apps in one React SPA. Consumers authenticate via Supabase Auth; institution and admin routes are served by a separate portal app (`ficium-portal`).

```
Browser (React 19 SPA)
  ├── /                → Marketing (public)
  ├── /dashboard       → Individual client app
  └── /admin           → Admin panel (internal)

Vercel Serverless (12 functions — Hobby plan limit)
  ├── /api/kyc                KYC verification
  ├── /api/accept-bid         Phase 2 bid acceptance
  ├── /api/request-bids       Bid list (single request)
  ├── /api/request-bids-bulk  Bid list (bulk)
  ├── /api/request-builder    AI request drafting
  ├── /api/request-actions    Request status transitions
  ├── /api/internal           Internal pg_net dispatcher
  │     actions: bid-notify, vault-extract,
  │              request-expiring, request-expired, bid-accepted
  ├── /api/chat               Claude AI coach
  ├── /api/intelligence       Market intelligence
  ├── /api/market             Market data
  ├── /api/rate-applicant     Applicant scoring
  └── /api/keepalive          Railway warm-up

Supabase (App DB — wixfhjlsjkiwfvqewvmt · ap-south-1)
  ├── public.*                clients, requests, notifications, vault
  ├── marketplace_sync.*      App→Portal sync dispatcher (pg_net)
  ├── vault_extract.*         Document extraction dispatcher (pg_net)
  └── bid_notify.* (Portal)   Bid notification dispatcher (pg_net, Portal DB)
```

Full platform architecture: see `ficium-portal/ARCHITECTURE.md`.

---

## Feature map

| Route | Feature | Module |
|---|---|---|
| `/dashboard` | Home, net worth, quick actions | `individual/dashboard` |
| `/requests` | My requests list | `individual/requests` |
| `/requests/new` | New request builder | `individual/requests` |
| `/requests/:id` | Request detail + bids + accept | `individual/requests` |
| `/vault` | Document vault + extraction | `individual/vault` |
| `/alerts` | Notifications | `individual/alerts` |
| `/markets` | Market rates | `individual/markets` |
| `/networth` | Net worth calculator | `individual/networth` |
| `/onboarding` | KYC + dossier | `individual/onboarding` |
| `/profile` | Profile + settings | `individual/dashboard` |

---

## Code conventions

- **Feature-folder structure:** `src/individual/<feature>/{api,hooks,components,pages}/`
- **No logic in pages:** pages receive data from hooks, render components
- **React Query:** all server state via TanStack Query v5; keys in `QueryKeys` objects per feature
- **Supabase direct:** only from `src/` (never from `api/`); `api/` routes use `getServiceDb()`
- **Internal endpoints:** all pg_net-triggered handlers live in `api/_lib/handlers/` and are routed through `api/internal.ts` (keeps function count at 12)
- **Git author:** always `kishan.jeebun@ficium.net` — Vercel blocks other authors

---

## Vault — document enrichment

The Vault (`/vault`) lets consumers upload financial documents. On upload:
1. `client_vault_document` INSERT fires `trg_vault_extract`
2. pg_net calls `/api/internal { action: 'vault-extract' }`
3. Claude Vision extracts structured data per doc type
4. Data is attested into `client_financial_snapshot`, `client_vault_property`, `client_loan_details`
5. Documents never leave Ficium — institutions only see verified data points

---

## Notifications

Five notification kinds, all written to `public.notifications` (polled every 30s):

| Kind | Trigger |
|---|---|
| `request_created` | Request submitted |
| `bid_received` | Institution bids (+ email via Resend) |
| `request_expiring` | Bid window closes in 24h (pg_cron hourly) |
| `bid_expired` | Window closed, no bids |
| `bid_accepted` | Consumer accepts a bid |

---

## Documentation

| Doc | Contents |
|---|---|
| `docs/ARCHITECTURE.md` | Consumer app architecture detail |
| `docs/DATABASE.md` | App DB schema, RLS, migrations |
| `docs/API.md` | Vercel API endpoint reference |
| `ficium-portal/ARCHITECTURE.md` | **Full platform architecture (start here)** |
