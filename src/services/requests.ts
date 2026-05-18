import { supabase } from "../lib/supabase";

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