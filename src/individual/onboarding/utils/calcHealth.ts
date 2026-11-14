import type { DossierInput } from "@/individual/onboarding/types/dossier";

// The health SCORE is not computed here. There is one formula, in the database
// (public.compute_client_scores); the onboarding screen asks it for a live
// preview and the stored score is derived from the saved rows. This file only
// sums the form for display and turns a score into a label.

export type HealthResult = {
  /** null until the database has returned a score. */
  score:          number | null;
  colour:         string;
  label:          string;
  insight:        string;
  /** Monthly repayments as a percentage of monthly income. */
  dti:            number;
  totalIncome:    number;
  totalAssets:    number;
  totalDebt:      number;
  netWorth:       number;
  totalRepayment: number;
};

const n = (v: unknown) => Number(v) || 0;

/** Totals from a possibly half-filled form. */
export function summarise(data: Partial<DossierInput>) {
  const totalIncome = n(data.monthlyIncome) + n(data.additionalIncome);
  const totalAssets = [
    data.savings, data.investments, data.propertyValue,
    data.vehicleValue, data.businessAssets, data.otherAssets,
  ].reduce<number>((s, v) => s + n(v), 0);
  const loans = data.hasExistingLoans ? (data.loans ?? []) : [];
  const totalDebt      = loans.reduce<number>((s, l) => s + n(l.outstandingAmount), 0);
  const totalRepayment = loans.reduce<number>((s, l) => s + n(l.monthlyRepayment), 0);
  return {
    totalIncome, totalAssets, totalDebt, totalRepayment,
    netWorth: totalAssets - totalDebt,
    dti: totalIncome > 0 ? (totalRepayment / totalIncome) * 100 : 0,
  };
}

/** Label and colour for a score from the database. */
export function presentScore(score: number | null) {
  if (score == null) {
    return { score, colour: "#94a3b8", label: "Getting started", insight: "Add your income to see your score." };
  }
  if (score >= 80) return { score, colour: "#10b981", label: "Excellent", insight: "A strong profile. Expect competitive bids." };
  if (score >= 60) return { score, colour: "#3D6EF5", label: "Strong",    insight: "A good profile. Less debt or more savings would lift it." };
  if (score >= 40) return { score, colour: "#f59e0b", label: "Good",      insight: "Banks can bid, but expect cautious offers." };
  if (score >= 20) return { score, colour: "#f97316", label: "Fair",      insight: "Reducing debt will lift this fastest." };
  return              { score, colour: "#ef4444", label: "Weak",      insight: "Banks will see this as high risk." };
}

export function calcHealth(data: Partial<DossierInput>, score: number | null): HealthResult {
  return { ...summarise(data), ...presentScore(score) };
}
