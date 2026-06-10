# Ficium — Database scripts

## Single source of truth

The authoritative, ordered schema lives in **`../supabase/migrations/`** and is
applied via the Supabase CLI. That directory — including the `v2/` and
`v2-phase2/` sequences (each with backup → create → migrate → verify → swap →
drop → rollback steps) — is what defines the production schema.

**Do not** treat anything under `database/` as a migration. The files here are
historical and are kept only for reference and audit.

## Why this folder was reorganized

`database/` had accumulated a pile of loosely-ordered, ad-hoc scripts
(`FIX_ALL_NOW.sql`, `FIX_ALL_NOW_v2.sql`, `RUN_THIS_IN_SUPABASE.sql`,
`FIX_STEP1_STEP2.sql`, …). There was no way to tell which had been applied to
production or in what order — a real risk for a financial app. Nothing was
deleted; everything was sorted into two clearly-labelled buckets.

### `archive/` — one-off operational fixes & diagnostics (DO NOT re-run)

These were run by hand against the live DB to patch a specific issue or to
diagnose state. Re-running them blind can re-introduce old behaviour or
overwrite newer schema. They are kept for audit only.

| File | What it did |
|------|-------------|
| `FIX_ALL_NOW.sql`, `FIX_ALL_NOW_v2.sql` | Early "fix everything" scripts that recreated `client_profile_view` and re-granted perms. Superseded by `supabase/migrations/v2-phase2/`. |
| `FIX_STEP1_STEP2.sql`, `FIX_STEP3.sql` | Staged versions of the same fix. |
| `FIX_VIEW_GRANTS.sql` | Diagnosed + granted `client_profile_view`. **Contains the `GRANT … TO anon` discussed below.** |
| `FIX_SNAPSHOT_PERMISSIONS.sql` | Grants on `client_financial_snapshot`. |
| `FIX_MISSING_CLIENTS.sql` | Backfill for clients missing dossier rows. |
| `fix_marketplace_view.sql` | One-off marketplace view patch. |
| `RUN_THIS_IN_SUPABASE.sql` | Catch-all "paste into SQL editor" script. |
| `DIAGNOSE_PROFILE.sql`, `VERIFY_BACKEND.sql` | Read-only diagnostics. Safe to read; not migrations. |

### `schema-reference/` — table-defining scripts

These define real tables/views and may pre-date the formal migration set. Treat
them as **reference**: if any are not yet represented in
`supabase/migrations/`, fold them in as a properly-numbered migration rather
than running these directly.

- `client_goals.sql`, `goal_workspace_migration.sql` — goals/workspace schema
- `financial_snapshot.sql` — net-worth snapshot tables + `client_profile_view`
- `journeys_and_documents.sql` — journeys + documents schema

## Security note: the `anon` grant on `client_profile_view`

`FIX_VIEW_GRANTS.sql` runs `GRANT SELECT ON public.client_profile_view TO anon`.
The view carries sensitive PII (email, address, monthly income, net worth, PEP
status, risk/affordability scores).

**Current status: not exploitable, but fragile.** The authoritative view
(`supabase/migrations/v2-phase2/3_drop_v1_tables.sql`) is defined
`WITH (security_invoker=false)` and ends with `WHERE c.id = auth.uid()`. For an
`anon` caller `auth.uid()` is NULL, so the view returns **zero rows**. The grant
therefore leaks nothing today.

The risk is that the *entire* protection is that single `WHERE` line, while the
view bypasses RLS on the underlying tables. If the view is ever recreated
without that clause (some archived scripts do exactly that), every holder of the
public anon key would get full PII. Since `anon` gets nothing useful anyway, the
grant is pure downside.

➡️ Hardening migration:
`supabase/migrations/2026xxxx_revoke_anon_profile_view.sql` revokes it.
Authenticated access is unaffected.
