# Ficium V2 Phase 2 — Frontend Audit Trail Changes

## Overview

Three audit tables now exist across all schemas:

| Schema | Table | What it logs |
|---|---|---|
| `public` | `audit_events` | Client actions (KYC, requests, bid acceptances) |
| `institution` | `audit_events` | Institution maker-checker actions (already existed) |
| `admin` | `audit_events` | Platform admin actions (approvals, suspensions) |

All three are visible in `admin.unified_audit` view.

---

## Change 1 — Client Audit Trail (new page)

**Create:** `src/individual/audit/pages/ClientAudit.tsx`

```typescript
import { supabase } from "../../../shared/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useClientAudit() {
  return useQuery({
    queryKey: ["client-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}
```

---

## Change 2 — Admin Unified Audit (update existing)

**File:** `src/admin/pages/FiciumAdminPanel.tsx`

```typescript
// Replace existing audit query with unified_audit view
import { adminDb } from "../../shared/lib/supabase";

export function useUnifiedAudit(limit = 100) {
  return useQuery({
    queryKey: ["unified-audit", limit],
    queryFn: async () => {
      const { data, error } = await adminDb
        .from("unified_audit")  // crosses all 3 schemas
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}
```

---

## Change 3 — shared/lib/audit.ts (update)

**File:** `src/shared/lib/audit.ts`

The existing `audit` helper likely writes to the old location.
Update it to call `write_client_audit()` RPC:

```typescript
// BEFORE — direct table insert
await supabase.from("audit_logs").insert({ ... });

// AFTER — use the write_client_audit RPC
await supabase.rpc("write_client_audit", {
  p_client_id:       userId,
  p_action_category: "kyc.status_change",
  p_event_label:     "KYC submitted by client",
  p_resource_type:   "clients",
  p_resource_id:     userId,
  p_outcome:         "success",
});
```

---

## Change 4 — Institution Audit (already working)

`institution.audit_events` was already in place and working.
The `useAuditEvents()` hook in `useInstitution.ts` reads from it correctly.
No changes needed.

---

## No Change Required

- All maker-checker actions auto-log to `institution.audit_events` ✅
- Institution approval/suspension auto-logs to `admin.audit_events` via trigger ✅  
- KYC changes auto-log to `public.audit_events` via trigger ✅
- New requests auto-log to `public.audit_events` via trigger ✅
- Bid acceptances auto-log to `public.audit_events` via trigger ✅

---

## Phase 2 Complete Checklist

- [x] `public.audit_events` — WORM client audit table
- [x] `admin.audit_events` — WORM admin audit table
- [x] `admin.unified_audit` — cross-schema view
- [x] Auto-triggers: KYC, requests, bid acceptances, institution changes
- [ ] Drop `public.users` (file 3)
- [ ] Drop `institution.institution_users` (file 3)
- [ ] Update `src/shared/lib/audit.ts` to use new RPC
- [ ] Add client audit trail page
- [ ] Add unified audit display in admin panel
