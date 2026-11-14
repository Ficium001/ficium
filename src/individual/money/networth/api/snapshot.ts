// src/individual/money/networth/api/snapshot.ts
// Real financial snapshot — assets, liabilities, cashflow
import { supabase , getCachedUser } from "@/shared/lib/supabase";

export type FinancialSnapshot = {
  /** false when no snapshot row exists yet for this user (ZERO fallback). */
  exists?:            boolean;
  // Assets
  cashSavings:        number;
  fixedDeposits:      number;
  investmentsValue:   number;
  propertyValue:      number;
  vehicleValue:       number;
  businessAssets:     number;
  otherAssets:        number;
  totalAssets:        number;
  // Liabilities
  mortgageBalance:    number;
  personalLoanBalance:number;
  creditCardBalance:  number;
  vehicleLoanBalance: number;
  otherLiabilities:   number;
  totalLiabilities:   number;
  // Computed
  netWorth:           number;
  debtToIncomeRatio:  number;
  // Cashflow
  monthlyIncome:      number;
  monthlyExpenses:    number;
  monthlyLoanPayments:number;
  monthlySavings:     number;
  // Meta
  snapshotDate:       string;
  updatedAt:          string;
};

/**
 * The fields this row is the home of. Everything else on the snapshot is
 * derived by the database (trg_snapshot_derive) and is never sent from here:
 *   income              ← client_dossier
 *   liabilities, loan   ← client_loan_details
 *   payments
 * Cash, deposits and investments are sent as the declared figure; once the
 * client itemises them in Accounts / Holdings the database replaces them.
 */
export const SNAPSHOT_OWNED_KEYS = [
  "cashSavings", "fixedDeposits", "investmentsValue",
  "propertyValue", "vehicleValue", "businessAssets", "otherAssets",
  "monthlyExpenses", "monthlySavings",
] as const;

export type SnapshotInput = Pick<FinancialSnapshot, (typeof SNAPSHOT_OWNED_KEYS)[number]>;

const ZERO: FinancialSnapshot = {
  exists: false,
  cashSavings: 0, fixedDeposits: 0, investmentsValue: 0,
  propertyValue: 0, vehicleValue: 0, businessAssets: 0, otherAssets: 0, totalAssets: 0,
  mortgageBalance: 0, personalLoanBalance: 0, creditCardBalance: 0,
  vehicleLoanBalance: 0, otherLiabilities: 0, totalLiabilities: 0,
  netWorth: 0, debtToIncomeRatio: 0,
  monthlyIncome: 0, monthlyExpenses: 0, monthlyLoanPayments: 0, monthlySavings: 0,
  snapshotDate: new Date().toISOString().split("T")[0],
  updatedAt: new Date().toISOString(),
};

export async function getSnapshot(): Promise<FinancialSnapshot> {
  const { data: { user } } = await getCachedUser();
  if (!user) return ZERO;

  const { data, error } = await supabase
    .from("client_financial_snapshot")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();

  if (error || !data) return ZERO;

  return {
    exists: true,
    cashSavings:         Number(data.cash_savings         ?? 0),
    fixedDeposits:       Number(data.fixed_deposits        ?? 0),
    investmentsValue:    Number(data.investments_value     ?? 0),
    propertyValue:       Number(data.property_value        ?? 0),
    vehicleValue:        Number(data.vehicle_value         ?? 0),
    businessAssets:      Number(data.business_assets       ?? 0),
    otherAssets:         Number(data.other_assets          ?? 0),
    totalAssets:         Number(data.total_assets          ?? 0),
    mortgageBalance:     Number(data.mortgage_balance      ?? 0),
    personalLoanBalance: Number(data.personal_loan_balance ?? 0),
    creditCardBalance:   Number(data.credit_card_balance   ?? 0),
    vehicleLoanBalance:  Number(data.vehicle_loan_balance  ?? 0),
    otherLiabilities:    Number(data.other_liabilities     ?? 0),
    totalLiabilities:    Number(data.total_liabilities     ?? 0),
    netWorth:            Number(data.net_worth             ?? 0),
    debtToIncomeRatio:   Number(data.debt_to_income_ratio  ?? 0),
    monthlyIncome:       Number(data.monthly_income        ?? 0),
    monthlyExpenses:     Number(data.monthly_expenses      ?? 0),
    monthlyLoanPayments: Number(data.monthly_loan_payments ?? 0),
    monthlySavings:      Number(data.monthly_savings       ?? 0),
    snapshotDate:        data.snapshot_date ?? new Date().toISOString().split("T")[0],
    updatedAt:           data.updated_at   ?? new Date().toISOString(),
  };
}

export async function upsertSnapshot(input: SnapshotInput): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await getCachedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("client_financial_snapshot")
    .upsert({
      client_id:         user.id,
      cash_savings:      input.cashSavings,
      fixed_deposits:    input.fixedDeposits,
      investments_value: input.investmentsValue,
      property_value:    input.propertyValue,
      vehicle_value:     input.vehicleValue,
      business_assets:   input.businessAssets,
      other_assets:      input.otherAssets,
      monthly_expenses:  input.monthlyExpenses,
      monthly_savings:   input.monthlySavings,
      snapshot_date:     new Date().toISOString().split("T")[0],
    }, { onConflict: "client_id" });

  return { ok: !error, error: error?.message };
}
