# Ficium V2 Schema Migration

## Run Order

| File | What it does | When to run |
|------|-------------|-------------|
| `1_backup.sql` | Snapshots all V1 data into `backup_v1` schema | **First — before anything else** |
| `2_create_v2_tables.sql` | Creates new V2 tables alongside V1 (non-destructive) | After backup confirmed |
| `3_migrate_data.sql` | Copies data from V1 into V2 tables | After V2 tables created |
| `4_verify.sql` | Verifies all data migrated correctly | After migration — **must show 0 issues** |
| `5_swap_references.sql` | Updates RLS, views, functions, trigger to V2 | After verification passes |
| `6_drop_old_tables.sql` | Drops empty/duplicate V1 tables | After frontend tested on V2 |
| `7_frontend_changes.md` | Exact React/TypeScript changes needed | Update code alongside DB |
| `8_rollback.sql` | Full restore if anything goes wrong | Emergency only |

## Key Changes

```
V1                              V2
──────────────────────────────────────────────────────
public.users (all roles)    →   public.clients (clients only)
                            →   institution.institution_members (bank staff)
                            →   admin.admin_users (already existed)

public.financial_profiles   →   merged into public.client_dossier
public.client_dossiers      →   merged into public.client_dossier
public.loan_details         →   public.client_loan_details
public.bank_profiles        →   merged into institution.institution_members

DROPPED (0 rows):
  public.client_requests
  public.bids

DEFERRED to Phase 2:
  institution.institution_users  (kept as fallback during transition)
  public.users                   (kept until all frontend refs removed)
```

## Frontend Change Summary

Only 1 critical change + 4 minor ones:

1. **AuthContext** — replace `supabase.from("users").select("role")` with `supabase.rpc("get_my_role")`
2. Profile queries — `users` → `clients`
3. Institution user queries — `institution_users` → `institution_members`
4. Dossier queries — `client_dossiers` / `financial_profiles` → `client_dossier`
5. Loan queries — `loan_details` → `client_loan_details`

## Phase 2 (later)

- Add `public.audit_events` — client actions WORM table
- Add `admin.audit_events` — platform admin actions WORM table
- Drop `institution.institution_users` (after full migration)
- Drop `public.users` (after all frontend references removed)

## Rollback

If anything goes wrong, run `8_rollback.sql`. The `backup_v1` schema contains
complete snapshots of all V1 tables taken before any changes.
