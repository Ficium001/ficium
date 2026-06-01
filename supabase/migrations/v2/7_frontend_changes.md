# Ficium V2 — Frontend Changes Required

## Overview

The frontend changes are **minimal** — the V2 migration was designed to minimise breaking changes. Only 3 areas need updating.

---

## Change 1 — AuthContext (CRITICAL)

**File:** `src/features/auth/context/AuthContext.tsx`

**What changes:** Line 27 — replace direct table query with `get_my_role()` RPC

```typescript
// BEFORE (V1) — reads from public.users
async function fetchUserMeta(userId: string) {
  const [{ data: userRow }, { count }] = await Promise.all([
    supabase.from("users").select("role").eq("id", userId).single(),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  if (!userRow) {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setUnreadCount(0);
    window.location.href = "/";
    return;
  }

  setRole((userRow?.role as UserRole) ?? "client");
  setUnreadCount(count ?? 0);
}
```

```typescript
// AFTER (V2) — calls get_my_role() function
async function fetchUserMeta(userId: string) {
  const [{ data: roleData }, { count }] = await Promise.all([
    supabase.rpc("get_my_role"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  if (!roleData) {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setUnreadCount(0);
    window.location.href = "/";
    return;
  }

  setRole((roleData as UserRole) ?? "client");
  setUnreadCount(count ?? 0);
}
```

---

## Change 2 — KYC / Profile queries

**Any component querying `public.users` for client profile data** needs to switch to `public.clients`.

**Find all occurrences:**
```bash
grep -rn "from(\"users\")" src/
grep -rn "from('users')" src/
```

**Pattern to replace:**
```typescript
// BEFORE
supabase.from("users").select("*").eq("id", userId)

// AFTER
supabase.from("clients").select("*").eq("id", userId)
```

---

## Change 3 — Institution user queries

**Any component querying `institution_users`** for membership/role data needs to switch to `institution_members`.

**Find all occurrences:**
```bash
grep -rn "institution_users" src/
```

**Pattern to replace:**
```typescript
// BEFORE
institutionDb.from("institution_users").select("*")

// AFTER  
institutionDb.from("institution_members").select("*")
```

Note: `institution_members` has `auth_user_id` instead of `user_id` as the FK column name.

```typescript
// BEFORE
.eq("user_id", userId)

// AFTER
.eq("auth_user_id", userId)
```

---

## Change 4 — Client dossier queries

**Any component querying `client_dossiers` or `financial_profiles`** needs to switch to `client_dossier`.

```typescript
// BEFORE
supabase.from("client_dossiers").select("*").eq("client_id", userId)
supabase.from("financial_profiles").select("*").eq("user_id", userId)

// AFTER (both replaced by single table)
supabase.from("client_dossier").select("*").eq("client_id", userId)
```

---

## Change 5 — Loan details queries

```typescript
// BEFORE
supabase.from("loan_details").select("*").eq("user_id", userId)

// AFTER
supabase.from("client_loan_details").select("*").eq("client_id", userId)
```

---

## No Change Required

These stay exactly the same:
- `supabase.from("requests")` — unchanged
- `supabase.from("notifications")` — unchanged  
- `supabase.from("bid_acceptances")` — unchanged
- `institutionDb.from("institutions")` — unchanged
- `institutionDb.from("institution_bids")` — unchanged
- `institutionDb.from("pending_actions")` — unchanged
- `institutionDb.from("marketplace_requests")` — unchanged
- `institutionDb.from("audit_events")` — unchanged
- `institutionDb.from("products")` — unchanged
- All webhook, API key, product catalogue queries — unchanged

---

## Find All Files Needing Changes

Run these in your project root:

```bash
# Files touching public.users
grep -rn "from(\"users\")\|from('users')" src/ --include="*.ts" --include="*.tsx"

# Files touching institution_users
grep -rn "institution_users" src/ --include="*.ts" --include="*.tsx"

# Files touching financial_profiles or client_dossiers
grep -rn "financial_profiles\|client_dossiers" src/ --include="*.ts" --include="*.tsx"

# Files touching loan_details
grep -rn "loan_details" src/ --include="*.ts" --include="*.tsx"
```

---

## Phase 2 Frontend Changes (later)

These are deferred to Phase 2 after V2 is stable:

1. Add audit trail display for client actions (`public.audit_events`)
2. Add audit trail display for admin actions (`admin.audit_events`)
3. Remove any remaining references to `public.users` once fully migrated
