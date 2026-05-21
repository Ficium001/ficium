import { supabase } from "../../../shared/lib/supabase";

/* ============================================================
   TYPES — derived from client_profile_view
   ============================================================ */

export type ProfileCompletion = {
  accountCreated: boolean;
  kycVerified: boolean;
  proofOfAddressDone: boolean;
  financialProfileDone: boolean;
  sourceOfWealthDone: boolean;
  percent: number;
};

export type ProfileScores = {
  healthScore: number | null;
  riskScore: number | null;
  affordabilityScore: number | null;
};

export type ProfileCore = {
  userId: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  kycStatus: "pending" | "verified" | "rejected";
  employmentStatus: string | null;
  monthlyIncome: number | null;
  totalNetWorth: number | null;
  hasExistingLoans: boolean;
  isPep: boolean;
  eddRequired: boolean;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
};

/**
 * Full profile — everything the dashboard needs in one object.
 * Sourced from client_profile_view (single DB query).
 */
export type ProfileSummary = ProfileCore &
  ProfileScores & {
    completion: ProfileCompletion;
    // convenience flags used by route guards and banners
    hasDossier: boolean;
  };

/* ============================================================
   REQUEST SUMMARY TYPE
   ============================================================ */

export type RequestSummary = {
  id: string;
  productType: string;
  amount: number;
  status: "open" | "closed" | "accepted" | "expired";
  createdAt: string;
  bidCount: number;
  bestRate: number | null;
};

/* ============================================================
   API — thin client over DB view
   ============================================================ */

/**
 * getProfileSummary — single query to client_profile_view.
 * Adding new fields to the dashboard = add to view + add here.
 * Nothing else changes.
 */
export async function getProfileSummary(): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("client_profile_view")
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  const completion: ProfileCompletion = {
    accountCreated: true,
    kycVerified: data.kyc_verified ?? false,
    proofOfAddressDone: data.proof_of_address_done ?? false,
    financialProfileDone: data.financial_profile_done ?? false,
    sourceOfWealthDone: data.source_of_wealth_done ?? false,
    percent: data.completion_percent ?? 20,
  };

  return {
    // core identity
    userId: data.user_id,
    email: data.email,
    fullName: data.full_name,
    firstName: data.first_name,
    kycStatus: data.kyc_status,
    addressLine1: data.address_line_1 ?? null,
    city: data.city ?? null,
    country: data.country ?? null,

    // employment & financial
    employmentStatus: data.employment_status ?? null,
    monthlyIncome: data.monthly_income ?? null,
    totalNetWorth: data.total_net_worth ?? null,
    hasExistingLoans: data.has_existing_loans ?? false,
    isPep: data.is_pep ?? false,
    eddRequired: data.enhanced_due_diligence_required ?? false,

    // scores
    healthScore: data.health_score ?? null,
    riskScore: data.risk_score ?? null,
    affordabilityScore: data.affordability_score ?? null,

    // completion
    completion,

    // convenience
    hasDossier: data.financial_profile_done ?? false,
  };
}

/**
 * getMyRequests — paginated request list with bid aggregation.
 * Two-query approach; stays here (not in the view) because
 * requests are a separate domain.
 */
export async function getMyRequests(): Promise<RequestSummary[]> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return [];

  const { data: requests, error: reqError } = await supabase
    .from("requests")
    .select("id, product_type, amount, status, created_at")
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (reqError || !requests || requests.length === 0) return [];

  const ids = requests.map((r) => r.id);

  const { data: bids } = await supabase
    .from("bids")
    .select("request_id, interest_rate")
    .in("request_id", ids);

  const byRequest = new Map<string, { count: number; bestRate: number | null }>();
  for (const id of ids) byRequest.set(id, { count: 0, bestRate: null });
  for (const b of bids || []) {
    const entry = byRequest.get(b.request_id);
    if (!entry) continue;
    entry.count += 1;
    if (entry.bestRate === null || b.interest_rate < entry.bestRate) {
      entry.bestRate = b.interest_rate;
    }
  }

  return requests.map((r) => ({
    id: r.id,
    productType: r.product_type,
    amount: r.amount,
    status: r.status,
    createdAt: r.created_at,
    bidCount: byRequest.get(r.id)?.count ?? 0,
    bestRate: byRequest.get(r.id)?.bestRate ?? null,
  }));
}

/* ============================================================
   HELPERS
   ============================================================ */

export function formatMUR(amount: number): string {
  return new Intl.NumberFormat("en-MU", {
    style: "currency",
    currency: "MUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatProductType(t: string): string {
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

/**
 * computeNextActions — derives actionable steps from profile state.
 * Lives here (not in a hook) so it can be tested independently.
 * Add new actions here as the product grows — nothing else changes.
 */
export type NextAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  priority: "high" | "medium" | "low";
  done: boolean;
};

export function computeNextActions(p: ProfileSummary): NextAction[] {
  return [
    {
      id: "kyc",
      label: "Verify your identity",
      description: "Upload your ID and selfie so banks can trust your requests.",
      href: "/onboarding/kyc",
      priority: "high" as const,
      done: p.completion.kycVerified,
    },
    {
      id: "proof_of_address",
      label: "Add proof of address",
      description: "A utility bill or bank statement dated within 3 months.",
      href: "/onboarding/kyc",
      priority: "high" as const,
      done: p.completion.proofOfAddressDone,
    },
    {
      id: "financial_profile",
      label: "Complete your financial profile",
      description: "Help banks understand your income, assets and obligations.",
      href: "/onboarding/dossier",
      priority: "high" as const,
      done: p.completion.financialProfileDone,
    },
    {
      id: "source_of_wealth",
      label: "Declare source of wealth",
      description: "Required for compliance and better bid quality.",
      href: "/onboarding/dossier",
      priority: "medium" as const,
      done: p.completion.sourceOfWealthDone,
    },
  ].filter((a) => !a.done);
}

/**
 * computeBankReadiness — derives a 0-100 readiness score.
 * Banks want KYC, address, financial profile, clean credit, stable income.
 */
export function computeBankReadiness(p: ProfileSummary): number {
  let score = 0;
  if (p.completion.kycVerified) score += 25;
  if (p.completion.proofOfAddressDone) score += 15;
  if (p.completion.financialProfileDone) score += 25;
  if (p.completion.sourceOfWealthDone) score += 10;
  if (p.healthScore !== null) score += Math.round((p.healthScore / 100) * 25);
  return Math.min(100, score);
}

/**
 * computeHealthRecommendations — explains what's dragging the score down.
 */
export function computeHealthRecommendations(p: ProfileSummary): string[] {
  const recs: string[] = [];
  if (!p.completion.financialProfileDone) {
    recs.push("Complete your financial profile to unlock a full health score.");
    return recs;
  }
  if (p.healthScore !== null && p.healthScore < 60) {
    if (p.hasExistingLoans) recs.push("Reducing existing debt will improve your score.");
    if ((p.monthlyIncome ?? 0) < 25000) recs.push("A higher declared income improves your health score.");
    if (!p.completion.proofOfAddressDone) recs.push("Adding proof of address improves eligibility.");
    if (!p.completion.sourceOfWealthDone) recs.push("Declaring your source of wealth boosts compliance score.");
  }
  if (recs.length === 0 && p.healthScore !== null && p.healthScore >= 60) {
    recs.push("Your profile looks strong. Keep it up to date for the best offers.");
  }
  return recs;
}