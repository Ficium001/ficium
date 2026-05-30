# Ficium 3

Reverse-banking marketplace for Mauritius. Clients post anonymized financial requests;
licensed institutions compete with bids.

**Production:** [ficium.vercel.app](https://ficium.vercel.app)

---

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build
```

Required environment variables (`.env`):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

---

## Architecture at a glance

Three role-gated apps in one React SPA, backed by three isolated Postgres schemas.

| App | Route | Role | Schema |
|-----|-------|------|--------|
| Individual / business client | `/dashboard` | `client` | `public` |
| Institution portal | `/institution` | `bank` | `institution` |
| Admin console | `/admin` | `admin` | `admin` |

- **Stack:** React 19 · TypeScript · Vite · Tailwind · TanStack Query · Supabase
- **Auth:** Supabase GoTrue; role read from `public.users` (not JWT)
- **Data clients:** one unified factory in `src/shared/lib/supabase.ts` — never call
  `createClient()` directly
- **Security:** RLS on every table + maker-checker on every material institution action
- **Audit:** append-only WORM log for FSC Mauritius compliance

---

## Documentation

The complete A–Z technical reference lives in [`/docs`](./docs):

| Document | Contents |
|----------|----------|
| `FICIUM_DOCUMENTATION.md` | Full reference: architecture, data dictionary, RLS, RPCs, flows, runbook, glossary (27 sections) |
| `SCHEMA_REFERENCE.sql` | Executable schema reference + live-DB inspection queries |

Database migrations are in [`/database`](./database), run in numbered order.

---

## Repository layout

```
src/
  app/          route table + guards
  shared/       supabase factory, auth, ui primitives, design tokens
  features/     cross-cutting auth + marketing pages
  individual/   client app (dashboard, requests, advisor, alerts)
  business/     business registration
  institution/  institution portal (dashboard, marketplace, bids, ...)
  admin/        platform admin console
api/            Vercel serverless functions (Claude AI advisor)
database/       SQL migrations
docs/           technical documentation
```

See `docs/FICIUM_DOCUMENTATION.md` §4 for the full annotated tree.

---

## Key conventions

- **Supabase clients:** import `supabase`, `institutionDb`, `adminDb`, or `db(schema)`
  from `src/shared/lib/supabase.ts`. One auth session is shared across all schemas.
- **Institution types:** all in `src/institution/types/institution.ts` — never scatter.
- **Maker-checker:** material actions call `submit_for_approval()`; a second admin
  approves via `approve_action()` (maker ≠ checker enforced).
- **Design:** cream background, white cards, `ficium` indigo. No dark theme. Tokens in
  `tailwind.config.js` / `src/shared/lib/tokens.ts`.
