import { describe, it, expect } from "vitest";
import { monthlyRepayment, totalInterest, debtServiceRatio } from "./finance";

describe("monthlyRepayment — annuity formula", () => {
  it("returns null when any input is zero or missing", () => {
    expect(monthlyRepayment(0, 0.07, 36)).toBeNull();
    expect(monthlyRepayment(100000, 0, 36)).toBeNull();
    expect(monthlyRepayment(100000, 0.07, 0)).toBeNull();
  });

  it("computes a known amortising repayment correctly", () => {
    // 1,000,000 @ 7.5% annual over 240 months ≈ 8,055.93/month
    const m = monthlyRepayment(1_000_000, 0.075, 240);
    expect(m).not.toBeNull();
    expect(m!).toBeCloseTo(8055.93, 0);
  });

  it("computes a short-term loan repayment", () => {
    // 500,000 @ 9% annual over 36 months ≈ 15,899.58/month
    const m = monthlyRepayment(500_000, 0.09, 36);
    expect(m!).toBeCloseTo(15899.58, 0);
  });

  it("repayment × term always exceeds principal for a positive rate", () => {
    const principal = 250_000;
    const m = monthlyRepayment(principal, 0.06, 60)!;
    expect(m * 60).toBeGreaterThan(principal);
  });

  it("a higher rate yields a higher monthly repayment", () => {
    const low = monthlyRepayment(300_000, 0.05, 48)!;
    const high = monthlyRepayment(300_000, 0.12, 48)!;
    expect(high).toBeGreaterThan(low);
  });

  it("a longer term yields a lower monthly repayment", () => {
    const short = monthlyRepayment(300_000, 0.08, 24)!;
    const long = monthlyRepayment(300_000, 0.08, 72)!;
    expect(long).toBeLessThan(short);
  });
});

describe("totalInterest", () => {
  it("returns null when repayment can't be computed", () => {
    expect(totalInterest(0, 0.07, 36)).toBeNull();
  });

  it("is positive for any interest-bearing loan", () => {
    const interest = totalInterest(500_000, 0.09, 36)!;
    expect(interest).toBeGreaterThan(0);
  });

  it("grows with the interest rate", () => {
    const cheap = totalInterest(500_000, 0.05, 60)!;
    const dear = totalInterest(500_000, 0.15, 60)!;
    expect(dear).toBeGreaterThan(cheap);
  });
});

describe("debtServiceRatio", () => {
  it("returns null when income is zero/missing", () => {
    expect(debtServiceRatio(10_000, 0)).toBeNull();
  });

  it("computes the obligations-to-income percentage", () => {
    expect(debtServiceRatio(15_000, 50_000)).toBeCloseTo(30, 5);
  });

  it("can exceed 100% when obligations outstrip income", () => {
    expect(debtServiceRatio(60_000, 50_000)).toBeCloseTo(120, 5);
  });

  it("is zero when there are no obligations", () => {
    expect(debtServiceRatio(0, 50_000)).toBe(0);
  });
});
