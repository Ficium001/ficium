/* ─────────────────────────────────────────────
   xirr.ts
   Dated cash-flow financial math for the ROI tool.
   Pure functions, no UI/React deps — keep it that way
   so it stays independently testable.
───────────────────────────────────────────── */

export type CashFlow = {
  /** ISO date string (yyyy-mm-dd) */
  date: string;
  /** Signed amount: negative = money out (cost/capital), positive = money in (income/exit) */
  amount: number;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function yearsBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS / 365.25;
}

/** Net present value of a set of dated cash flows at a given annual rate. */
function xnpv(rate: number, flows: CashFlow[], baseDate: string): number {
  return flows.reduce((sum, f) => {
    const t = yearsBetween(baseDate, f.date);
    return sum + f.amount / Math.pow(1 + rate, t);
  }, 0);
}

/**
 * Solves for the annualized rate of return across irregular, dated cash flows
 * (the "true" return when capital goes in/out at different times — e.g. a
 * top-up renovation cost two years in, or rent collected along the way).
 *
 * Uses bisection over a wide bracket rather than Newton-Raphson alone, since
 * Newton can diverge on the multi-sign-change cash flow patterns this tool
 * will see often (cost, income, cost, exit). Falls back to null if no root
 * is found in the bracket — caller should treat that as "cannot compute".
 */
export function solveXirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;

  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  const baseDate = sorted[0].date;

  // Need at least one negative and one positive flow for a sign change to exist.
  const hasNeg = sorted.some((f) => f.amount < 0);
  const hasPos = sorted.some((f) => f.amount > 0);
  if (!hasNeg || !hasPos) return null;

  let lo = -0.9999; // -99.99% (total loss floor)
  let hi = 50; // +5000% ceiling — generous enough for any real input

  let fLo = xnpv(lo, sorted, baseDate);
  let fHi = xnpv(hi, sorted, baseDate);

  // Widen the upper bracket if needed (rare, but cheap to guard against).
  let expand = 0;
  while (fLo * fHi > 0 && expand < 40) {
    hi *= 1.5;
    fHi = xnpv(hi, sorted, baseDate);
    expand++;
  }
  if (fLo * fHi > 0) return null; // no sign change found — can't bracket a root

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = xnpv(mid, sorted, baseDate);
    if (Math.abs(fMid) < 1e-6) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Simple two-point CAGR: (end/start)^(1/years) - 1. Returns null if years <= 0 or start <= 0. */
export function cagr(start: number, end: number, years: number): number | null {
  if (start <= 0 || years <= 0) return null;
  if (end <= 0) return -1; // total loss, can't take a root of a negative base
  return Math.pow(end / start, 1 / years) - 1;
}

/** Deflates a nominal annual rate to a real (inflation-adjusted) rate via Fisher equation. */
export function realRate(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

export { yearsBetween };
