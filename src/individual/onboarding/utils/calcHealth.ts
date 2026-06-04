import type { DossierInput } from "@/individual/onboarding/types/dossier";

export type HealthResult = {
  score:         number;
  colour:        string;
  label:         string;
  insight:       string;
  dti:           number;
  totalIncome:   number;
  totalAssets:   number;
  totalRepayment:number;
};

// Pure function — accepts the form's input shape (what useWatch returns).
// All fields are optional/undefined-safe because the form may be partially filled.
export function calcHealth(data: Partial<DossierInput>): HealthResult {
  let pts = 0;

  const income = (Number(data.monthlyIncome)||0) + (Number(data.additionalIncome)||0);
  if (income > 0)        pts += 10;
  if (income >= 30_000)  pts += 10;
  if (income >= 80_000)  pts += 10;

  const assets = [
    data.savings, data.investments, data.propertyValue,
    data.vehicleValue, data.businessAssets, data.otherAssets,
  ].reduce<number>((s, v) => s + (Number(v) || 0), 0);
  if (assets > 0)          pts += 5;
  if (assets >= 500_000)   pts += 8;
  if (assets >= 2_000_000) pts += 7;

  const rep = (data.loans ?? []).reduce<number>((s, l) => s + (Number(l.monthlyRepayment) || 0), 0);
  const dti = income > 0 ? rep / income : 0;
  if (!data.hasExistingLoans || (data.loans ?? []).length === 0) pts += 20;
  else if (dti < 0.20) pts += 20;
  else if (dti < 0.35) pts += 12;
  else if (dti < 0.50) pts += 5;

  if (data.employmentStatus)                                                pts += 5;
  if (data.employmentStatus === "employed" && data.employerName)           pts += 10;
  else if (data.employmentStatus && data.employmentStatus !== "unemployed") pts += 7;

  if (data.sourceOfWealth) pts += 8;
  if (data.taxResidency)   pts += 4;
  if (!data.isPep && !data.missedRepayments && !data.blacklisted && !data.bankruptcy) pts += 3;

  const score = Math.min(100, pts);

  const colour  = score >= 80 ? "#10b981" : score >= 60 ? "#3D6EF5" : score >= 40 ? "#f59e0b" : score >= 20 ? "#f97316" : "#94a3b8";
  const label   = score >= 80 ? "Excellent" : score >= 60 ? "Strong" : score >= 40 ? "Good" : score >= 20 ? "Fair" : "Getting started";
  const insight = score >= 80 ? "Your profile is highly attractive. Expect competitive bids."
    : score >= 60 ? "Good profile. Complete the assets section to strengthen your bids."
    : score >= 40 ? "Banks can see you. Add your assets to attract more bids."
    : "Fill in your employment and income to unlock bank bids.";

  return { score, colour, label, insight, dti: dti * 100, totalIncome: income, totalAssets: assets, totalRepayment: rep };
}
