import { supabase } from "../../../shared/lib/supabase";

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

export type CreateRequestInput = {
  productType: ProductType;
  amount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate?: number;
  decisionDeadline?: string; // ISO date
};

export type CreateRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

/* ---------- Anonymized brief ---------- */

/**
 * STUB — produces a short structured summary banks see (without identity).
 * Eventually this will be a Claude API call producing a polished paragraph;
 * for now the deterministic version is fine and is what banks would query.
 */
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
      client_id: userId,
      product_type: input.productType,
      amount: input.amount,
      purpose: input.purpose,
      preferred_term_months: input.preferredTermMonths,
      max_rate: input.maxRate ?? null,
      decision_deadline: input.decisionDeadline ?? null,
      anonymized_brief: anonymizedBrief,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create request." };
  }
  return { ok: true, requestId: data.id };
}

/* ---------- Helper ---------- */

function formatProductType(t: string): string {
  const labels: Record<string, string> = {
    sme_loan: "SME Loan",
    personal_loan: "Personal Loan",
    mortgage: "Mortgage",
    fixed_deposit: "Fixed Deposit",
    savings_account: "Savings Account",
    credit_card: "Credit Card",
    business_account: "Business Account",
    investment_account: "Investment Account",
  };
  return labels[t] ?? t;
}





/* ---------- Types ---------- */

export type RequestStatus = "open" | "closed" | "cancelled";

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
  terms: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

/* ---------- Get single request ---------- */

export async function getRequest(id: string): Promise<RequestDetail | null> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    productType: data.product_type,
    amount: data.amount,
    purpose: data.purpose,
    preferredTermMonths: data.preferred_term_months,
    maxRate: data.max_rate,
    decisionDeadline: data.decision_deadline,
    anonymizedBrief: data.anonymized_brief,
    status: data.status,
    createdAt: data.created_at,
  };
}

/* ---------- Get bids for a request ---------- */

export async function getRequestBids(requestId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from("bids")
    .select(`
      id,
      request_id,
      bank_id,
      rate,
      terms,
      status,
      created_at,
      bank_profiles ( institution_name )
    `)
    .eq("request_id", requestId)
    .order("rate", { ascending: true });

  if (error || !data) return [];

  return data.map((b: any) => ({
    id: b.id,
    requestId: b.request_id,
    bankId: b.bank_id,
    institutionName: b.bank_profiles?.institution_name ?? "Unknown Bank",
    rate: b.rate,
    terms: b.terms,
    status: b.status,
    createdAt: b.created_at,
  }));
}

/* ---------- Accept a bid ---------- */

export type AcceptBidResult = { ok: true } | { ok: false; error: string };

export async function acceptBid(
  bidId: string,
  requestId: string
): Promise<AcceptBidResult> {
  // Mark the bid as accepted
  const { error: bidError } = await supabase
    .from("bids")
    .update({ status: "accepted" })
    .eq("id", bidId);

  if (bidError) return { ok: false, error: bidError.message };

  // Close the request
  const { error: reqError } = await supabase
    .from("requests")
    .update({ status: "closed" })
    .eq("id", requestId);

  if (reqError) return { ok: false, error: reqError.message };

  return { ok: true };
}

/* ---------- Re-export helper ---------- */
export { formatProductType };