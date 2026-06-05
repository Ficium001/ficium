# Ficium — Technical Guide

_For engineers working on the codebase._

---

## 1. Stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 19 |
| Language | TypeScript | 6 |
| Routing | React Router | 7 |
| Server state | TanStack Query | 5 |
| Forms | React Hook Form + Zod | 7 / 4 |
| Styling | Tailwind CSS | 3 |
| Backend | Supabase (Postgres + Auth + Realtime) | 2.105 |
| AI | Anthropic Claude | claude-sonnet-4 |
| Serverless | Vercel | — |
| Build | Vite | 8 |

---

## 2. Development setup

```bash
git clone https://github.com/Ficium001/ficium
cd ficium
npm install
cp .env.example .env    # fill in Supabase URL and publishable key
npm run dev             # starts at http://localhost:5173
```

For API development (Claude, KYC, etc.) you need:

```
# .env.local (server-side, Vercel env vars)
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
```

Run locally with Vercel CLI:

```bash
npm i -g vercel
vercel dev    # starts at http://localhost:3000, proxies API routes
```

---

## 3. Code conventions

### 3.1 TypeScript

- `strict: true` is on. No `any` except in legacy DB adapter code
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on)
- Prefer `unknown` over `any` in new code

### 3.2 Imports

Use path aliases everywhere — never relative `../../../`:

```typescript
// ✓ correct
import { supabase } from "@/shared/lib/supabase";
import { formatMUR } from "@/shared/lib/format";

// ✗ wrong
import { supabase } from "../../../shared/lib/supabase";
```

### 3.3 Query keys

Always use `QK` from `@/shared/lib/query-keys` — never inline arrays:

```typescript
// ✓ correct
import { QK } from "@/shared/lib/query-keys";
useQuery({ queryKey: QK.profile, queryFn: getProfileSummary });

// ✗ wrong
useQuery({ queryKey: ["profile"], queryFn: getProfileSummary });
```

### 3.4 Error handling

Use `FiciumError` and `toFiciumError` from `@/shared/lib/errors`:

```typescript
import { toFiciumError, getErrorMessage } from "@/shared/lib/errors";

try {
  await doSomething();
} catch (err) {
  const ficiumErr = toFiciumError(err);
  setError(ficiumErr.userMessage); // safe to display to user
}
```

### 3.5 Formatting utilities

All display formatting lives in `@/shared/lib/format`. Never define `formatMUR`, `formatProductType` etc. locally:

```typescript
import { formatMUR, formatProductType, formatRate, formatDistanceToNow } from "@/shared/lib/format";
```

### 3.6 Supabase clients

Use the right client for each schema. Never call `createClient` directly outside `shared/lib/supabase.ts`:

```typescript
import { supabase }      from "@/shared/lib/supabase"; // public schema
import { institutionDb } from "@/shared/lib/supabase"; // institution schema
import { adminDb }       from "@/shared/lib/supabase"; // admin schema
import { db }            from "@/shared/lib/supabase"; // db("institution")
```

### 3.7 Audit logging

Call `audit.*` for every material user action. Never skip audit calls:

```typescript
import { audit } from "@/shared/lib/audit";

// After creating a request:
await audit.requestCreated(data.id, input.amount, input.productType);

// After accepting a bid:
await audit.bidAccepted(bidId, requestId);
```

---

## 4. Feature module pattern

Every feature follows this structure:

```
src/individual/requests/
├── api/
│   └── requests.ts        # Supabase queries — no React, pure async functions
├── hooks/
│   └── useRequests.ts     # React Query wrappers — useQuery, useMutation
├── pages/
│   ├── Requests.tsx       # Page component (route target)
│   ├── NewRequest.tsx
│   └── RequestDetail.tsx
└── types/                 # (optional) domain-specific types
```

Rules:
- `api/` files are pure TypeScript — no React, no hooks
- `hooks/` files wrap `api/` functions in React Query
- `pages/` are route targets — they compose hooks and components
- `components/` are reusable UI within the domain

---

## 5. Adding a feature

### Individual feature example: Notifications

```bash
mkdir -p src/individual/notifications/{api,hooks,pages}
```

**`api/notifications.ts`:**
```typescript
import { supabase } from "@/shared/lib/supabase";

export async function getNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

**`hooks/useNotifications.ts`:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/shared/lib/query-keys";
import { getNotifications } from "../api/notifications";

export function useNotifications() {
  return useQuery({
    queryKey: QK.notifications,
    queryFn:  getNotifications,
    staleTime: 60_000,
  });
}
```

**Add to `QK` in `query-keys.ts`:**
```typescript
notifications: ["notifications"] as const,
```

**Add route in `routes.tsx`:**
```typescript
const Notifications = lazy(() => import("../individual/notifications/pages/Notifications"));
// ...
{ path: "/notifications", element: <ClientOnlyRoute><S><Notifications /></S></ClientOnlyRoute> },
```

---

## 6. UI component system

Shared UI components live in `src/shared/ui/`. Always use these before creating a new one:

| Component | Usage |
|---|---|
| `Button` | All buttons — variants: primary, secondary, ghost, danger |
| `Card` | Container cards |
| `Input` | Text inputs |
| `Select` | Dropdowns |
| `Field` | Form field with label + error |
| `BottomNav` | Mobile bottom navigation |

Import from the barrel:
```typescript
import { Button, Input, Field, BottomNav } from "@/shared/ui";
```

### Design tokens (Tailwind)

| Token | Value | Use |
|---|---|---|
| `ficium` | `#2A1FE6` | Primary brand blue |
| `ficium-deep` | `#1A14A8` | Hover state |
| `ink` | `#0A0A1A` | Primary text |
| `cream` | `#FAF7F0` | Page background |
| `muted` | `#6B6B85` | Secondary text |
| `accent` | `#FFD84D` | Highlight yellow |
| `mint` | `#7DF9C5` | Success green |
| `peach` | `#FF9F7A` | Warning orange |

Typography:
- `font-display` — Bricolage Grotesque (headings)
- `font-body` — Inter Tight (body)

---

## 7. Testing strategy

No automated tests exist yet. The priority order for adding them:

1. **Postgres function tests** — `get_my_role`, `submit_for_approval`, `approve_action` maker-checker enforcement
2. **API route tests** — `/api/intelligence` response shape, `/api/chat` error handling
3. **Integration tests** — request → bid → accept flow end-to-end
4. **Component tests** — BidModal, NewRequest wizard

Recommended framework: Vitest (already in the Vite ecosystem) + React Testing Library + Supabase local for DB.

---

## 8. Deployment

### Automatic (push to main)

Every push to `main` triggers a Vercel deployment. No manual steps.

### Environment variables

Set in Vercel dashboard under Settings → Environment Variables:

| Variable | Environment |
|---|---|
| `VITE_SUPABASE_URL` | All |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
| `ANTHROPIC_API_KEY` | Production, Preview |
| `RESEND_API_KEY` | Production, Preview |

### Database migrations

```bash
# Apply to production
supabase db push --linked

# Apply to local dev
supabase db reset
```

---

## 9. Common tasks

### Invalidate a cache key after a mutation

```typescript
const qc = useQueryClient();
qc.invalidateQueries({ queryKey: QK.requests.all }); // invalidates all requests
qc.invalidateQueries({ queryKey: QK.requests.list }); // only list
qc.invalidateQueries({ queryKey: QK.requests.detail("abc") }); // only one
```

### Add a new product type

1. Add to `ProductType` union in `src/individual/requests/api/requests.ts`
2. Add to `PRODUCTS` array in `src/individual/requests/pages/NewRequest.tsx`
3. Add to `formatProductType` map in `src/shared/lib/format.ts`
4. Add to `GOAL_TYPE_ROUTE` in `src/individual/dashboard/api/goals.ts` if needed
5. Add to `product_type` enum in Supabase (migration)

### Add an audit event type

1. Add to `AuditEventName` union in `src/shared/lib/audit.ts`
2. Add a convenience wrapper to the `audit` object
3. Update `toActionCategory()` mapping

---

## 10. Performance checklist

Before shipping a new page/feature:

- [ ] Queries have `staleTime` set explicitly
- [ ] No N+1 — aggregation done in memory or via SQL, not per-row fetches
- [ ] Large lists have `.limit()` applied
- [ ] New query keys added to `query-keys.ts`
- [ ] No `console.log` or `console.error` left in production code
- [ ] Page is wrapped in `<S>` (Suspense + ChunkErrorBoundary) in `routes.tsx`
- [ ] Heavy data loaded only when the user navigates to that page (not eagerly)
