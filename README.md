# Ficium

> **Reverse-banking marketplace for Mauritius.** Clients post anonymised financial requests; FSC-licensed institutions compete with bids. The client picks the winner.

**Production:** [ficium.vercel.app](https://ficium.vercel.app) · **Stack:** React 19 · TypeScript · Supabase · Vercel · Tailwind

---

## Quick start

```bash
npm install
cp .env.example .env          # fill in your Supabase credentials
npm run dev                   # http://localhost:5173
npm run build                 # type-check + production bundle
```

### Required environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — Vercel env vars |
| `ANTHROPIC_API_KEY` | Claude AI (server-side) |
| `RESEND_API_KEY` | Transactional email |

---

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture, design decisions, constraints |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user guide for individuals and institutions |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Developer guide — code conventions, adding features |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, RLS policies, migrations, data dictionary |
| [docs/API.md](docs/API.md) | All API endpoints — request/response shapes |
| [docs/SCALING.md](docs/SCALING.md) | Growth path — when to add what infrastructure |
| [docs/SCHEMA_REFERENCE.sql](docs/SCHEMA_REFERENCE.sql) | Executable schema reference and inspection queries |

---

## Architecture at a glance

Three role-gated apps in one React SPA, backed by three isolated Postgres schemas with RLS.

```
Browser (React SPA)
  ├── /                   → Marketing (public)
  ├── /dashboard          → Individual client app
  ├── /institution        → Institution portal
  └── /admin              → Admin panel

Vercel Edge / Serverless
  └── /api/*              → Claude AI, Intelligence, KYC, Markets

Supabase (Postgres + Auth + Realtime + Storage)
  ├── public schema       → clients, requests, bids, audit
  ├── institution schema  → institutions, members, products, bids
  └── admin schema        → config, overrides
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

---

## Roles

| Role | Entry point | Auth |
|---|---|---|
| `client` | `/login` → `/dashboard` | Supabase email/password |
| `bank` | `/institution/login` → `/institution` | Same auth, different role |
| `admin` | `/admin` | Same auth, `admin` role |

Role is determined at sign-in via the `get_my_role()` Postgres RPC and cached in `AuthContext`.
