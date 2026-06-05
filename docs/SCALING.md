# Ficium — Scaling Guide

_An honest, milestone-based guide to growing the infrastructure as the platform grows._

---

## 1. Realistic scale targets

| Scenario | Registered users | Active users/month | Requests/day |
|---|---|---|---|
| Launch (now) | < 1,000 | < 200 | < 20 |
| Growth | 10,000–50,000 | 5,000–15,000 | 200–500 |
| Regional leader | 100,000–500,000 | 30,000–100,000 | 2,000–10,000 |
| Pan-African | 1,000,000+ | 200,000+ | 20,000+ |

The current stack handles the first two scenarios with zero changes. Each scaling step below is **additive** — nothing is rewritten.

---

## 2. Current architecture (launch → ~50k users)

No changes needed. Bottleneck at this scale is user acquisition, not infrastructure.

---

## 3. Milestone 1: 50k–200k users

**Enable Supabase connection pooling (PgBouncer)** — dashboard toggle, zero code changes.

**Add hot-path indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_requests_client_created ON public.requests(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_open ON public.requests(status, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_institution_bids_request ON institution.institution_bids(request_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_client_created ON public.audit_events(client_id, created_at DESC);
```

**Materialise intelligence views** — replace computed views with `pg_cron`-refreshed materialised views. Update `api/_lib/intelligence-service.ts` to read from `mv_market_rates` etc. Zero other changes.

**Cost:** ~$45/mo (Supabase Pro + Vercel Pro)

---

## 4. Milestone 2: 200k–1M users

**Add Postgres read replica** (Supabase Team plan). Route intelligence queries to replica. Update `getReadDb()` in `api/_lib/db.ts`.

**Swap in-process cache for Redis (Upstash):**
```typescript
// api/_lib/cache.ts — Redis drop-in replacement
// Same get(key, ttlSecs, fetcher) interface — zero consumer changes
import { Redis } from "@upstash/redis";
class RedisCache {
  async get<T>(key: string, ttlSecs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get<T>(key);
    if (cached) return cached;
    const data = await fetcher();
    await this.redis.setex(key, ttlSecs, data);
    return data;
  }
}
export const ServerCache = new RedisCache();
```

**Partition `audit_events` by month** — old partitions archived to cold storage.

**Cost:** ~$640/mo (Supabase Team + Vercel Pro + Upstash)

---

## 5. Milestone 3: 1M+ users / multi-region

**Multi-region read replicas** — Supabase branches per region, or read replicas in EU/Africa/Asia. Vercel already deploys globally.

**Dedicated analytics DB** — OLAP store (Supabase Analytics, BigQuery, or ClickHouse) populated by logical replication. Intelligence queries never touch the primary DB.

**Background job infrastructure** — replace `pg_cron` with Trigger.dev or BullMQ + Redis for retries, monitoring, fan-out.

**Cost:** $3,000–10,000/mo

---

## 6. What NOT to do prematurely

| Pattern | Appropriate when | Why not now |
|---|---|---|
| Microservices | 50+ engineers, 10M+ users | Kills velocity |
| Event sourcing | Regulatory-scale audit | Current audit log is sufficient |
| GraphQL | 10+ frontend clients | No current benefit |
| Kubernetes | Self-hosted, 100+ services | Vercel handles this |
| Multi-region active-active writes | 10M+ users, multiple continents | Distributed transactions are extremely hard |
| CQRS | Complex multi-read-model domain | Premature |

**Every layer of infrastructure makes every code change slower, every debug harder, every onboarding longer. Add layers only when measurement proves you need them.**

---

## 7. Monitoring minimums

| Metric | Alert threshold |
|---|---|
| API p95 latency | > 1s |
| DB connection pool | > 80% |
| Error rate | > 1% of requests |
| Intelligence cache hit rate | < 80% |
| Pending actions expiring unreviewed | > 5/hour |

Future: Sentry for errors, Datadog/Grafana for metrics.
