// =============================================================
// Ficium — Shared finance calculations
// Single source of truth for loan/repayment math. Previously
// duplicated inline across RequestDetail.tsx (×3).
// =============================================================

/**
 * Standard amortising loan monthly repayment (annuity formula).
 *
 * @param principal   Loan amount.
 * @param annualRate  Annual interest rate as a decimal (e.g. 0.075 for 7.5%).
 * @param months      Loan term in months.
 * @returns The fixed monthly repayment, or null when any input is missing/zero.
 *
 * For a zero interest rate the repayment is a simple straight-line division.
 */
export function monthlyRepayment(
  principal: number,
  annualRate: number,
  months: number,
): number | null {
  if (!principal || !annualRate || !months) return null;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Total cost of credit over the life of a loan.
 * @returns total repaid minus principal, or null if repayment can't be computed.
 */
export function totalInterest(
  principal: number,
  annualRate: number,
  months: number,
): number | null {
  const m = monthlyRepayment(principal, annualRate, months);
  if (m === null) return null;
  return m * months - principal;
}

/**
 * Debt-service ratio: monthly obligations as a percentage of monthly income.
 * @returns DSR percentage (0–100+), or null when income is zero/missing.
 */
export function debtServiceRatio(
  monthlyObligations: number,
  monthlyIncome: number,
): number | null {
  if (!monthlyIncome) return null;
  return (monthlyObligations / monthlyIncome) * 100;
}
