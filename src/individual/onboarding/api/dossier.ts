import { supabase , getCachedUser } from "../../../shared/lib/supabase";
import { audit } from "../../../shared/lib/audit";
import type { DossierInput as DossierFormValues } from "@/individual/onboarding/types/dossier";

// ─────────────────────────────────────────────────────────────────────────────
// Financial profile ("dossier") — read for editing, and save.
//
// Each fact is written to exactly one table here; the database derives every
// other copy (migration 20261114070000_financial_profile_single_source):
//   employment, income, dependants   client_dossier
//   job / business details           employment_details
//   existing loans                   client_loan_details (replace_client_loans)
//   PEP, tax, wealth, credit history compliance_details
//   assets                           client_financial_snapshot
// Health, risk and affordability scores are computed by the database from
// those rows. They are never sent from the browser: whatever is sent for them
// is ignored, so a client cannot set their own risk tier.
// ─────────────────────────────────────────────────────────────────────────────

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

type Scores = { healthScore: number | null; riskScore: number | null; affordabilityScore: number | null };

export type DossierResult =
  | ({ ok: true } & Scores)
  | { ok: false; error: string };

/** What the client has itemised elsewhere; those asset figures are not edited here. */
type Itemised = { accounts: boolean; holdings: boolean };

export type LoadedDossier = {
  /** true when the client has saved a profile before. */
  exists:   boolean;
  values:   Partial<DossierFormValues>;
  itemised: Itemised;
};

const num = (v: unknown): number => (v == null ? 0 : Number(v) || 0);
const opt = (v: unknown): number | undefined => (v == null ? undefined : Number(v));
const str = (v: unknown): string => (v == null ? "" : String(v));

/** The saved profile, shaped as the form's values, so it can be edited in place. */
export async function getDossier(): Promise<LoadedDossier> {
  const { data: authData } = await getCachedUser();
  const uid = authData.user?.id;
  const empty: LoadedDossier = { exists: false, values: {}, itemised: { accounts: false, holdings: false } };
  if (!uid) return empty;

  const [dossier, employment, loans, compliance, snapshot, accounts, holdings] = await Promise.all([
    supabase.from("client_dossier")
      .select("employment_status, monthly_income, additional_income, dependants")
      .eq("client_id", uid).maybeSingle(),
    supabase.from("employment_details").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("client_loan_details")
      .select("loan_type, outstanding_amount, monthly_repayment, bank_name, remaining_months")
      .eq("client_id", uid),
    supabase.from("compliance_details")
      .select("source_of_wealth, source_of_wealth_other, is_pep, pep_details, tax_residency, missed_repayments, blacklisted, bankruptcy, legal_disputes")
      .eq("user_id", uid).maybeSingle(),
    supabase.from("client_financial_snapshot")
      .select("cash_savings, investments_value, property_value, vehicle_value, business_assets, other_assets")
      .eq("client_id", uid).maybeSingle(),
    supabase.rpc("finance_accounts_summary", { p_reporting_currency: null }),
    supabase.rpc("finance_holdings_summary", { p_reporting_currency: null }),
  ]);

  const firstError = [dossier, employment, loans, compliance, snapshot].find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const d = dossier.data as Record<string, unknown> | null;
  const e = (employment.data ?? {}) as Record<string, unknown>;
  const c = compliance.data as Record<string, unknown> | null;
  const s = (snapshot.data ?? {}) as Record<string, unknown>;
  const loanRows = (loans.data ?? []) as Record<string, unknown>[];

  const itemised: Itemised = {
    accounts: Array.isArray(accounts.data) && accounts.data.length > 0,
    holdings: Array.isArray(holdings.data) && holdings.data.length > 0,
  };
  if (!d) return { ...empty, itemised };

  return {
    exists: true,
    itemised,
    values: {
      employmentStatus:      d.employment_status as DossierFormValues["employmentStatus"],
      monthlyIncome:         num(d.monthly_income),
      additionalIncome:      num(d.additional_income),
      dependants:            num(d.dependants),
      employerName:          str(e.employer_name),
      industry:              str(e.industry),
      jobTitle:              str(e.job_title),
      yearsOfEmployment:     opt(e.years_of_employment),
      employmentType:        (e.employment_type as DossierFormValues["employmentType"]) ?? undefined,
      workEmail:             str(e.work_email),
      businessName:          str(e.business_name),
      brnNumber:             str(e.brn_number),
      yearsInBusiness:       opt(e.years_in_business),
      averageMonthlyRevenue: opt(e.average_monthly_revenue),
      taxRegistrationNumber: str(e.tax_registration_number),
      companyType:           str(e.company_type),
      numberOfEmployees:     opt(e.number_of_employees),
      annualRevenue:         opt(e.annual_revenue),
      primaryProfession:     str(e.primary_profession),
      primaryClientsRegion:  str(e.primary_clients_region),
      pensionIncome:         opt(e.pension_income),
      otherIncomeSources:    str(e.other_income_sources),
      institutionName:       str(e.institution_name),
      sponsorType:           (e.sponsor_type as DossierFormValues["sponsorType"]) ?? undefined,
      monthlyAllowance:      opt(e.monthly_allowance),
      savings:               num(s.cash_savings),
      investments:           num(s.investments_value),
      propertyValue:         num(s.property_value),
      vehicleValue:          num(s.vehicle_value),
      businessAssets:        num(s.business_assets),
      otherAssets:           num(s.other_assets),
      hasExistingLoans:      loanRows.length > 0,
      loans: loanRows.map((l) => ({
        loanType:          l.loan_type as LoanType,
        outstandingAmount: num(l.outstanding_amount),
        monthlyRepayment:  num(l.monthly_repayment),
        bankName:          str(l.bank_name),
        remainingMonths:   opt(l.remaining_months),
      })),
      sourceOfWealth:      (c?.source_of_wealth as DossierFormValues["sourceOfWealth"]) ?? undefined,
      sourceOfWealthOther: str(c?.source_of_wealth_other),
      isPep:               Boolean(c?.is_pep),
      pepDetails:          str(c?.pep_details),
      taxResidency:        str(c?.tax_residency) || "MU",
      missedRepayments:    Boolean(c?.missed_repayments),
      blacklisted:         Boolean(c?.blacklisted),
      bankruptcy:          Boolean(c?.bankruptcy),
      legalDisputes:       Boolean(c?.legal_disputes),
    },
  };
}

/** Live preview from the same formula the database stores. Pure: reads no tables. */
export async function previewScores(p: {
  income: number; employmentStatus?: string; netWorth: number; totalAssets: number;
  monthlyRepayment: number; annualRevenue?: number; isPep?: boolean; bankruptcy?: boolean;
  blacklisted?: boolean; missedRepayments?: boolean; legalDisputes?: boolean;
}): Promise<number | null> {
  const { data, error } = await supabase.rpc("compute_client_scores", {
    p: {
      income: p.income, employment_status: p.employmentStatus ?? null, net_worth: p.netWorth,
      total_assets: p.totalAssets, monthly_repayment: p.monthlyRepayment,
      annual_revenue: p.annualRevenue ?? 0, is_pep: !!p.isPep, bankruptcy: !!p.bankruptcy,
      blacklisted: !!p.blacklisted, missed_repayments: !!p.missedRepayments,
      legal_disputes: !!p.legalDisputes,
    },
  });
  if (error || !data) return null;
  const score = Number((data as Record<string, unknown>).health_score);
  return Number.isFinite(score) ? score : null;
}

export async function submitDossier(input: DossierInput, opts: { isUpdate?: boolean } = {}): Promise<DossierResult> {
  const { data: authData } = await getCachedUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  // 1. client_dossier — employment status, income, dependants. Scores, net
  //    worth and has_existing_loans are derived by the database.
  const { error: fpError } = await supabase.from("client_dossier").upsert(
    {
      client_id:         userId,
      employment_status: input.employmentStatus,
      monthly_income:    input.monthlyIncome,
      additional_income: input.additionalIncome,
      dependants:        input.dependants ?? 0,
      updated_at:        new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );
  if (fpError) return { ok: false, error: `Profile: ${fpError.message}` };

  // 2. employment_details
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

  // 3. client_loan_details — replaced in ONE transaction by replace_client_loans():
  //    a separate delete then insert meant a failed insert left the user with
  //    no loans, and every DSR / health score downstream was computed on the
  //    empty set. The snapshot's liability buckets are derived from these rows.
  const { error: loanError } = await supabase.rpc("replace_client_loans", {
    p_loans: input.hasExistingLoans
      ? input.loans.map((l) => ({
          loan_type: l.loanType,
          outstanding_amount: l.outstandingAmount,
          monthly_repayment: l.monthlyRepayment,
          bank_name: l.bankName,
          remaining_months: l.remainingMonths ?? null,
        }))
      : [],
  });
  if (loanError) return { ok: false, error: `Loans: ${loanError.message}` };

  // 4. compliance_details — the only home for PEP, tax residency, source of
  //    wealth and credit-history declarations.
  const { error: compError } = await supabase.from("compliance_details").upsert(
    {
      user_id: userId, source_of_wealth: input.compliance.sourceOfWealth ?? null,
      source_of_wealth_other: input.compliance.sourceOfWealthOther ?? null,
      is_pep: input.compliance.isPep, pep_details: input.compliance.pepDetails ?? null,
      tax_residency: input.compliance.taxResidency,
      missed_repayments: input.compliance.missedRepayments,
      blacklisted: input.compliance.blacklisted, bankruptcy: input.compliance.bankruptcy,
      legal_disputes: input.compliance.legalDisputes,
    },
    { onConflict: "user_id" }
  );
  if (compError) return { ok: false, error: `Compliance: ${compError.message}` };

  // 5. client_financial_snapshot — the home of the assets. Cash and
  //    investments are the declared figures; once itemised in Accounts the
  //    database replaces them. Income and liabilities are derived, not sent.
  const { error: snapError } = await supabase.from("client_financial_snapshot").upsert(
    {
      client_id:         userId,
      cash_savings:      input.assets.savings,
      investments_value: input.assets.investments,
      property_value:    input.assets.propertyValue,
      vehicle_value:     input.assets.vehicleValue,
      business_assets:   input.assets.businessAssets,
      other_assets:      input.assets.otherAssets,
    },
    { onConflict: "client_id" }
  );
  if (snapError) return { ok: false, error: `Assets: ${snapError.message}` };

  // 6. Read back the scores the database computed.
  const { data: scored } = await supabase.from("client_dossier")
    .select("health_score, risk_score, affordability_score")
    .eq("client_id", userId).maybeSingle();

  await (opts.isUpdate ? audit.financialProfileUpdated(userId) : audit.financialProfileCreated(userId));
  return {
    ok: true,
    healthScore:        scored?.health_score ?? null,
    riskScore:          scored?.risk_score ?? null,
    affordabilityScore: scored?.affordability_score ?? null,
  };
}
