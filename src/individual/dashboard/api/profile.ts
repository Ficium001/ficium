import { persistProfileCache, clearProfileCache } from "@/core/query-client";
import { supabase } from "@/shared/lib/supabase";

export type ProfileCompletion = {
  accountCreated: boolean; kycVerified: boolean; proofOfAddressDone: boolean;
  financialProfileDone: boolean; sourceOfWealthDone: boolean; percent: number;
};

export type ProfileScores = {
  healthScore: number | null; riskScore: number | null; affordabilityScore: number | null;
};

export type ProfileCore = {
  userId: string; email: string; fullName: string | null; firstName: string | null;
  kycStatus: "pending" | "verified" | "rejected"; employmentStatus: string | null;
  monthlyIncome: number | null; totalNetWorth: number | null;
  hasExistingLoans: boolean; isPep: boolean; eddRequired: boolean;
  addressLine1: string | null; city: string | null; country: string | null;
};

export type ProfileSummary = ProfileCore & ProfileScores & {
  completion: ProfileCompletion;
  hasDossier: boolean;
};

export async function getProfileSummary(): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("client_profile_view")
    .select("*")
    .maybeSingle();

  if (error || !data) { clearProfileCache(); return null; }

  const completion: ProfileCompletion = {
    accountCreated: true,
    kycVerified: data.kyc_verified ?? false,
    proofOfAddressDone: data.proof_of_address_done ?? false,
    financialProfileDone: data.financial_profile_done ?? false,
    sourceOfWealthDone: data.source_of_wealth_done ?? false,
    percent: data.completion_percent ?? 20,
  };

  const result = {
    userId: data.user_id, email: data.email, fullName: data.full_name,
    firstName: data.first_name, kycStatus: data.kyc_status,
    addressLine1: data.address_line_1 ?? null, city: data.city ?? null,
    country: data.country ?? null, employmentStatus: data.employment_status ?? null,
    monthlyIncome: data.monthly_income ?? null, totalNetWorth: data.total_net_worth ?? null,
    hasExistingLoans: data.has_existing_loans ?? false, isPep: data.is_pep ?? false,
    eddRequired: data.enhanced_due_diligence_required ?? false,
    healthScore: data.health_score ?? null, riskScore: data.risk_score ?? null,
    affordabilityScore: data.affordability_score ?? null,
    completion, hasDossier: data.financial_profile_done ?? false,
  };
  persistProfileCache(result);
  return result;
}

export function formatMUR(amount: number): string {
  return new Intl.NumberFormat("en-MU", {
    style: "currency", currency: "MUR", maximumFractionDigits: 0,
  }).format(amount);
}

export function formatProductType(t: string): string {
  const labels: Record<string, string> = {
    sme_loan: "SME Loan", personal_loan: "Personal Loan", mortgage: "Mortgage",
    fixed_deposit: "Fixed Deposit", savings_account: "Savings Account",
    credit_card: "Credit Card", business_account: "Business Account",
    investment_account: "Investment Account",
  };
  return labels[t] ?? t;
}

export type NextAction = {
  id: string; label: string; description: string;
  href: string; priority: "high" | "medium" | "low"; done: boolean;
};

export function computeNextActions(p: ProfileSummary): NextAction[] {
  return [
    { id: "kyc", label: "Verify your identity",
      description: "Upload your ID and selfie so banks can trust your requests.",
      href: "/onboarding/kyc", priority: "high" as const, done: p.completion.kycVerified },
    { id: "proof_of_address", label: "Add proof of address",
      description: "A utility bill or bank statement dated within 3 months.",
      href: "/onboarding/kyc", priority: "high" as const, done: p.completion.proofOfAddressDone },
    { id: "financial_profile", label: "Complete your financial profile",
      description: "Help banks understand your income, assets and obligations.",
      href: "/onboarding/dossier", priority: "high" as const, done: p.completion.financialProfileDone },
    { id: "source_of_wealth", label: "Declare source of wealth",
      description: "Required for compliance and better bid quality.",
      href: "/onboarding/dossier", priority: "medium" as const, done: p.completion.sourceOfWealthDone },
  ].filter((a) => !a.done);
}

export function computeBankReadiness(p: ProfileSummary): number {
  let score = 0;
  if (p.completion.kycVerified) score += 25;
  if (p.completion.proofOfAddressDone) score += 15;
  if (p.completion.financialProfileDone) score += 25;
  if (p.completion.sourceOfWealthDone) score += 10;
  if (p.healthScore !== null) score += Math.round((p.healthScore / 100) * 25);
  return Math.min(100, score);
}

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
