import { describe, it, expect } from "vitest";
import { calcHealth, presentScore, summarise } from "./calcHealth";
import type { DossierInput } from "@/individual/onboarding/types/dossier";

const loan = (outstandingAmount: number, monthlyRepayment: number): Exclude<DossierInput["loans"], undefined>[number] => ({
  loanType: "personal", outstandingAmount, monthlyRepayment, bankName: "Test Bank",
});

describe("summarise — totals shown while the form is filled in", () => {
  it("is all zeros for an empty form", () => {
    expect(summarise({})).toEqual({ totalIncome: 0, totalAssets: 0, totalDebt: 0, totalRepayment: 0, netWorth: 0, dti: 0 });
  });

  it("counts business assets, which used to be left out of the total", () => {
    expect(summarise({ savings: 100, businessAssets: 50, otherAssets: 25 }).totalAssets).toBe(175);
  });

  it("net worth is assets minus what is owed, not assets alone", () => {
    const s = summarise({ propertyValue: 5_000_000, hasExistingLoans: true, loans: [loan(3_000_000, 18_000)] });
    expect(s.totalAssets).toBe(5_000_000);
    expect(s.netWorth).toBe(2_000_000);
  });

  it("ignores loan rows when the user says they have no loans", () => {
    const s = summarise({ monthlyIncome: 50_000, hasExistingLoans: false, loans: [loan(100_000, 5_000)] });
    expect(s.totalDebt).toBe(0);
    expect(s.dti).toBe(0);
  });

  it("debt-to-income is monthly repayments over monthly income, in percent", () => {
    const s = summarise({ monthlyIncome: 40_000, additionalIncome: 10_000, hasExistingLoans: true, loans: [loan(1, 10_000), loan(1, 5_000)] });
    expect(s.totalIncome).toBe(50_000);
    expect(s.totalRepayment).toBe(15_000);
    expect(s.dti).toBe(30);
  });

  it("treats blank and NaN inputs as zero", () => {
    expect(summarise({ monthlyIncome: NaN, savings: undefined }).totalIncome).toBe(0);
  });
});

describe("presentScore — labels a score from the database", () => {
  it.each([
    [95, "Excellent"], [80, "Excellent"], [79, "Strong"], [60, "Strong"],
    [59, "Good"], [40, "Good"], [39, "Fair"], [20, "Fair"], [19, "Weak"], [0, "Weak"],
  ])("%i is %s", (score, label) => {
    expect(presentScore(score).label).toBe(label);
  });

  it("shows no number until the database has scored the profile", () => {
    const p = presentScore(null);
    expect(p.score).toBeNull();
    expect(p.label).toBe("Getting started");
  });
});

describe("calcHealth", () => {
  it("never invents a score of its own", () => {
    const full: Partial<DossierInput> = { monthlyIncome: 500_000, savings: 50_000_000, employmentStatus: "employed" };
    expect(calcHealth(full, null).score).toBeNull();
    expect(calcHealth(full, 42).score).toBe(42);
  });
});
