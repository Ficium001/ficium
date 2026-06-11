# Ficium — Code Review & Architecture Report

_Review date: June 2026 · Scope: `ficium`, `ficium-portal`, `ficium-rating-engine`, `ficium-auth`, `ficium-infra`_

This document consolidates a full review pass across the five Ficium repositories: what was changed, why, the severity of each finding, the open items, and an assessment of the overall architecture. It is meant to be the single tracking artifact through merge.

---

## 1. At a glance

| Area | Result |
|------|--------|
| Pull requests opened | 6 |
| New packages created | 1 (`ficium-shared`) |
| Repos touched | 4 of 5 |
| Highest-severity finding | Missing auth + IDOR on serverless API routes (**critical**) |
| Dead code removed | 11 files, ~2,400 LOC |
| Build status after changes | `tsc --noEmit` clean · `vite build` passes on every change |

**One action is still outstanding and urgent:** the GitHub personal access token shared at the start of this review is live with admin access to all repos. Revoke it at `github.com/settings/tokens` and issue a replacement.

---

## 2. Pull requests & deliverables

| # | Repo | Title | Type | Severity |
|---|------|-------|------|----------|
| [#2](https://github.com/Ficium001/ficium/pull/2) | ficium | Caller auth + IDOR guards on serverless API routes | Security | **Critical** |
| [#4](https://github.com/Ficium001/ficium/pull/4) | ficium | Auth-gate all KYC endpoints + replace public admin secret | Security | **Critical** |
| [#1 (engine)](https://github.com/Ficium001/ficium-rating-engine/pull/1) | rating-engine | Require API key on `/rate` + lock down CORS | Security | **High** |
| [#3](https://github.com/Ficium001/ficium/pull/3) | ficium | Organize `database/` scripts + revoke anon grant on profile view | Hygiene + Security | Medium |
| [#1 (portal)](https://github.com/Ficium001/ficium-portal/pull/1) | portal | Untrack committed `.env.local` | Hygiene | Low |
| [#1](https://github.com/Ficium001/ficium/pull/1) | ficium | Remove dead code (11 orphan files) | Cleanup | Low |
| [ficium-shared](https://github.com/Ficium001/ficium-shared) | new | Shared UI + utilities package (`@ficium/shared`) | Modularity | — |

### Merge order

PR #4 targets the **#2 branch**, not `main`, because it builds on the `api/_lib/auth.ts` helper introduced in #2. Merge **#2 before #4**, or retarget #4 to `main` after #2 lands. The other PRs are independent and can merge in any order.

---

## 3. Security findings (detail)

### 3.1 Missing auth + IDOR on serverless routes — *Critical* — PR #2

Several `ficium/api/*` handlers ran with the Supabase **service-role key**, which bypasses all Row-Level Security, while performing **no verification of the calling user**. Two of them (`chat.ts`, `rate-applicant.ts`) trusted a `userId`/`client_id` supplied in the request body, so any authenticated user could read another user's financial profile or trigger a credit rating for an arbitrary client — a classic Insecure Direct Object Reference.

Fix: a shared `api/_lib/auth.ts` providing `requireUser` (validates the Supabase token, fails closed with 401), `requireOwnership` (403 on id mismatch), and `requireService` (shared-secret gate for internal callers). Applied to `chat`, `intelligence`, `market`, `request-builder`, `rate-applicant`. A frontend `apiFetch/apiPost/apiGet` wrapper now attaches the Bearer token, and every browser caller was converted.

### 3.2 Unauthenticated KYC endpoints + cosmetic admin gate — *Critical* — PR #4

All seven `/api/kyc-*` endpoints were reachable with no caller verification. `kyc-admin-faces` appeared protected but checked `VITE_ADMIN_SECRET` — a **build-time variable shipped inside the browser bundle**, readable by anyone who opens devtools. This "gate" sat in front of an endpoint that deletes biometric face data.

Fix: a new `requireAdmin` helper verifies the JWT then checks `admin.admin_users (id = auth.uid() AND active)` — the same source of truth the database RLS policies already use. Endpoints were gated by role: user endpoints (`kyc-verify`, `kyc-faces`, `kyc-liveness`) get `requireUser` plus ownership checks; admin endpoints (`kyc-admin-faces`, `kyc-settings`, `kyc-notify`) get `requireAdmin`; the one-time `kyc-setup` bootstrap gets `requireService`. The admin branch logic was unit-tested (no-token → 401, bad-token → 401, non-admin → 403, admin → allow).

### 3.3 Open rating engine `/rate` — *High* — rating-engine PR #1

`POST /rate` had no authentication and `CORS allow_origins=["*"]`. Anyone able to reach the service could run credit ratings against it. Fix: `/rate` now requires `X-API-Key` matching `RATING_ENGINE_API_KEY` (fails closed, constant-time compare); CORS origins come from an env allowlist defaulting to deny-all (it is a server-to-server API). Runtime-tested: 401 no-key, 401 bad-key, 200 good-key, 200 health.

### 3.4 `anon` grant on `client_profile_view` — *Medium* — PR #3

The view exposes PII (email, address, income, net worth, PEP status, risk scores) and is `security_invoker=false`, so it bypasses RLS on its base tables. `FIX_VIEW_GRANTS.sql` granted it `TO anon`. **Not currently exploitable** — the view ends with `WHERE c.id = auth.uid()`, and for an anon caller `auth.uid()` is NULL, so it returns zero rows. But the entire protection rests on that one line while the grant buys nothing, so a hardening migration revokes it (defense-in-depth against a future view recreation dropping the clause).

### 3.5 Committed `.env.local` — *Low* — portal PR #1

The portal's Supabase URL + anon key were committed. The anon key is public-by-design, so risk is low if RLS is solid, but env files should never be tracked. Untracked and added to `.gitignore`. The value remains in git history; rotating it in the Supabase dashboard is optional hygiene.

---

## 4. Code quality & structure

### 4.1 Dead code — PR #1

Eleven orphaned files (~2,400 LOC) verified unreferenced by any route or import: unreachable Goals/Journeys pages (routes redirect to `/requests`), superseded dashboard sections, and two unused `shared/lib` utilities. Live hooks and `JourneyWizard` were preserved.

### 4.2 Database script sprawl — PR #3

The `database/` folder had accumulated ~11 loosely-ordered ad-hoc scripts (`FIX_ALL_NOW`, `FIX_ALL_NOW_v2`, `RUN_THIS_IN_SUPABASE`, `FIX_STEP*`) with no way to know what had been applied to production. Nothing was deleted; files were sorted into `archive/` (one-off fixes + diagnostics, do not re-run) and `schema-reference/` (table-defining), with a README naming `supabase/migrations/` as the single source of truth. No migration history was rewritten — the real ordered migrations already exist under `supabase/migrations/v2/` and `v2-phase2/`.

### 4.3 Duplicated shared code — `ficium-shared`

Ten files were byte-identical copies in both `ficium` and `ficium-portal` (`format`, `intelligence`, `intelligence-types`, `env`, and the `Button`/`Card`/`Field`/`Input`/`Select` primitives). They now live once in the `@ficium/shared` package, which builds to `dist` with full type declarations and was verified by installing it into a throwaway `ficium` copy (`tsc` + `vite build` both pass). Adoption is zero-churn via re-export shims. `audit.ts` was deliberately excluded: it is identical across repos but imports each app's own `supabase` client, so it needs a `createAudit(client)` factory rather than a blind copy.

---

## 5. Overall architecture

### 5.1 What Ficium is

A reverse-banking marketplace for Mauritius: clients post anonymised financial requests, FSC-licensed institutions compete with bids, the client picks a winner. Three user groups — individuals, institutions, platform admins — with distinct access patterns.

### 5.2 The live (deployed) architecture

```
   Browser SPAs (React 19 + Vite + TS)
   ┌──────────────┐   ┌──────────────────┐
   │  ficium      │   │  ficium-portal   │
   │  client app  │   │  institution app │
   └──────┬───────┘   └────────┬─────────┘
          │   Supabase JS SDK   │
          ▼                     ▼
   ┌───────────────────────────────────────┐
   │  Supabase                              │
   │  Auth · Postgres (RLS) · Realtime      │
   │  schemas: public / institution / admin │
   └───────────────────────────────────────┘
          ▲
          │  service-role (RLS bypass)
   ┌──────┴───────────────┐      ┌────────────────────────┐
   │ ficium/api/* (Vercel │─────▶│ ficium-rating-engine   │
   │ serverless functions)│ /rate│ (FastAPI, Railway)     │
   │ chat, market, kyc-*, │      └────────────────────────┘
   │ rate-applicant, …    │
   └──────────────────────┘
```

- **Frontends:** Two React 19 / Vite 8 / TypeScript 6 SPAs. Modern stack, TanStack Query for data, route-level code splitting.
- **Backend-of-record:** Supabase — Auth, Postgres with RLS, Realtime. Both apps share one auth model. The schema is well-segmented (`public` / `institution` / `admin`) and the `v2` migration set is genuinely disciplined (backup → create → migrate → verify → swap → drop, with a rollback script).
- **Serverless edge logic:** `ficium/api/*` functions on Vercel for AI features (Claude proxy), market intelligence, and the KYC pipeline (AWS Rekognition). These hold the service-role key — which is exactly why the auth work in §3.1–3.2 was critical.
- **Rating engine:** A standalone FastAPI service (Railway) computing credit ratings from a pillar model. Clean separation; now key-gated.

### 5.3 The architectural fork — *worth a decision*

There is a **second, parallel architecture in the repos that the live apps do not use**:

- `ficium-auth` — a full standalone FastAPI auth service (RS256 JWT, Argon2id, MFA, its own Postgres via asyncpg + Alembic). It is genuinely well-built.
- `ficium-infra` — a self-hosted Docker Compose stack (Caddy reverse proxy, the `auth` service, an `api` service, Redis, self-hosted Postgres).

**Nothing in `ficium` or `ficium-portal` calls `ficium-auth`.** Both frontends authenticate against Supabase. `ficium-auth` and `ficium-infra` are referenced only by each other and by docs. (The `storageKey: "ficium-auth"` in the client is just a localStorage key name — not a reference to the service.)

This means the org is maintaining two divergent auth/identity designs:

1. **Live:** Supabase Auth + RLS + Vercel serverless.
2. **Dormant:** self-hosted FastAPI auth + Docker stack.

For a "bank-grade" target this fork is the single most important architectural decision to resolve, because:
- Two auth systems double the security surface and the chance they drift out of sync.
- The dormant stack implies an intended migration off Supabase (e.g. for data residency / FSC compliance) that hasn't happened — so either it's a roadmap item that should be tracked and resourced, or it's abandoned and should be archived to stop implying a second source of truth.

**Recommendation:** explicitly decide whether `ficium-auth`/`ficium-infra` is (a) the planned production architecture — in which case the migration needs a real plan and the Supabase auth in §3 becomes interim — or (b) deprecated — in which case archive those repos with a clear note, so future readers don't trust two conflicting models.

### 5.4 Strengths

- Modern, coherent frontend stack; no legacy framework debt.
- Disciplined schema segmentation and a real versioned `v2` migration set with rollback.
- A genuinely solid standalone auth service (even if currently dormant).
- Clear separation of the rating engine as its own service.

### 5.5 Risks (post-fix)

| Risk | Status |
|------|--------|
| Service-role serverless routes unauthenticated / IDOR | **Fixed** (PR #2, #4) |
| Rating engine open | **Fixed** (engine PR #1) |
| Two parallel auth architectures | **Open — needs a product/infra decision** (§5.3) |
| `audit.ts` not yet shared | Open — minor (needs `createAudit` factory) |
| Secrets in git history (anon key, `.env.local`) | Low — rotate at leisure |

---

## 6. Required before merging the security PRs

1. **Set environment variables:**
   - `INTERNAL_API_SECRET` — used by `rate-applicant` and `kyc-setup`; the caller must send it as `x-internal-secret`.
   - `RATING_ENGINE_API_KEY` — same value on the engine and in the `ficium` app.
2. **Confirm admin source of truth:** ensure your admin users have rows in `admin.admin_users` with `active = true` (the `requireAdmin` check depends on this).
3. **Test the authenticated runtime paths** — advisor chat, journey calculator, markets, market intelligence, KYC submit, and the admin KYC pages. These were verified to compile and build, but the live token flow could not be exercised during review.
4. **Merge #2 before #4** (§2).

---

## 7. Tracked follow-ups (not done, deliberately)

| Item | Why deferred |
|------|--------------|
| Resolve the two-auth-systems fork (§5.3) | Product/infra decision, not a code change |
| `createAudit(client)` factory to finish deduping `audit.ts` | Needs call-site changes in both apps |
| Adopt `@ficium/shared` in both apps | Depends on git-dep vs registry choice + each app's build |
| Rotate the leaked anon key / `.env.local` value | Low risk; optional hygiene |
| **Revoke the shared GitHub token** | **Do this now** — admin access to all repos |
