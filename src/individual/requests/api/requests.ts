import { supabase, institutionDb } from "../../../shared/lib/supabase";
import { audit } from "../../../shared/lib/audit";

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
  | "investment_account";

export type RequestStatus = "open" | "closed" | "cancelled";

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

/* ---------- Anonymized brief ---------- */

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
   Reads from BOTH schemas and merges:
   1. institution.institution_bids  — bids placed through institution portal
   2. public.bids                   — legacy bids (existing data)
   Sorted by rate ascending so cheapest offer is always first.
---------------------------------------------- */

export async function getRequestBids(requestId: string): Promise<Bid[]> {
  const [legacyResult, institutionResult] = await Promise.allSettled([
    // Legacy public.bids table
    supabase
      .from("bids")
      .select("id, request_id, bank_id, rate, terms, status, created_at, bank_profiles(institution_name)")
      .eq("request_id", requestId)
      .order("rate", { ascending: true }),

    // Institution schema bids
    instSupabase
      .from("institution_bids")
      .select("id, request_id, institution_id, rate, rate_type, amount_offered, term_months, conditions, status, submitted_at, institutions(name)")
      .eq("request_id", requestId)
      .eq("status", "submitted")
      .order("rate", { ascending: true }),
  ]);

  const legacyBids: Bid[] = legacyResult.status === "fulfilled" && legacyResult.value.data
    ? legacyResult.value.data.map((b: Record<string, unknown>) => ({
        id:              b.id as string,
        requestId:       b.request_id as string,
        bankId:          b.bank_id as string,
        institutionName: (b.bank_profiles as { institution_name: string } | null)?.institution_name ?? "Bank",
        rate:            b.rate as number,
        rateType:        "fixed" as const,
        amountOffered:   0,
        termMonths:      0,
        conditions:      null,
        terms:           (b.terms as string | null) ?? null,
        status:          b.status as Bid["status"],
        submittedAt:     b.created_at as string,
        createdAt:       b.created_at as string,
        source:          "legacy" as const,
      }))
    : [];

  const institutionBids: Bid[] = institutionResult.status === "fulfilled" && institutionResult.value.data
    ? institutionResult.value.data.map((b: Record<string, unknown>) => ({
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
      }))
    : [];

  // Merge and sort by rate ascending
  return [...legacyBids, ...institutionBids].sort((a, b) => a.rate - b.rate);
}

/* ---------- Accept a bid ---------- */

export async function acceptBid(bidId: string, requestId: string): Promise<AcceptBidResult> {
  // Determine which schema the bid belongs to
  const { data: instBid } = await instSupabase
    .from("institution_bids")
    .select("id, institution_id")
    .eq("id", bidId)
    .single();

  if (instBid) {
    // Institution schema bid — insert into public.bid_acceptances
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
  } else {
    // Legacy public.bids
    const { error } = await supabase
      .from("bids")
      .update({ status: "accepted" })
      .eq("id", bidId);
    if (error) return { ok: false, error: error.message };
  }

  // Close the request
  const { error: reqError } = await supabase
    .from("requests")
    .update({ status: "closed" })
    .eq("id", requestId);
  if (reqError) return { ok: false, error: reqError.message };

  await audit.bidAccepted(bidId, requestId);
  return { ok: true };
}

/* ---------- Helper ---------- */

export function formatProductType(t: string): string {
  const labels: Record<string, string> = {
    sme_loan:           "SME Loan",
    personal_loan:      "Personal Loan",
    mortgage:           "Mortgage",
    fixed_deposit:      "Fixed Deposit",
    savings_account:    "Savings Account",
    credit_card:        "Credit Card",
    business_account:   "Business Account",
    investment_account: "Investment Account",
  };
  return labels[t] ?? t;
}
