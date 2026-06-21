# Ficium — System Architecture

_Last updated: June 2026 · Version: 3.0_

---

## 1. Overview

Ficium is a **reverse-banking marketplace** for Mauritius and the Indian Ocean region. Instead of clients approaching banks, clients post anonymised financial requests and FSC-licensed institutions compete with bids. The client picks the winner.

The platform serves three distinct user groups — individuals, financial institutions, and platform admins — each with different security requirements, workflows, and data access patterns. The architecture reflects this from the ground up.

---

## 2. System map

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React 19 SPA)                       │
│                                                                   │
│  Marketing  │  Individual App  │  Institution Portal  │  Admin   │
│  (public)   │  /dashboard      │  /institution        │  /admin  │
└──────┬──────┴────────┬─────────┴──────────┬───────────┴────┬────┘
       │               │                    │                │
       │         Supabase JS SDK (one auth session)          │
       │               │                    │                │
       ▼               ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│               Supabase (Postgres 15 + Auth + Realtime)           │
│                                                                   │
│  public schema      │  institution schema  │  admin schema       │
│  ─────────────      │  ──────────────────  │  ────────────       │
│  clients            │  institutions        │  config             │
│  requests           │  institution_members │  overrides          │
│  bids               │  institution_bids    │                     │
│  audit_events       │  products            │                     │
│  client_goals       │  pending_actions     │                     │
│  client_dossier     │  marketplace_requests│                     │
│  …                  │  …                   │                     │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│        Vercel Serverless Functions        │
│                                           │
│  POST /api/chat          → Claude AI coach│
│  GET  /api/intelligence  → Market data    │
│  POST /api/kyc-verify    → KYC engine     │
│  POST /api/kyc-liveness  → Liveness check │
│  POST /api/market        → Market feed    │
│  POST /api/request-builder → AI drafting  │
└──────────────────────────────────────────┘
```

---

## 3. Frontend architecture

### 3.1 Feature-folder structure

Code is organised by **domain + role**, not by technical type. Every feature is a self-contained folder with its own `api/`, `hooks/`, `components/`, `pages/`, and `types/`.

```
src/
├── app/              # Router, protected routes, app shell
├── core/             # Error boundary, query client
├── features/         # Cross-cutting features (auth, marketing)
│   ├── auth/         # Login, register, reset
│   └── marketing/    # Splash, HowItWorks
├── individual/       # Everything the client user sees
│   ├── dashboard/
│   ├── requests/
│   ├── goals/
│   ├── journeys/
│   ├── markets/
│   ├── onboarding/
│   ├── networth/
│   └── health/
├── institution/      # Everything the institution user sees
│   ├── marketplace/
│   ├── bids/
│   ├── products/
│   └── settings/
├── admin/            # Platform administration
└── shared/           # Used by ≥2 domains
    ├── components/   # RequestChat, RegisterShell
    ├── lib/          # supabase, format, audit, errors, claude
    └── ui/           # Button, Card, Input, Select, Field
```

### 3.2 Data fetching — React Query

All server state is managed by TanStack Query v5. Rules:

- Every query has a key from `src/shared/lib/query-keys.ts` — no inline strings
- `staleTime` is always set explicitly — never rely on the default
- Mutations always `invalidateQueries` against the relevant key namespace
- Dashboard data is **prefetched** in `AuthContext` the moment the user's role is confirmed — before the route renders

### 3.3 Auth context

`AuthContext` owns one piece of derived state: the user's `role` (`client | bank | admin`), fetched from the `get_my_role()` Postgres RPC. Route guards (`ClientOnlyRoute`, `BankOnlyRoute`) read from this context.

The auth session itself is owned entirely by Supabase (`ficium-auth` storage key). No JWT handling in application code.

### 3.4 Supabase client factory

**One `GoTrueClient` for the entire app.** The `supabase` client (public schema) owns the auth session. Schema-scoped clients (`institutionDb`, `adminDb`) are created with a no-op storage adapter so they never spin up a second `GoTrueClient`. A custom fetch interceptor injects the live `Authorization` header on every request to these secondary clients.

```
src/shared/lib/supabase.ts
  supabase      → public schema  (owns auth session)
  institutionDb → institution schema (no-op storage, token injected)
  adminDb       → admin schema        (no-op storage, token injected)
```

This design prevents the "multiple GoTrueClient" warning and the 403 errors caused by RLS seeing an unauthenticated session on secondary clients.

### 3.5 Code splitting

Every page is `lazy()` loaded. Vendor code is split into four named chunks:

| Chunk | Contents |
|---|---|
| `vendor-react` | react-dom, react-router |
| `vendor-query` | @tanstack/react-query |
| `vendor-supabase` | @supabase/supabase-js |
| `vendor-ui` | lucide-react, react-hook-form, zod |

A `ChunkErrorBoundary` wraps every lazy route — if a chunk fails to load (stale deploy cache), it auto-reloads once.

---

## 4. Backend architecture

### 4.1 Vercel serverless functions

All AI, KYC, and market data operations run as Node.js serverless functions under `api/`. They share:

- `api/_lib/env.ts` — centralised env var access
- `api/_lib/db.ts` — service-role Supabase client factory
- `api/_lib/cache.ts` — in-process TTL cache (swappable for Redis)
- `api/_lib/response.ts` — standard `{ ok, data/error, code }` response shape
- `api/_lib/intelligence-service.ts` — market intelligence with 5-min cache

No function creates its own Supabase client — all use `getServiceDb()` from `api/_lib/db.ts`.

### 4.2 Intelligence service

```
DB views (v_market_rates, v_request_patterns, v_acceptance_intelligence, v_market_competitiveness)
  → IntelligenceService.fetch()     ← all 4 queries in parallel, one round-trip
  → ServerCache (5-min TTL)
  → /api/intelligence (GET, CDN-cached 5 min)
  → useIntelligence() hook (module-level cache, 5 min)
  → Claude prompts (injected as context)
  → UI components (MarketTile, SmartInsightsFeed, etc.)
```

---

## 5. Database architecture

### 5.1 Schema isolation

Three Postgres schemas provide hard security boundaries:

| Schema | Purpose | Accessible by |
|---|---|---|
| `public` | Client data, requests, bids, audit | Authenticated clients via RLS |
| `institution` | Institution data, bids, approvals | Institution members via RLS |
| `admin` | Platform config, overrides | Admin users only |

No cross-schema queries from client code — each schema has its own Supabase client.

### 5.2 Row Level Security

Every table has RLS enabled. Key policies:

- Clients can only read/write their own rows (`auth.uid() = client_id`)
- Institutions can only see marketplace requests (anonymised view, not raw client data)
- Institution members can only see data for their own institution
- Service role bypasses RLS — used only in serverless functions

### 5.3 Key tables

See [DATABASE.md](DATABASE.md) for the full data dictionary.

**Critical paths:**

```
Client posts request:
  public.requests ← INSERT (status: open)
  public.audit_events ← INSERT

Institution bids:
  institution.institution_bids ← INSERT (via submit_for_approval RPC)
  institution.pending_actions  ← INSERT (maker-checker queue)
  institution.audit_events     ← INSERT

Second admin approves:
  institution.pending_actions  ← UPDATE (status: approved)
  institution.institution_bids ← INSERT (actual bid)

Client accepts bid:
  public.bid_acceptances ← INSERT
  public.requests        ← UPDATE (status: closed)
  public.audit_events    ← INSERT
```

### 5.4 Maker-checker enforcement

All material institution actions (bid submission, bid withdrawal, product changes) go through a maker-checker workflow enforced entirely in Postgres:

1. Maker calls `submit_for_approval(category, payload)`
2. `pending_actions` row is inserted with `action_status = pending`
3. Second admin calls `approve_action(action_id)` — Postgres checks `approver ≠ maker`
4. On approval, the payload is executed and the result is inserted into the target table

This is a compliance requirement for FSC-regulated institutions.

---

## 6. Security architecture

### 6.1 Authentication

- Supabase Auth with email/password
- JWT signed by Supabase, validated on every DB request
- Custom `storageKey: "ficium-auth"` to isolate the session cookie
- Role determined by `get_my_role()` Postgres RPC (not stored in the JWT)

### 6.2 Data anonymisation

Clients' identities are never exposed to institutions in the marketplace. Institutions see:

- `client_ref` — first 8 chars of UUID (not reversible)
- Financial indicators — income range, health score, risk score
- Request details — product type, amount, term
- No name, email, address, phone, or NIC number

### 6.3 Audit trail

Every material action writes to `public.audit_events` or `institution.audit_events`. The audit module (`src/shared/lib/audit.ts`) wraps all writes — never throws, never blocks user flows.

---

## 7. AI architecture

### 7.1 Claude integration

Claude is used for three distinct features:

| Feature | Endpoint | Model | Mode |
|---|---|---|---|
| AI Financial Coach | `/api/chat` | claude-sonnet-4 | Streaming SSE |
| Journey Calculator | `/api/chat?action=journey-calculate` | claude-sonnet-4 | Streaming SSE |
| Market Ask | `/api/chat` | claude-sonnet-4 | Non-streaming |

All Claude calls are server-side. The API key is never exposed to the browser.

### 7.2 Intelligence injection

Before every Claude call, the server fetches the current market intelligence (rates, patterns, winning bids) from `IntelligenceService` and injects it into the system prompt. Claude is instructed to use this data and not invent rates.

### 7.3 User profile injection

For the financial coach, the server fetches the user's `client_profile_view` (income, assets, debts, scores) and includes it in the system prompt. Claude sees real numbers, not generic advice.

---

## 8. Performance architecture

### 8.1 Perceived latency optimisations

| Technique | Where | Effect |
|---|---|---|
| Dashboard prefetch | `AuthContext.fetchUserMeta()` | Profile + requests cached before route renders |
| Stale-while-revalidate | React Query `staleTime` | Instant render from cache, silent refresh |
| Vendor chunk splitting | `vite.config.ts` | Parallel browser downloads |
| Lazy page loading | `app/routes.tsx` | Only load JS for the current page |
| Intelligence cache | Module-level + ServerCache | Zero DB queries for 5 min on intelligence |
| Asset immutable caching | Vercel headers | CDN serves assets forever (hash in filename) |

### 8.2 Query efficiency

- `getMyRequests()` fetches requests + bids in two parallel queries, merges in memory — no N+1
- `IntelligenceService` runs 4 DB queries in parallel via `Promise.all`
- `useIntelligence` has a module-level cache — single fetch per browser session per 5 min

---

## 9. Modularity and extensibility

### 9.1 Adding a new individual feature

1. Create `src/individual/<domain>/`
2. Add `api/<domain>.ts` (Supabase queries), `hooks/use<Domain>.ts` (React Query), `pages/<Page>.tsx`
3. Add query keys to `src/shared/lib/query-keys.ts`
4. Add route to `src/app/routes.tsx`
5. Add navigation item to `BottomNav`

No changes needed to AuthContext, ProtectedRoute, or any shared infrastructure.

### 9.2 Adding a new institution feature

Same pattern under `src/institution/<domain>/`. Use `institutionSupabase` (re-export of `institutionDb`) for all queries.

### 9.3 Adding a new API endpoint

1. Create `api/<name>.ts`
2. Import `Env`, `getServiceDb`, `Response`, `ServerCache` from `api/_lib/`
3. Add to `vercel.json` if special config needed (duration, includes)

### 9.4 Swapping the cache backend (scaling)

Replace `InProcessCache` in `api/_lib/cache.ts` with a Redis/Upstash implementation that exposes the same `get(key, ttlSecs, fetcher)` interface. Zero consumer changes.

---

## 10. Known technical debt

| Item | Impact | Effort | Priority |
|---|---|---|---|
| `InstitutionMarketplace.tsx` — inline `console.error` in catch | Low | Trivial | Low |
| `audit.ts` — `toActionCategory` maps many events to `"request.submit"` (wrong) | Medium | Small | Medium |
| `calcHealth.ts` vs `computeHealthScore` in `dossier.ts` — two health calculation functions | Medium | Small | Medium |
| No integration tests on the maker-checker RPC flow | High | Large | High |
| No end-to-end test for the request → bid → accept flow | High | Large | High |
| `intelligence.ts` module-level cache is not shared across React renders in StrictMode (double fetch) | Low | Small | Low |

See [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) for the full audit.
