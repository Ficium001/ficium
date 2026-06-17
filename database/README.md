# `database/`

This folder holds **historical, one-off operational SQL** — manual fixes,
backfills, and diagnostics that were run by hand against Supabase during
development. They are kept under [`archive/`](./archive) for reference only.

## Canonical source of truth

The authoritative, ordered schema lives in **[`../supabase/migrations/`](../supabase/migrations)**.
That is the only place to add new schema changes. Anything in `archive/` has
already been applied (or targets tables that were since dropped in the v2
migration — e.g. `client_goals`, `client_journeys`) and should **not** be re-run.

## Why these are archived rather than deleted

They touched production data, so they are preserved as a paper trail. Full
history is also recoverable from git. If you are confident they are no longer
needed, `git rm -r database/archive` removes them cleanly.

## What's in `archive/`

| Category | Files |
|---|---|
| Backfills (already run) | `BACKFILL_*.sql`, `FIX_MISSING_CLIENTS.sql` |
| One-off fixes (already run) | `FIX_ALL_NOW*.sql`, `FIX_STEP*.sql`, `FIX_*GRANTS*.sql`, `FIX_SNAPSHOT_PERMISSIONS.sql`, `RUN_THIS_IN_SUPABASE.sql`, `fix_marketplace_view.sql` |
| Diagnostics | `DIAGNOSE_PROFILE.sql`, `VERIFY_BACKEND.sql` |
| Dropped-table schema (dead) | `client_goals.sql`, `journeys_and_documents.sql`, `goal_workspace_migration.sql` |
| Superseded by `supabase/migrations/` | `financial_snapshot.sql` |
