# Ficium (consumer app) — Deployment Topology

_Last updated: 24 June 2026_

The public reverse-banking marketplace. React 19 SPA plus Vercel serverless
functions, backed by Supabase. This is the consumer side; the institution side
is `ficium-portal`. The two are separate frontends over separate data stores
that meet at the marketplace.

```
                         Internet
                            │  443
                            ▼
              ┌──────────────────────────────┐
              │      Vercel (ficium)          │
              │                              │
              │  React 19 SPA (Vite/Tailwind)│
              │  /api/* serverless functions │
              │    • Claude (ANTHROPIC_API_KEY)
              │    • email (RESEND_API_KEY)   │
              │    • service-role DB ops      │
              └───────┬───────────────┬──────┘
                      │ anon key (RLS)│ service role (server only)
                      ▼               ▼
              ┌──────────────────────────────┐
              │     Supabase (consumer)       │
              │  Postgres + Auth + Edge Fns   │
              │  marketplace_sync schema      │
              └───────────────┬──────────────┘
                              │  marketplace requests/bids
                              ▼  (cross-project reads)
              ┌──────────────────────────────┐
              │  ficium-portal-api / Portal   │
              │  (institution side reads here)│
              └──────────────────────────────┘

  Trust boundaries:
   • Browser → SPA: only the anon/publishable key ships; all access is RLS-gated.
   • SPA → /api/*: server-only secrets (service role, Claude, Resend) never
     reach the client; they live in Vercel env vars.
   • Consumer Supabase → Portal: the Portal reads marketplace data cross-project;
     consumer PII stays in the consumer project.
```

## Components
| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 19 · TypeScript · Vite · Tailwind | SPA, deployed on Vercel |
| Server functions | Vercel `/api/*` | hold service-role + third-party secrets |
| Data | Supabase Postgres + Auth + Edge Functions | `marketplace_sync` schema; RLS enforced |
| AI / email | Claude API, Resend | server-side only |

## Environments & secrets
Client-safe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
Server-only (Vercel env): `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`RESEND_API_KEY`. The service-role key must never be exposed to the browser.

## CI/CD
`.github/workflows/`: `ci.yml` (validate), `deploy.yml` (release), `keepalive.yml`.
Vercel auto-deploys on push to `main`; commits must be authored
`kishan.jeebun@ficium.net` or Vercel rejects the deploy.

See `docs/ARCHITECTURE.md` for module/internal structure and `docs/SCALING.md`
for the scaling plan.
