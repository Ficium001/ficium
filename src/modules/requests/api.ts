/**
 * src/modules/requests/api.ts
 * ─────────────────────────────────────────────────────────────
 * SHIM — re-exports from the canonical location.
 * The single source of truth for all requests data is:
 *   src/individual/requests/api/requests.ts
 *
 * TODO: delete this file once no code imports from here directly.
 */
export type {
  RequestSummary,
  RequestStatus,
  ProductType,
  CreateRequestInput,
  CreateRequestResult,
} from "@/individual/requests/api/requests";

export {
  getMyRequests,
  createRequest,
  formatProductType,
} from "@/individual/requests/api/requests";
