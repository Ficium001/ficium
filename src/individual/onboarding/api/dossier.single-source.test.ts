import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression for the financial-profile single-source change:
//  - the browser must never send scores or any other derived figure
//    (a client could set its own risk tier, and banks read it);
//  - each fact is written to one table only;
//  - "Update financial profile" opens with the saved values, not a blank form.

type Write = { table: string; row: Record<string, unknown> };
const writes: Write[] = [];
let rows: Record<string, unknown> = {};

vi.mock("@/shared/lib/supabase", () => {
  const table = (name: string) => {
    const result = () => ({ data: rows[name] ?? null, error: null });
    const chain = {
      eq: () => chain,
      maybeSingle: async () => result(),
      then: (resolve: (v: unknown) => void) => resolve(result()),
    };
    return {
      upsert: async (row: Record<string, unknown>) => { writes.push({ table: name, row }); return { error: null }; },
      insert: async (row: Record<string, unknown>) => { writes.push({ table: name, row }); return { error: null }; },
      select: () => chain,
    };
  };
  return {
    getCachedUser: async () => ({ data: { user: { id: "user-1" } } }),
    supabase: {
      from: (name: string) => table(name),
      rpc: async (fn: string) => ({ data: rows[`rpc:${fn}`] ?? null, error: null }),
    },
  };
});
vi.mock("@/shared/lib/audit", () => ({ audit: new Proxy({}, { get: () => () => {} }) }));

import { submitDossier, getDossier, type DossierInput } from "./dossier";

const input: DossierInput = {
  employmentStatus: "employed", monthlyIncome: 80000, additionalIncome: 5000, dependants: 1,
  employmentDetails: { employerName: "Acme", jobTitle: "Analyst", employmentType: "permanent", annualRevenue: 0 },
  assets: { savings: 100000, investments: 50000, propertyValue: 4000000, vehicleValue: 300000, businessAssets: 70000, otherAssets: 20000 },
  hasExistingLoans: true,
  loans: [{ loanType: "mortgage", outstandingAmount: 2000000, monthlyRepayment: 15000, bankName: "MCB" }],
  compliance: { isPep: false, taxResidency: "MU", sourceOfWealth: "salary", missedRepayments: false, blacklisted: false, bankruptcy: false, legalDisputes: false },
};

const DERIVED_DOSSIER = ["health_score", "risk_score", "affordability_score", "edd_required", "total_net_worth", "has_existing_loans"];
const DERIVED_SNAPSHOT = [
  "monthly_income", "monthly_loan_payments", "mortgage_balance", "personal_loan_balance",
  "credit_card_balance", "vehicle_loan_balance", "other_liabilities", "total_assets", "net_worth",
];

describe("submitDossier writes each fact once and no derived figure", () => {
  beforeEach(() => { writes.length = 0; rows = { client_dossier: { health_score: 71, risk_score: 38, affordability_score: 66 } }; });

  it("never sends a score, net worth or loan flag to client_dossier", async () => {
    await submitDossier(input);
    const row = writes.find((w) => w.table === "client_dossier")!.row;
    for (const k of DERIVED_DOSSIER) expect(row).not.toHaveProperty(k);
    expect(row).toMatchObject({ monthly_income: 80000, additional_income: 5000, dependants: 1, employment_status: "employed" });
  });

  it("keeps compliance facts in compliance_details only", async () => {
    await submitDossier(input);
    const dossier = writes.find((w) => w.table === "client_dossier")!.row;
    for (const k of ["pep_declaration", "tax_residency", "source_of_wealth", "employer_name"]) expect(dossier).not.toHaveProperty(k);
    const comp = writes.find((w) => w.table === "compliance_details")!.row;
    expect(comp).toMatchObject({ is_pep: false, tax_residency: "MU", source_of_wealth: "salary" });
    expect(comp).not.toHaveProperty("has_credit_issues");
    expect(comp).not.toHaveProperty("enhanced_due_diligence_required");
  });

  it("writes assets to the snapshot, including business assets, and nothing it derives", async () => {
    await submitDossier(input);
    const snap = writes.find((w) => w.table === "client_financial_snapshot")!.row;
    expect(snap).toMatchObject({
      cash_savings: 100000, investments_value: 50000, property_value: 4000000,
      vehicle_value: 300000, business_assets: 70000, other_assets: 20000,
    });
    for (const k of DERIVED_SNAPSHOT) expect(snap).not.toHaveProperty(k);
  });

  it("no longer writes the unused asset_details copy", async () => {
    await submitDossier(input);
    expect(writes.map((w) => w.table)).not.toContain("asset_details");
  });

  it("returns the scores the database computed", async () => {
    expect(await submitDossier(input)).toEqual({ ok: true, healthScore: 71, riskScore: 38, affordabilityScore: 66 });
  });
});

describe("getDossier — the editor opens with the saved profile", () => {
  beforeEach(() => { rows = {}; });

  it("reports no saved profile for a new client", async () => {
    const d = await getDossier();
    expect(d.exists).toBe(false);
    expect(d.values).toEqual({});
  });

  it("maps every saved table back onto the form", async () => {
    rows = {
      client_dossier: { employment_status: "employed", monthly_income: 80000, additional_income: 5000, dependants: 2 },
      employment_details: { employer_name: "Acme", job_title: "Analyst", employment_type: "permanent", years_of_employment: 4 },
      client_loan_details: [{ loan_type: "mortgage", outstanding_amount: "2000000", monthly_repayment: "15000", bank_name: "MCB", remaining_months: 120 }],
      compliance_details: { source_of_wealth: "salary", is_pep: true, pep_details: "Board member", tax_residency: "MU", missed_repayments: true },
      client_financial_snapshot: { cash_savings: 100000, investments_value: 0, property_value: 4000000, vehicle_value: 0, business_assets: 70000, other_assets: 0 },
    };
    const d = await getDossier();
    expect(d.exists).toBe(true);
    expect(d.values).toMatchObject({
      employmentStatus: "employed", monthlyIncome: 80000, additionalIncome: 5000, dependants: 2,
      employerName: "Acme", jobTitle: "Analyst", employmentType: "permanent", yearsOfEmployment: 4,
      savings: 100000, propertyValue: 4000000, businessAssets: 70000,
      hasExistingLoans: true,
      loans: [{ loanType: "mortgage", outstandingAmount: 2000000, monthlyRepayment: 15000, bankName: "MCB", remainingMonths: 120 }],
      sourceOfWealth: "salary", isPep: true, pepDetails: "Board member", taxResidency: "MU", missedRepayments: true,
    });
  });

  it("flags savings and investments kept in Accounts so the form does not edit them", async () => {
    rows = {
      client_dossier: { employment_status: "employed", monthly_income: 1 },
      "rpc:finance_accounts_summary": [{ id: "a1" }],
      "rpc:finance_holdings_summary": [],
    };
    expect((await getDossier()).itemised).toEqual({ accounts: true, holdings: false });
  });
});
