import { supabase, institutionDb, db } from "@/shared/lib/supabase";
import { audit } from "@/shared/lib/audit";
import { formatProductType } from "@/shared/lib/format";
export { formatProductType } from "@/shared/lib/format";

/* ---------- Institution schema client (read-only for bids) ---------- */
const instSupabase = institutionDb;

/* ---------- Types ---------- */

export type ProductType =
  | "sme_loan"
  | "personal_loan"
  | "mortgage"
  | "fixed_deposit"
  | "savings_account"
  | "credit_card"
  | "business_account"
  | "investment_account"
  | "leasing"
  | "overdraft"
  | "business_loan";

export type RequestStatus = "open" | "closed" | "cancelled" | "accepted" | "expired";

export type CreateRequestInput = {
  productType: ProductType;
  amount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate?: number;
  decisionDeadline?: string;
};

export type CreateRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

export type RequestDetail = {
  id: string;
  productType: ProductType;
  amount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate: number | null;
  decisionDeadline: string | null;
  anonymizedBrief: string;
  status: RequestStatus;
  createdAt: string;
};

export type Bid = {
  id: string;
  requestId: string;
  bankId: string;
  institutionName: string;
  rate: number;
  rateType: "fixed" | "variable";
  amountOffered: number;
  termMonths: number;
  terms: string | null;           // legacy field
  conditions: Record<string, unknown> | null;
  status: "submitted" | "accepted" | "rejected" | "expired" | "withdrawn";
  submittedAt: string;
  createdAt: string;             // alias of submittedAt for legacy compatibility
  source: "legacy" | "institution"; // which schema the bid came from
};

export type AcceptBidResult = { ok: true } | { ok: false; error: string };

/* ---------- Summary type (used by list views + dashboard) ---------- */

export type RequestSummary = {
  id:          string;
  productType: string;
  amount:      number;
  status:      RequestStatus;
  createdAt:   string;
  bidCount:    number;
  bestRate:    number | null;
};

/* ---------- Get my requests (list) ----------
   One round-trip: requests + bids fetched separately then merged in memory.
   Bids are filtered to status="submitted" so expired/withdrawn bids don't
   inflate the count. This is the only implementation — dashboard, requests
   page, and any future consumer all use this.
------------------------------------------------ */

export async function getMyRequests(): Promise<RequestSummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, product_type, amount, status, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !requests?.length) return [];

  const ids = requests.map((r) => r.id);
  const { data: bids } = await db("institution")
    .from("institution_bids")
    .select("request_id, rate")
    .in("request_id", ids)
    .eq("status", "submitted"); // only active bids

  // O(n) aggregation in memory
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

/* ---------- Create request ---------- */

function generateAnonymizedBrief(input: CreateRequestInput): string {
  const product = formatProductType(input.productType);
  const amount = new Intl.NumberFormat("en-MU", {
    style: "currency",
    currency: "MUR",
    maximumFractionDigits: 0,
  }).format(input.amount);
  const parts = [
    `Mauritius client seeking ${product} of ${amount}.`,
    `Preferred term: ${input.preferredTermMonths} months.`,
  ];
  if (input.maxRate) parts.push(`Max rate: ${input.maxRate}% APR.`);
  if (input.purpose) parts.push(`Purpose: ${input.purpose}.`);
  if (input.decisionDeadline) parts.push(`Decision needed by ${input.decisionDeadline}.`);
  return parts.join(" ");
}

/* ---------- Create request ---------- */

export async function createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  const anonymizedBrief = generateAnonymizedBrief(input);

  const { data, error } = await supabase
    .from("requests")
    .insert({
      client_id:             userId,
      product_type:          input.productType,
      amount:                input.amount,
      purpose:               input.purpose,
      preferred_term_months: input.preferredTermMonths,
      max_rate:              input.maxRate ?? null,
      decision_deadline:     input.decisionDeadline ?? null,
      anonymized_brief:      anonymizedBrief,
      status:                "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create request." };
  }

  await audit.requestCreated(data.id, input.amount, input.productType);
  return { ok: true, requestId: data.id };
}

/* ---------- Get single request ---------- */

export async function getRequest(id: string): Promise<RequestDetail | null> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id:                data.id,
    productType:       data.product_type,
    amount:            data.amount,
    purpose:           data.purpose,
    preferredTermMonths: data.preferred_term_months,
    maxRate:           data.max_rate,
    decisionDeadline:  data.decision_deadline,
    anonymizedBrief:   data.anonymized_brief,
    status:            data.status,
    createdAt:         data.created_at,
  };
}

/* ---------- Get bids for a request ----------
   Reads institution.institution_bids (the live bid source).
   Sorted by rate ascending so cheapest offer is always first.
---------------------------------------------- */

export async function getRequestBids(requestId: string): Promise<Bid[]> {
  const { data, error } = await instSupabase
    .from("institution_bids")
    .select("id, request_id, institution_id, rate, rate_type, amount_offered, term_months, conditions, status, submitted_at, institutions(name)")
    .eq("request_id", requestId)
    .eq("status", "submitted")
    .order("rate", { ascending: true });

  if (error || !data) return [];

  return data.map((b: Record<string, unknown>) => ({
    id:              b.id as string,
    requestId:       b.request_id as string,
    bankId:          b.institution_id as string,
    institutionName: (b.institutions as { name: string } | null)?.name ?? "Institution",
    rate:            b.rate as number,
    rateType:        (b.rate_type as "fixed" | "variable") ?? "fixed",
    amountOffered:   b.amount_offered as number,
    termMonths:      b.term_months as number,
    conditions:      b.conditions as Record<string, unknown> | null,
    terms:           null,
    status:          "submitted" as const,
    submittedAt:     b.submitted_at as string,
    createdAt:       b.submitted_at as string,
    source:          "institution" as const,
  }));
}

/* ---------- Accept a bid ---------- */

export async function acceptBid(bidId: string, requestId: string): Promise<AcceptBidResult> {
  // Resolve the institution bid being accepted
  const { data: instBid } = await instSupabase
    .from("institution_bids")
    .select("id, institution_id")
    .eq("id", bidId)
    .single();

  if (!instBid) return { ok: false, error: "Bid not found." };

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("bid_acceptances")
    .insert({
      bid_id:         bidId,
      request_id:     requestId,
      client_id:      user?.id,
      institution_id: instBid.institution_id,
    });
  if (error) return { ok: false, error: error.message };

  // Close the request
  const { error: reqError } = await supabase
    .from("requests")
    .update({ status: "closed" })
    .eq("id", requestId);
  if (reqError) return { ok: false, error: reqError.message };

  await audit.bidAccepted(bidId, requestId);
  return { ok: true };
}
