# Ficium — Architecture Review

_Last reviewed: June 2026 · Reviewer: engineering audit_

This document is an honest assessment of the codebase against four stated
objectives: **modularity**, **enterprise-grade architecture**, **performance at
scale**, and **ease of change**. It records what is strong, what needs work, and
a prioritised action list. It is meant to be a living document — update it as
items are closed.

---

## 1. Executive summary

Ficium is in good shape for its stage. The foundations are sound: a single
unified Supabase client factory, three isolated Postgres schemas with RLS, a
maker-checker workflow for material institution actions, an append-only audit
log, and a feature-folder frontend structure. Most of the "enterprise"
groundwork that is genuinely hard to retrofit later (security boundaries, audit,
schema isolation) is already present.

The main risks are not in the infrastructure — they are in **consistency**:
duplicated domain logic, a few oversized page components, and conventions that
are documented but were not enforced in code. None of these are emergencies.
They are the kind of debt that compounds quietly, so the right time to address
them is now while the surface area is still small.

A note on the "1 billion users" goal — see [SCALING.md](./SCALING.md). In short:
the architecture can grow a long way, but the realistic bottleneck for a
Mauritius / Indian-Ocean banking marketplace is Postgres and compliance
throughput, not the React frontend, and **prematurely building for a billion
users would directly harm the "ease of change" goal**. The recommendation is to
build clean, measurable foundations and scale the database deliberately, not to
adopt hyperscale patterns the product does not yet need.

---

## 2. What is strong (keep doing this)

- **Single Supabase client factory** (`src/shared/lib/supabase.ts`). One auth
  session shared across schema-scoped clients. This already fixed a class of
  RLS bugs. Good.
- **Schema isolation** — `public`, `institution`, `admin` as separate Postgres
  schemas with RLS on every table. This is a real security boundary, not just
  table prefixes.
- **Maker-checker** on material institution actions (`submit_for_approval` →
  `approve_action`, maker ≠ checker enforced). This is exactly what an FSC-
  regulated marketplace needs and is hard to bolt on later.
- **Append-only audit log** for compliance.
- **Feature-folder structure** — `individual/`, `institution/`, `admin/` keep
  the three apps cleanly separated, and the new `markets/` module is a good
  template for how every feature should look (types → config → api → hooks →
  components → pages).
- **Server-held secrets** — AWS/KYC keys live in Vercel serverless functions,
  never in the browser bundle. Correct.
- **Build is type-strict** — `noUnusedLocals`, `noUnusedParameters`. This caught
  real issues during this review.

---

## 3. Findings and corrections

Ordered by priority. ✅ = fixed in this review; ⏳ = recommended, not yet done.

### ✅ F1 — No path aliases (ease of change)

**Was:** imports reached three levels deep (`../../../shared/lib/supabase`), and
both the README and the `supabase.ts` header comment referenced an `@/` alias
that **was never actually configured**. Moving any file broke its imports.

**Fixed:** added `paths: { "@/*": ["./src/*"] }` to `tsconfig.app.json` and a
matching `resolve.alias` in `vite.config.ts`. New code imports from
`@/shared/lib/supabase`. Existing relative imports still work, so this is
additive and safe — files can be migrated opportunistically.

**Convention going forward:** all new imports across feature boundaries use
`@/`. Relative imports are only for siblings within the same folder.

### ⏳ F2 — Duplicated "requests" domain (modularity / single source of truth)

There are **two** implementations of the requests domain:

- `src/modules/requests/` — used by the dashboard (`useDashboard.ts`). Fetches
  requests + bids in one nested query (good, fixed an N+1).
- `src/individual/requests/api/requests.ts` — used by the requests pages. Has a
  **different** `RequestStatus` type (3 values vs 5 in `modules`).

This is the highest-value structural cleanup. Two sources of truth for the same
entity means a status added in one place silently disagrees with the other.

**Recommended migration (do with care, no test suite yet):**
1. Pick `src/individual/requests/` as the canonical home (it is where the
   feature lives; `modules/` is a legacy location).
2. Move the nested-query `getMyRequests` from `modules/requests/api.ts` into the
   canonical api, keeping the superior single-round-trip query.
3. Unify the `RequestStatus` / `ProductType` types in one place and import them
   everywhere.
4. Point `useDashboard.ts` at the canonical hooks.
5. Delete `src/modules/requests/` and `src/modules/notifications/` once nothing
   imports them.

Until then, this file documents the divergence so no one trusts the wrong copy.

### ⏳ F3 — Multiple GoTrueClient instances (correctness at the edges)

`db(schema)` calls `createClient()` once per schema, each with the **same**
`storageKey: "ficium-auth"`. Supabase will warn _"Multiple GoTrueClient
instances detected"_ and, in rare races, two instances can disagree about
session state. It currently works because they share the storage key, but the
intended pattern is **one** auth client whose session the schema clients reuse.

**Recommended:** create one auth-owning client, then build schema clients with
`auth: { persistSession: false, autoRefreshToken: false }` and inject the
session, or use a single client and pass `{ db: { schema } }` per-query where
the SDK supports it. Low urgency; revisit if auth races appear in logs.

### ⏳ F4 — Oversized page components (ease of change)

Several pages exceed 600 lines:

| File | Lines |
|------|-------|
| `individual/onboarding/pages/Dossier.tsx` | 841 |
| `individual/dashboard/pages/Dashboard.tsx` | 824 |
| `features/marketing/pages/Splash.tsx` | 817 |
| `individual/dashboard/pages/Profile.tsx` | 671 |
| `institution/marketplace/pages/InstitutionMarketplace.tsx` | 656 |
| `admin/pages/FiciumAdminPanel.tsx` | 600 |

These mix data orchestration, business logic, and presentation in one file —
the exact pattern the `markets/` rebuild moved away from. They are not broken,
but they are hard to change safely. **Refactor them one at a time** using the
markets module as the template (extract `components/`, `hooks/`, `config/`).
Doing all six at once is risky; doing them opportunistically as you touch each
feature is safe.

### ✅ F5 — Mixed folder conventions (modularity)

**Was:** `src/lib/` and `src/shared/lib/` coexisted with overlapping purpose.
`src/lib/` held `intelligence.ts`, `intelligence-types.ts`, and `claude.ts`.
`src/shared/lib/` held `supabase.ts`, `auth.ts`, `audit.ts`, and `tokens.ts`.
All six are frontend shared utilities — two homes for one concept.

**Fixed:** moved `claude.ts`, `intelligence.ts`, `intelligence-types.ts` into
`src/shared/lib/`. `src/lib/` deleted. Updated all import sites including
`api/_lib/intelligence-service.ts`. Deleted dead `tokens.ts` (zero importers,
duplicated tailwind.config.js values with no consumers).

`src/shared/lib/` is the single home for all cross-cutting frontend libraries.

### ✅ F6 — `institution` bundle was 577 kB (performance / load speed)

**Root cause:** `vite.config.ts` had a `manualChunks` rule bundling everything
in `src/institution/` together — including `@supabase/js` (196 kB raw),
`lucide-react` + `react-hook-form` + `zod` (122 kB raw), and all institution
pages regardless of route. `chunkSizeWarningLimit: 600` was suppressing the
warning rather than fixing the cause.

**Fixed:** removed the manual chunk rule. Vite now splits institution routes by
lazy-import boundary. `vendor-supabase` (50 kB gz) and `vendor-ui` (37 kB gz)
are now cached once and shared. Each institution page loads 2–7 kB gz instead
of 155 kB gz. `chunkSizeWarningLimit` lowered to 400.

---

## 4. Priority order

1. ✅ **F1 — path aliases**
2. ✅ **F2 — requests de-duplication** (split-cache bug fixed, modules/ deleted)
3. ✅ **F4 — all 6 large pages split** (4410 lines → 797 lines across page files)
4. ✅ **F5 — lib/ consolidation** (src/lib/ deleted, all in shared/lib/)
5. ✅ **F6 — institution bundle** (576kB chunk eliminated, natural lazy splitting)
6. ⏳ **F3 — GoTrueClient pattern** — deferred: auth works; risk > reward without test suite.

---

## 5. What was explicitly _not_ done, and why

- **No blanket rewrite of the 17k-line codebase.** There is no automated test
  suite, and the app is live. Large speculative refactors without tests are how
  fintech apps break in production. The disciplined path is incremental,
  verified change — each item above is independently shippable.
- **No hyperscale infrastructure** (sharding, event sourcing, CQRS, microservices).
  The product does not need it and adding it now would slow every future change.
  See [SCALING.md](./SCALING.md) for the staged plan that matches real growth.
