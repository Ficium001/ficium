import { supabase } from "../../../shared/lib/supabase";
import { audit } from "../../../shared/lib/audit";

export type EmploymentStatus =
  | "employed" | "self_employed" | "business_owner" | "freelance"
  | "retired" | "student" | "unemployed";

export type LoanType =
  | "personal" | "mortgage" | "vehicle" | "business" | "credit_card" | "other";

export type SourceOfWealth =
  | "salary" | "business" | "investments" | "inheritance"
  | "property" | "savings" | "other";

export type EmploymentDetails = {
  employerName?: string; industry?: string; jobTitle?: string;
  yearsOfEmployment?: number; employmentType?: "permanent" | "contract" | "temporary";
  workEmail?: string; employerAddress?: string; businessName?: string;
  brnNumber?: string; yearsInBusiness?: number; averageMonthlyRevenue?: number;
  businessAddress?: string; taxRegistrationNumber?: string; companyType?: string;
  numberOfEmployees?: number; annualRevenue?: number; primaryProfession?: string;
  primaryClientsRegion?: string; portfolioWebsite?: string; pensionIncome?: number;
  otherIncomeSources?: string; institutionName?: string;
  sponsorType?: "parents" | "self" | "scholarship" | "employer" | "other";
  monthlyAllowance?: number; partTimeEmployment?: boolean;
};

export type AssetDetails = {
  savings: number; investments: number; propertyValue: number;
  vehicleValue: number; businessAssets: number; otherAssets: number;
};

export type LoanEntry = {
  loanType: LoanType; outstandingAmount: number; monthlyRepayment: number;
  bankName: string; remainingMonths?: number;
};

export type ComplianceDetails = {
  sourceOfWealth?: SourceOfWealth; sourceOfWealthOther?: string; isPep: boolean;
  pepDetails?: string; taxResidency: string; missedRepayments: boolean;
  blacklisted: boolean; bankruptcy: boolean; legalDisputes: boolean;
};

export type DossierInput = {
  employmentStatus: EmploymentStatus; monthlyIncome: number; additionalIncome: number; dependants?: number;
  employmentDetails: EmploymentDetails; assets: AssetDetails;
  hasExistingLoans: boolean; loans: LoanEntry[]; compliance: ComplianceDetails;
};

export type DossierResult =
  | { ok: true; healthScore: number; riskScore: number; affordabilityScore: number }
  | { ok: false; error: string };

function computeNetWorth(a: AssetDetails): number {
  return a.savings + a.investments + a.propertyValue + a.vehicleValue + a.businessAssets + a.otherAssets;
}
function computeTotalIncome(d: DossierInput): number { return d.monthlyIncome + d.additionalIncome; }
function computeDebtToIncome(d: DossierInput): number {
  const totalIncome = computeTotalIncome(d);
  if (totalIncome === 0) return 1;
  const totalRepayment = d.loans.reduce((sum, l) => sum + l.monthlyRepayment, 0);
  return totalRepayment / totalIncome;
}

export function computeHealthScore(d: DossierInput): number {
  let score = 50;
  const income = computeTotalIncome(d);
  if (income >= 200000) score += 22; else if (income >= 100000) score += 16;
  else if (income >= 50000) score += 10; else if (income >= 25000) score += 5;
  const netWorth = computeNetWorth(d.assets);
  if (income > 0) {
    const months = netWorth / income;
    if (months >= 36) score += 15; else if (months >= 18) score += 10; else if (months >= 6) score += 5;
  }
  const stableEmployment = ["employed", "self_employed", "business_owner"].includes(d.employmentStatus);
  if (stableEmployment) score += 6;
  if (d.employmentStatus === "unemployed") score -= 15;
  if (d.employmentStatus === "student") score -= 8;
  const dti = computeDebtToIncome(d);
  if (dti > 0.6) score -= 25; else if (dti > 0.4) score -= 15;
  else if (dti > 0.25) score -= 8; else if (dti > 0.1) score -= 3;
  if (d.compliance.bankruptcy) score -= 30;
  if (d.compliance.blacklisted) score -= 25;
  if (d.compliance.missedRepayments) score -= 12;
  if (d.compliance.legalDisputes) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeRiskScore(d: DossierInput): number {
  let risk = 30;
  if (d.compliance.bankruptcy) risk += 35; if (d.compliance.blacklisted) risk += 30;
  if (d.compliance.missedRepayments) risk += 18; if (d.compliance.legalDisputes) risk += 12;
  if (d.compliance.isPep) risk += 10;
  const dti = computeDebtToIncome(d);
  if (dti > 0.6) risk += 25; else if (dti > 0.4) risk += 15; else if (dti > 0.25) risk += 8;
  if (d.employmentStatus === "unemployed") risk += 20;
  if (d.employmentStatus === "freelance" || d.employmentStatus === "student") risk += 8;
  const income = computeTotalIncome(d);
  if (income < 15000) risk += 15; else if (income < 30000) risk += 5;
  return Math.max(0, Math.min(100, Math.round(risk)));
}

export function computeAffordabilityScore(d: DossierInput): number {
  const income = computeTotalIncome(d);
  if (income === 0) return 0;
  const dti = computeDebtToIncome(d);
  let score = Math.round((1 - dti) * 80);
  const netWorth = computeNetWorth(d.assets);
  if (netWorth > income * 12) score += 15;
  else if (netWorth > income * 6) score += 8;
  else if (netWorth > income * 3) score += 3;
  if (income < 20000) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function requiresEDD(d: DossierInput): boolean {
  if (d.compliance.isPep) return true;
  if (computeTotalIncome(d) > 500000) return true;
  if (computeNetWorth(d.assets) > 10000000) return true;
  if (d.employmentStatus === "business_owner" && (d.employmentDetails.annualRevenue ?? 0) > 5000000) return true;
  return false;
}

/**
 * Map the onboarding dossier onto the flat client_financial_snapshot shape that
 * NetWorth / FinancialHealth / the AI advisor read from. Fields the dossier
 * doesn't capture (fixed deposits, monthly expenses/savings) are left for the
 * NetWorth editor to fill — we never fabricate them. Generated columns
 * (total_*, net_worth, debt_to_income_ratio) are intentionally omitted.
 */
export function snapshotFromDossier(input: DossierInput, clientId: string) {
  const loans = input.hasExistingLoans ? input.loans : [];
  const balByType = (t: LoanType) =>
    loans.filter((l) => l.loanType === t).reduce((s, l) => s + (l.outstandingAmount || 0), 0);
  return {
    client_id: clientId,
    // assets
    cash_savings:      input.assets.savings,
    investments_value: input.assets.investments,
    property_value:    input.assets.propertyValue,
    vehicle_value:     input.assets.vehicleValue,
    other_assets:      input.assets.businessAssets + input.assets.otherAssets,
    // liabilities — bucketed from the typed loan list (snapshot has no business
    // or generic bucket, so business + other fold into other_liabilities)
    mortgage_balance:      balByType("mortgage"),
    personal_loan_balance: balByType("personal"),
    credit_card_balance:   balByType("credit_card"),
    vehicle_loan_balance:  balByType("vehicle"),
    other_liabilities:     balByType("business") + balByType("other"),
    // monthly cashflow
    monthly_income:        input.monthlyIncome + input.additionalIncome,
    monthly_loan_payments: loans.reduce((s, l) => s + (l.monthlyRepayment || 0), 0),
    // fixed_deposits / monthly_expenses / monthly_savings: no dossier source → DB defaults (0)
  };
}

export async function submitDossier(input: DossierInput): Promise<DossierResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  const healthScore = computeHealthScore(input);
  const riskScore = computeRiskScore(input);
  const affordabilityScore = computeAffordabilityScore(input);
  const eddRequired = requiresEDD(input);

  // 1. V2: client_dossier (replaces financial_profiles) — onConflict: client_id
  const { error: fpError } = await supabase.from("client_dossier").upsert(
    {
      client_id: userId,
      employment_status: input.employmentStatus,
      monthly_income: input.monthlyIncome,
      dependants:     input.dependants ?? 0,
      additional_income: input.additionalIncome,
      total_net_worth: computeNetWorth(input.assets),
      has_existing_loans: input.hasExistingLoans,
      pep_declaration: input.compliance.isPep,
      tax_residency: input.compliance.taxResidency,
      source_of_wealth: input.compliance.sourceOfWealth,
      health_score: healthScore,
      risk_score: riskScore,
      affordability_score: affordabilityScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );
  if (fpError) return { ok: false, error: `Profile: ${fpError.message}` };

  // 2. employment_details (unchanged — still uses user_id FK)
  const e = input.employmentDetails;
  const { error: empError } = await supabase.from("employment_details").upsert(
    {
      user_id: userId, employer_name: e.employerName ?? null, industry: e.industry ?? null,
      job_title: e.jobTitle ?? null, years_of_employment: e.yearsOfEmployment ?? null,
      employment_type: e.employmentType ?? null, work_email: e.workEmail ?? null,
      employer_address: e.employerAddress ?? null, business_name: e.businessName ?? null,
      brn_number: e.brnNumber ?? null, years_in_business: e.yearsInBusiness ?? null,
      average_monthly_revenue: e.averageMonthlyRevenue ?? null,
      business_address: e.businessAddress ?? null,
      tax_registration_number: e.taxRegistrationNumber ?? null,
      company_type: e.companyType ?? null, number_of_employees: e.numberOfEmployees ?? null,
      annual_revenue: e.annualRevenue ?? null, primary_profession: e.primaryProfession ?? null,
      primary_clients_region: e.primaryClientsRegion ?? null,
      portfolio_website: e.portfolioWebsite ?? null, pension_income: e.pensionIncome ?? null,
      other_income_sources: e.otherIncomeSources ?? null, institution_name: e.institutionName ?? null,
      sponsor_type: e.sponsorType ?? null, monthly_allowance: e.monthlyAllowance ?? null,
      part_time_employment: e.partTimeEmployment ?? false,
    },
    { onConflict: "user_id" }
  );
  if (empError) return { ok: false, error: `Employment: ${empError.message}` };

  // 3. asset_details (unchanged — still uses user_id FK)
  const { error: assetError } = await supabase.from("asset_details").upsert(
    {
      user_id: userId, savings: input.assets.savings, investments: input.assets.investments,
      property_value: input.assets.propertyValue, vehicle_value: input.assets.vehicleValue,
      business_assets: input.assets.businessAssets, other_assets: input.assets.otherAssets,
    },
    { onConflict: "user_id" }
  );
  if (assetError) return { ok: false, error: `Assets: ${assetError.message}` };

  // 4. V2: client_loan_details (replaces loan_details, uses client_id)
  await supabase.from("client_loan_details").delete().eq("client_id", userId);
  if (input.hasExistingLoans && input.loans.length > 0) {
    const { error: loanError } = await supabase.from("client_loan_details").insert(
      input.loans.map((l) => ({
        client_id: userId,
        loan_type: l.loanType,
        outstanding_amount: l.outstandingAmount,
        monthly_repayment: l.monthlyRepayment,
        bank_name: l.bankName,
        remaining_months: l.remainingMonths ?? null,
      }))
    );
    if (loanError) return { ok: false, error: `Loans: ${loanError.message}` };
  }

  // 5. compliance_details (unchanged — still uses user_id FK)
  const { error: compError } = await supabase.from("compliance_details").upsert(
    {
      user_id: userId, source_of_wealth: input.compliance.sourceOfWealth ?? null,
      source_of_wealth_other: input.compliance.sourceOfWealthOther ?? null,
      is_pep: input.compliance.isPep, pep_details: input.compliance.pepDetails ?? null,
      tax_residency: input.compliance.taxResidency,
      has_credit_issues: input.compliance.missedRepayments || input.compliance.blacklisted ||
        input.compliance.bankruptcy || input.compliance.legalDisputes,
      missed_repayments: input.compliance.missedRepayments,
      blacklisted: input.compliance.blacklisted, bankruptcy: input.compliance.bankruptcy,
      legal_disputes: input.compliance.legalDisputes,
      enhanced_due_diligence_required: eddRequired,
    },
    { onConflict: "user_id" }
  );
  if (compError) return { ok: false, error: `Compliance: ${compError.message}` };

  // 6. Seed client_financial_snapshot so NetWorth / FinancialHealth / the AI
  //    advisor have data immediately after onboarding — without this, those
  //    screens read an empty snapshot and show zeros despite the user having
  //    entered everything here. Seed-once: ignoreDuplicates → INSERT ... ON
  //    CONFLICT DO NOTHING, so we never clobber a snapshot the user has since
  //    refined in the NetWorth editor. Best-effort: the dossier already
  //    succeeded, so a snapshot hiccup must not fail onboarding.
  const { error: snapError } = await supabase
    .from("client_financial_snapshot")
    .upsert(snapshotFromDossier(input, userId), { onConflict: "client_id", ignoreDuplicates: true });
  if (snapError) console.error("Snapshot seed (non-fatal):", snapError.message);

  await audit.financialProfileCreated(userId);
  return { ok: true, healthScore, riskScore, affordabilityScore };
}
