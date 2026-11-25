# App DB baseline

A new App DB (UAT, production, DR) is built from this folder, not by replaying
`supabase/migrations/`.

**Why.** From May to November 2026 most App DB changes were applied by hand.
About half of the 99 changes in Supabase's own history have no file here, the
first five weeks of schema (May 15 to June 20) were never recorded, and the
older folders mix data-migration and backup scripts with schema changes.
Replaying them cannot rebuild the database and could harm one. The ledger
(`admin.schema_migration`, from `20261116120000`) is reliable; everything
before it is history.

## What is here

All generated from live by the `schema-baseline` workflow. Never edit by hand:
`build` refuses a file whose SHA-256 does not match `BASELINE`.

| File | What |
|---|---|
| `platform_pre.sql` | Extensions, and Ficium's own roles (created `NOLOGIN`) |
| `schema.sql` | `pg_dump --schema-only` of `admin`, `fico`, `finance`, `integration`, `public`, `vault_extract`. No rows, so no client data |
| `platform_post.sql` | Ours, inside Supabase-managed schemas: storage buckets and their policies, triggers on `auth.users`, cron jobs, the realtime publication, and the **names** of the Vault secrets the cron jobs read (never their values) |
| `BASELINE` | `through` (last ledger migration included), when it was taken, a SHA-256 per file |

Cron commands that call this project's edge functions are stored with
`https://__PROJECT_REF__.supabase.co`; `build --project-ref` fills in the new
project's ref.

## Build a new environment

On a new, empty Supabase project, with a direct connection (port 5432) as a
superuser role:

```
python scripts/app_schema_baseline.py build "$NEW_DB_DSN" --upto <latest migration> --project-ref <new ref>
```

One transaction applies the baseline and writes a ledger row for every
migration up to `through`; later migrations then run in order. Afterwards:

1. Set each Vault secret listed at the end of `platform_post.sql` from Doppler.
   `build` creates missing ones with the value `__SET_FROM_DOPPLER__`.
2. Nothing to do for the admin site: it syncs over HTTPS (`op=admin-sync`).
   The old `ficium_admin_sync` role is created by the baseline and dropped by
   20261124170000; it is never given a login.
3. Supabase Auth settings (providers, email templates, redirect URLs, OTP
   expiry) are project settings, not SQL: set them in the dashboard.

## Proof, every day and on every PR touching migrations

`.github/workflows/schema-baseline.yml`, needing the repository secret
`APP_DB_DSN` (App DB session pooler, port 5432):

1. Snapshot live, restore it into an empty Supabase Postgres
   (`supabase/postgres`, same version as live) and snapshot that, so both sides
   are dumped the same way.
2. Build a second empty Supabase Postgres from this folder plus migrations, up
   to the live ledger point, and snapshot it.
3. `schema.sql` and `platform_post.sql` must be identical; every extension and
   role in live's `platform_pre.sql` must exist. A change made on live without a
   migration file fails here.
4. Migrations merged but not yet on live are applied, to prove they apply.

To create or refresh the baseline: open a PR from a branch named
`schema-baseline/<anything>`. The workflow regenerates this folder from live,
runs the proof, and commits the result to the branch.
