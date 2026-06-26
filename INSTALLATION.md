# Ficium App — Installation

_Last updated: 27 June 2026_

---

## Prerequisites

- Node.js 20+
- A Supabase account with the App DB project set up (`wixfhjlsjkiwfvqewvmt` in production)
- Vercel account (for deployment)
- Anthropic API key (Claude — KYC, vault extraction, chat, request builder)
- Resend account (transactional email)
- ficium-portal-api running (for bid operations)

---

## Local development

```bash
# 1. Clone and install
git clone https://github.com/Ficium001/ficium.git
cd ficium
npm install

# 2. Configure
cp .env.example .env
```

Fill in `.env`:

```bash
# ── Client-side (bundled into frontend) ──────────────────────
VITE_SUPABASE_URL=https://wixfhjlsjkiwfvqewvmt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from Supabase dashboard>
VITE_PORTAL_URL=https://ficium-portal.vercel.app

# ── Server-side (Vercel env vars — never used in src/) ───────
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
APP_SERVICE_SECRET=<shared secret — same value in portal-api + Supabase Vault>
PORTAL_API_URL=https://ficium-portal-api-production.up.railway.app
```

```bash
# 3. Run dev server
npm run dev
# → http://localhost:5173

# 4. Type-check (matches Vercel build exactly)
npm run build
```

> **Critical:** Always run `npm run build`, not just `tsc --noEmit`. Vercel runs `tsc -b` which enforces stricter rules (`erasableSyntaxOnly`, `noUnusedLocals`, `verbatimModuleSyntax`). A passing `--noEmit` can still fail the Vercel build.

---

## Vercel deployment

1. Connect `Ficium001/ficium` to a Vercel project
2. Set all server-side environment variables in Vercel → Settings → Environment Variables:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`
   - `APP_SERVICE_SECRET`
   - `PORTAL_API_URL`
   - `VITE_SUPABASE_URL` (also needed at build time)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (also needed at build time)
3. Build command: `npm run build` · Output directory: `dist`
4. Confirm deploy: `GET /api/keepalive` → 200

> **Git authorship:** Vercel only deploys commits authored by `kishan.jeebun@ficium.net`. Other author emails will be rejected.

> **Function limit:** Vercel Hobby plan allows 12 root-level `api/*.ts` functions. Currently at exactly 12. Internal pg_net handlers use `api/internal.ts` router to stay within the limit. Upgrade to Pro before adding more functions.

---

## Supabase setup (App DB)

### Run migrations in order

Apply via the Supabase SQL editor on project `wixfhjlsjkiwfvqewvmt`:

```
supabase/migrations/
  v2/
    1_backup.sql                    — snapshot V1 data (run first)
    2_create_v2_tables.sql          — create V2 tables
    3_migrate_data.sql              — migrate data V1→V2
    4_verify.sql                    — verify (must show 0 issues)
    5_swap_references.sql           — update RLS, views, triggers
    6_drop_old_tables.sql           — drop V1 tables (after frontend tested)
  v2-phase2/
    1_public_audit_events.sql       — audit_events table
    2_admin_audit_events.sql        — admin audit
    3_drop_v1_tables.sql            — remove V1 backup schemas
    marketplace_sync_automation.sql — App→Portal sync trigger + pg_cron
    notifications.sql               — public.notifications + RLS
    vault_documents.sql             — client_vault_document, _property, _access_log
    expiry_notifications.sql        — notify_expiring_requests() + pg_cron
```

> `bid_notify_trigger.sql` targets the **Portal DB** (`egwobcajdlragubtkpqp`), not the App DB. Run it there, not here.

### Enable extensions

Required extensions (enable in Supabase dashboard → Database → Extensions):
- `pg_net` — outbound HTTP calls from triggers
- `pg_cron` — scheduled jobs
- `pgcrypto` — UUID generation (usually pre-enabled)

### Configure Vault secrets

Required for pg_net triggers to reach ficium-portal-api:

```sql
-- Run in Supabase SQL editor on App DB
SELECT vault.create_secret(
  'https://ficium-portal-api-production.up.railway.app',
  'portal_api_url'
);
SELECT vault.create_secret(
  '<your APP_SERVICE_SECRET value>',
  'app_service_secret'
);
```

Verify:
```sql
SELECT name, created_at FROM vault.secrets
WHERE name IN ('portal_api_url', 'app_service_secret');
```

### Storage bucket

The Vault feature requires a **private** Storage bucket named `documents`:

1. Supabase dashboard → Storage → New bucket
2. Name: `documents`
3. Public: **off** (private)
4. RLS: clients can only read/write their own files (path: `{user_id}/...`)

---

## Supabase Storage RLS

Add these policies to the `documents` bucket:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "users upload own vault docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files
CREATE POLICY "users read own vault docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Service role can access all (for vault-extract endpoint)
CREATE POLICY "service role full access"
ON storage.objects FOR ALL
USING (auth.role() = 'service_role');
```

---

## Environment variable reference

| Variable | Used in | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend + build | App DB Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend + build | Supabase anon key |
| `VITE_PORTAL_URL` | Frontend | Portal redirect URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel API routes | Service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Vercel API routes | Claude (KYC, vault, chat, intelligence) |
| `RESEND_API_KEY` | Vercel API routes | Email (bid notifications, KYC results) |
| `APP_SERVICE_SECRET` | Vercel API routes | Shared secret for s2s auth with portal-api |
| `PORTAL_API_URL` | Vercel API routes | ficium-portal-api base URL |

---

## Local API route testing

Vercel API routes run as Node.js functions. To test locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run with Vercel dev (respects api/ routing)
vercel dev
```

Or test individual handlers directly:

```bash
# Test keepalive
curl http://localhost:3000/api/keepalive

# Test internal router (requires APP_SERVICE_SECRET)
curl -X POST http://localhost:3000/api/internal \
  -H "Content-Type: application/json" \
  -H "X-Service-Secret: $APP_SERVICE_SECRET" \
  -d '{"action":"bid-notify","bid_id":"...","request_id":"..."}'
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails with `erasableSyntaxOnly` | Enum or namespace in `api/*.ts` | Replace with `const` objects or plain strings |
| Build fails with `noUnusedLocals` | Imported type used only as value | Add `import type` |
| Vercel deploy rejected | Wrong git author | Set `user.email = kishan.jeebun@ficium.net` in git config |
| `403` on notifications query | Supabase session missing | Check `supabase.auth.getSession()` returns non-null |
| pg_net not firing | Vault secrets not set | Run vault secret setup SQL above |
| `vault-extract` 404 in Storage | Wrong bucket name | Must be exactly `documents` (not `kyc-documents`) |
| `accept-bid` 503 | `PORTAL_API_URL` not set in Vercel | Add to Vercel env vars |
