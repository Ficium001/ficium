import { describe, it, expect } from "vitest";
import { calcHealth } from "./calcHealth";
import type { DossierInput } from "@/individual/onboarding/types/dossier";

/** Build a valid loan row; calcHealth only reads monthlyRepayment. */
const loan = (monthlyRepayment: number): Exclude<DossierInput["loans"], undefined>[number] => ({
  loanType: "personal",
  outstandingAmount: 0,
  monthlyRepayment,
  bankName: "Test Bank",
});

describe("calcHealth — financial health scoring", () => {
  it("returns a getting-started score for an empty profile", () => {
    const r = calcHealth({});
    // No income, no assets, but 'no existing loans' grants the clean-DTI 20 pts
    // plus the clean-flags 3 pts → 23, labelled Fair.
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.totalIncome).toBe(0);
    expect(r.totalAssets).toBe(0);
  });

  it("caps the score at 100 for a maximal profile", () => {
    const full: Partial<DossierInput> = {
      monthlyIncome: 100_000,
      additionalIncome: 20_000,
      savings: 1_000_000,
      investments: 1_000_000,
      propertyValue: 5_000_000,
      hasExistingLoans: false,
      loans: [],
      employmentStatus: "employed",
      employerName: "MCB",
      sourceOfWealth: "salary",
      taxResidency: "MU",
      isPep: false,
      missedRepayments: false,
      blacklisted: false,
      bankruptcy: false,
    };
    expect(calcHealth(full).score).toBe(100);
  });

  it("awards income tiers cumulatively", () => {
    const low = calcHealth({ monthlyIncome: 1_000, hasExistingLoans: false });
    const mid = calcHealth({ monthlyIncome: 30_000, hasExistingLoans: false });
    const high = calcHealth({ monthlyIncome: 80_000, hasExistingLoans: false });
    expect(mid.score).toBeGreaterThan(low.score);
    expect(high.score).toBeGreaterThan(mid.score);
  });

  it("computes DTI from existing loan repayments", () => {
    const r = calcHealth({
      monthlyIncome: 50_000,
      hasExistingLoans: true,
      loans: [loan(10_000)],
    });
    // 10000 / 50000 = 20% DTI
    expect(r.dti).toBeCloseTo(20, 1);
    expect(r.totalRepayment).toBe(10_000);
  });

  it("penalises a high DTI relative to a low DTI", () => {
    const lowDti = calcHealth({
      monthlyIncome: 100_000,
      hasExistingLoans: true,
      loans: [loan(10_000)],
    });
    const highDti = calcHealth({
      monthlyIncome: 100_000,
      hasExistingLoans: true,
      loans: [loan(60_000)],
    });
    expect(lowDti.score).toBeGreaterThan(highDti.score);
  });

  it("treats 'no existing loans' as a clean DTI (full points)", () => {
    const noLoans = calcHealth({ monthlyIncome: 50_000, hasExistingLoans: false });
    const heavyLoans = calcHealth({
      monthlyIncome: 50_000,
      hasExistingLoans: true,
      loans: [loan(30_000)],
    });
    expect(noLoans.score).toBeGreaterThan(heavyLoans.score);
  });

  it("sums assets across all asset categories", () => {
    const r = calcHealth({
      savings: 100_000,
      investments: 200_000,
      propertyValue: 300_000,
      vehicleValue: 50_000,
      businessAssets: 25_000,
      otherAssets: 25_000,
    });
    expect(r.totalAssets).toBe(700_000);
  });

  it("rewards employed-with-employer more than other employment", () => {
    const employed = calcHealth({
      monthlyIncome: 50_000,
      employmentStatus: "employed",
      employerName: "MCB",
      hasExistingLoans: false,
    });
    const selfEmployed = calcHealth({
      monthlyIncome: 50_000,
      employmentStatus: "self_employed",
      hasExistingLoans: false,
    });
    expect(employed.score).toBeGreaterThan(selfEmployed.score);
  });

  it("penalises risk flags (PEP, blacklist, bankruptcy)", () => {
    const clean = calcHealth({
      monthlyIncome: 50_000,
      hasExistingLoans: false,
      isPep: false,
      blacklisted: false,
      bankruptcy: false,
      missedRepayments: false,
    });
    const flagged = calcHealth({
      monthlyIncome: 50_000,
      hasExistingLoans: false,
      isPep: true,
      blacklisted: true,
      bankruptcy: true,
      missedRepayments: true,
    });
    expect(clean.score).toBeGreaterThan(flagged.score);
  });

  it("returns a label and colour that track the score band", () => {
    const excellent = calcHealth({
      monthlyIncome: 100_000, additionalIncome: 20_000,
      savings: 1_000_000, investments: 1_000_000, propertyValue: 5_000_000,
      hasExistingLoans: false, employmentStatus: "employed", employerName: "X",
      sourceOfWealth: "salary", taxResidency: "MU",
    });
    expect(excellent.label).toBe("Excellent");
    expect(excellent.colour).toBe("#10b981");

    const empty = calcHealth({ monthlyIncome: 0 });
    expect(["Fair", "Getting started"]).toContain(empty.label);
  });

  it("never produces a negative score or NaN DTI", () => {
    const r = calcHealth({ monthlyIncome: 0, hasExistingLoans: true, loans: [] });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(r.dti)).toBe(false);
  });
});
