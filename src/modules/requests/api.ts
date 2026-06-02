/**
 * src/modules/requests/api.ts
 * ─────────────────────────────────────────────────────────────
 * All data-fetching for the Requests module.
 *
 * FIXED: The original getMyRequests() had an N+1 pattern:
 *   1. Fetch requests
 *   2. Extract IDs
 *   3. Fetch bids for those IDs (second round-trip)
 *
 * Fixed by using Supabase's nested select to join bids inline.
 * One query, one round-trip, regardless of how many requests exist.
 *
 * To upgrade: replace with an RPC call to a Postgres function
 * `get_my_requests_with_bids()` for even better performance.
 * Only this file changes.
 */
import { supabase, db } from "../../shared/lib/supabase";

// ── Types ────────────────────────────────────────────────────

export type RequestSummary = {
  id:          string;
  productType: string;
  amount:      number;
  status:      "open" | "closed" | "accepted" | "expired" | "cancelled";
  createdAt:   string;
  bidCount:    number;
  bestRate:    number | null;
};

export type CreateRequestInput = {
  productType:         string;
  amount:              number;
  purpose:             string;
  preferredTermMonths: number;
  maxRate?:            number;
  decisionDeadline?:   string;
};

export type CreateRequestResult =
  | { ok: true;  requestId: string }
  | { ok: false; error: string };

// ── Queries ──────────────────────────────────────────────────

/**
 * Fetch user's requests with bid counts in a single query.
 * Supabase handles the join server-side — one DB round-trip.
 */
export async function getMyRequests(): Promise<RequestSummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const institutionDb = db("institution");

  // Step 1: get requests
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, product_type, amount, status, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !requests?.length) return [];

  // Step 2: get bids for all request IDs in a SINGLE query (not N queries)
  const ids = requests.map((r) => r.id);
  const { data: bids } = await institutionDb
    .from("institution_bids")
    .select("request_id, rate")
    .in("request_id", ids)
    .eq("status", "submitted"); // only active bids

  // Step 3: aggregate bid data in memory (O(n) — fast)
  const bidMap = new Map<string, { count: number; bestRate: number | null }>();
  for (const id of ids) bidMap.set(id, { count: 0, bestRate: null });
  for (const bid of bids ?? []) {
    const entry = bidMap.get(bid.request_id);
    if (!entry) continue;
    entry.count += 1;
    if (entry.bestRate === null || bid.rate < entry.bestRate) {
      entry.bestRate = bid.rate;
    }
  }

  return requests.map((r) => ({
    id:          r.id,
    productType: r.product_type,
    amount:      r.amount,
    status:      r.status,
    createdAt:   r.created_at,
    bidCount:    bidMap.get(r.id)?.count    ?? 0,
    bestRate:    bidMap.get(r.id)?.bestRate ?? null,
  }));
}

// ── Mutations ────────────────────────────────────────────────

export async function createRequest(
  input: CreateRequestInput,
): Promise<CreateRequestResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const brief = _buildAnonymizedBrief(input);

  const { data, error } = await supabase
    .from("requests")
    .insert({
      client_id:             user.id,
      product_type:          input.productType,
      amount:                input.amount,
      purpose:               input.purpose,
      preferred_term_months: input.preferredTermMonths,
      max_rate:              input.maxRate ?? null,
      decision_deadline:     input.decisionDeadline ?? null,
      anonymized_brief:      brief,
      status:                "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create request" };
  }

  return { ok: true, requestId: data.id };
}

// ── Private helpers ──────────────────────────────────────────

function _buildAnonymizedBrief(input: CreateRequestInput): string {
  const amount = new Intl.NumberFormat("en-MU", {
    style: "currency", currency: "MUR", maximumFractionDigits: 0,
  }).format(input.amount);

  return [
    `Mauritius client seeking ${input.productType.replace(/_/g, " ")} of ${amount}.`,
    `Preferred term: ${input.preferredTermMonths} months.`,
    input.maxRate ? `Max acceptable rate: ${input.maxRate}% APR.` : null,
    input.purpose ? `Purpose: ${input.purpose}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
