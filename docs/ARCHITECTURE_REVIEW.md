# Ficium — Architecture Review

_Last reviewed: June 2026 · Post-refactor audit_

---

## 1. Executive summary

Ficium is in strong shape for its stage. The hard-to-retrofit foundations are present: single auth session, schema-isolated RLS, maker-checker enforcement, append-only audit trail, and feature-folder structure. The main risks are consistency issues — two health calculation implementations, stale `toActionCategory` mappings, and no automated tests on the maker-checker critical path.

---

## 2. What is strong ✓

- **Single Supabase client factory** — one `GoTrueClient`, no session divergence, no RLS 403s from secondary clients. Null-storage adapter on schema clients is the correct pattern.
- **Schema isolation** — `public / institution / admin` as true Postgres schema boundaries with RLS. Not just table prefixes.
- **Maker-checker** — enforced in Postgres (`submit_for_approval → approve_action`, maker ≠ checker). Cannot be bypassed from application code.
- **Append-only audit log** — `audit.ts` never throws, never blocks user flows.
- **Feature-folder structure** — `individual/`, `institution/`, `admin/` contain their domain completely. Cross-domain coupling is explicit and minimal.
- **React Query discipline** — `staleTime` set on every query, mutations invalidate correctly, dashboard data prefetched at login.
- **Shared utilities** — `format.ts`, `errors.ts`, `query-keys.ts` provide single definitions for all cross-cutting concerns.
- **API layer** — `_lib/` shared utilities (env, db, cache, response, intelligence) used consistently. No route creates its own Supabase client.
- **Code splitting** — four vendor chunks + lazy pages. CDN-immutable asset caching.

---

## 3. Issues resolved in this refactor ✓

| Issue | Fix |
|---|---|
| `formatMUR` defined in 3 files | Consolidated to `shared/lib/format.ts` |
| `formatProductType` defined in 2 files | Consolidated to `shared/lib/format.ts` |
| Duplicate `RequestChat.tsx` in institution and shared | Institution copy deleted |
| `KycSection` inline `createClient()` | Replaced with shared `supabase` singleton |
| Multiple `GoTrueClient` warnings | Null-storage adapter on schema clients |
| 403 on `client_goals` | Token injection via fetch interceptor on schema clients |
| Dashboard name/requests slow to load | `AuthContext` prefetches profile + requests on role confirmation |
| Debug `console.log` in production | Removed from markets API and KYC provider |
| `HowItWorks` naming conflict | Inline version renamed to `HowItWorksSection` |

---

## 4. Remaining technical debt

### 4.1 Two health calculation functions (Medium priority)

`src/individual/onboarding/utils/calcHealth.ts` (`calcHealth`) and `src/individual/onboarding/api/dossier.ts` (`computeHealthScore`) both calculate a health score. They use slightly different logic. Only `computeHealthScore` is written to the database; `calcHealth` is for the live UI preview.

**Risk:** scores diverge — the preview shows 75, the saved score is 68.
**Fix:** `calcHealth` should call `computeHealthScore` from `dossier.ts`, or both should share a pure function from `shared/lib/`.

### 4.2 `toActionCategory` mapping (Medium priority)

In `audit.ts`, `toActionCategory` maps many events to `"request.submit"` as a fallback — including `login` and `logout`. These categories are wrong.

**Risk:** audit queries by category return incorrect results.
**Fix:** Add correct category mappings for all event types.

### 4.3 No automated tests on maker-checker (High priority)

The maker-checker flow (`submit_for_approval → approve_action`) is the core compliance control for institution bids. It has no automated tests.

**Risk:** a Postgres function change silently breaks the enforcement.
**Fix:** Supabase local + pgTAP tests for: maker-checker enforcement, expiry, self-approval rejection.

### 4.4 Intelligence module-level cache in StrictMode (Low priority)

`src/shared/lib/intelligence.ts` uses a module-level `_cache` variable. In React StrictMode (dev), effects run twice — this means two fetches fire on mount. In production this doesn't occur.

**Fix:** migrate intelligence to React Query (already used everywhere else).

### 4.5 `console.error` in `InstitutionMarketplace` catch block (Low priority)

```typescript
} catch (e) { console.error(e); }
```

**Fix:** Use `getErrorMessage(e)` and surface to the user via a toast or error state.

---

## 5. What to build next

In priority order:

1. **Tests** — Postgres function tests for maker-checker, API route smoke tests
2. **Health score consolidation** — one function, two callers
3. **Audit category mapping** — correct all event → category mappings
4. **Error boundary on bid submission** — surface errors instead of `console.error`
5. **Intelligence as React Query** — removes the module cache, works in StrictMode
