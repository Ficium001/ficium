/**
 * src/modules/requests/hooks.ts
 * ─────────────────────────────────────────────────────────────
 * SHIM — re-exports from the canonical location.
 * This file exists only for backward compatibility.
 * All new code should import from "@/individual/requests/hooks/useRequests".
 *
 * TODO: once useDashboard.ts and all consumers are updated to import
 * directly from the canonical location, delete this file.
 */
export {
  useMyRequests,
  RequestQueryKeys,
} from "@/individual/requests/hooks/useRequests";
