# Ficium — Scaling Guide

_How Ficium grows from launch to large scale — and an honest discussion of the
"1 billion users" target._

---

## 1. An honest word on the target

The stated ambition is to support exponential growth "to 1 billion users." It is
worth being clear-eyed about this, because the architecture you should build
depends entirely on the scale you will actually reach.

- Mauritius has roughly **1.3 million** people.
- The broader realistic market — Indian Ocean islands plus the African fintech
  corridors Ficium targets — is on the order of a few hundred million people,
  and a reverse-banking marketplace will capture a **small fraction** of those
  as active users, because most people do not take out loans or deposits
  frequently.
- A wildly successful version of Ficium might reach **single-digit millions** of
  registered users over many years. That would make it one of the most
  successful fintech products in the region.

One billion users is not a realistic planning number for this product, and that
is fine — it does not need to be. **The danger is building for a billion users
you will never have.** Hyperscale patterns (sharding, event sourcing,
microservices, multi-region active-active) add enormous complexity that directly
works against your other stated goal: _"changes should be easy."_ Every one of
those patterns makes every future change slower.

**The right strategy** is to build clean, modular, well-instrumented foundations
that can scale a long way on simple infrastructure, measure where the real
pressure appears, and scale those specific points deliberately. That is what the
current stack (React SPA on a CDN + Supabase/Postgres) already supports, and it
will comfortably take Ficium to millions of users. The sections below are the
staged plan.

---

## 2. Where the bottleneck actually is

A common misconception is that the frontend needs to scale. It does not, in any
meaningful sense:

- The **React SPA is static files** served from Vercel's CDN. Serving it to one
  user or ten million users is the same architecture — the CDN absorbs it. This
  is effectively already "infinitely" scalable for read traffic.
- The **serverless API functions** (`/api/*`) scale horizontally by default on
  Vercel — each request gets its own instance.

The real bottleneck, at every stage, is **the database**: Postgres connections,
query performance, and write throughput on hot tables (`requests`, `bids`,
`notifications`, `audit_events`). Compliance throughput (KYC review, maker-
checker approvals) is a human bottleneck that also matters. Plan around those.

---

## 3. Staged plan

Each stage lists the trigger, the likely pressure point, and the action. Do not
do a later stage's work early.

### Stage 1 — Launch to ~10,000 users

**Pressure:** essentially none. Supabase's default tier handles this.

**Actions:**
- Confirm **connection pooling** is on (Supabase Supavisor / PgBouncer in
  transaction mode). This is the single most important scaling setting and is
  free — without it, a few hundred concurrent users can exhaust Postgres
  connections.
- Add **indexes** on every column used in a `WHERE` or `ORDER BY`: at minimum
  `requests(client_id, status)`, `bids(request_id)`,
  `notifications(user_id, read_at)`, `audit_events(created_at)`.
- Turn on **uptime monitoring** and Supabase's slow-query log. You cannot scale
  what you cannot see.
- Confirm **daily backups** are enabled.

### Stage 2 — ~10k to ~100k users

**Pressure:** read-heavy pages (dashboard, marketplace) hitting Postgres on
every load; the `audit_events` table growing fast.

**Actions:**
- Move expensive aggregate reads (market intelligence, dashboard insight rollups)
  into **Postgres materialized views** or scheduled rollup tables, refreshed on a
  cron, instead of computing them per request. The codebase already anticipates
  this — see the note in `modules/requests/api.ts` about moving to an RPC.
- Lean on **TanStack Query caching** (already configured with a 2-min stale time
  in `core/query-client.ts`) and raise stale times on data that changes slowly
  (market rates, product catalogue).
- **Partition or archive** `audit_events` by month so the live table stays small.
- Add a read-through cache (the `api/_lib/cache.ts` already exists) in front of
  the hottest read endpoints.

### Stage 3 — ~100k to ~1M users

**Pressure:** write throughput on `bids`/`requests` during peak; single-region
latency for users far from the database region.

**Actions:**
- Add **Postgres read replicas** and route read-only queries to them. Supabase
  supports this; the client factory in `shared/lib/supabase.ts` is the single
  place to wire a replica client, so this is a contained change.
- Introduce a **queue** (e.g. Supabase queues / pgmq, or an external broker) for
  non-urgent work — notifications, webhook delivery, email — so writes to core
  tables are not blocked by side effects.
- Add a **CDN edge cache** for public, non-personalised data (market rates, news,
  product catalogue).
- Revisit the **institution bundle split** (Architecture Review F6).

### Stage 4 — beyond ~1M users (only if you genuinely get there)

At this point you have a regionally dominant product and a team to match. Only
now consider:
- Database **sharding** by tenant/region, or moving the highest-write tables to a
  purpose-built store.
- **Multi-region** read replicas close to user clusters.
- Breaking the largest serverless functions into dedicated services if cold
  starts or duration limits become real constraints.

Do not design for this stage today. If you reach it, you will have the revenue,
the data, and the team to do it properly — and you will do it better with real
production metrics than with guesses made at launch.

---

## 4. Principles that make scaling cheap later

These cost nothing now and save enormous pain later:

1. **Keep the data layer behind the client factory.** Because every query goes
   through `shared/lib/supabase.ts`, adding replicas, pooling, or caching is a
   one-file change. Never call `createClient()` elsewhere.
2. **Keep the adapter pattern** (as in `markets/api/`). Swapping a mock for a
   live source, or a direct query for a cached RPC, changes one file and never
   the UI.
3. **Measure before optimising.** Add monitoring at Stage 1 so every later
   decision is driven by real numbers, not assumptions.
4. **Prefer database work over frontend work for scale.** The frontend is
   already CDN-scaled; effort spent on Postgres indexes, pooling, and caching
   has 100× the impact of frontend micro-optimisation.
5. **Resist premature complexity.** Every distributed-systems pattern you add is
   a tax on "changes should be easy." Add them only when a metric forces you to.
