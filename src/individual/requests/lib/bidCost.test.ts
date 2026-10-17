import { describe, it, expect } from "vitest";
import { bidCost, byEffectiveCost } from "./bidCost";
import { normalizeBenefit } from "@/individual/requests/api/requests";
import type { Bid, BidBenefit } from "@/individual/requests/api/requests";

const bid = (rate: number, benefits: BidBenefit[] = [], over: Partial<Bid> = {}): Bid => ({
  id: String(rate), requestId: "r", bankId: "b", institutionName: "Bank", rate, rateType: "fixed",
  amountOffered: 1_000_000, termMonths: 240, status: "submitted", source: "institution",
  benefits, ...over,
} as unknown as Bid);

const b = (over: Partial<BidBenefit>): BidBenefit =>
  ({ title: "x", value_display: null, is_guaranteed: true, cat_code: null, ...over });

describe("bidCost", () => {
  it("a guaranteed 0.25% discount lowers the rate and the cost", () => {
    const plain = bidCost(bid(0.075));
    const disc = bidCost(bid(0.075, [b({ value_amount: 0.0025, value_unit: "rate_pa" })]));
    expect(disc.effectiveRate).toBeCloseTo(0.0725, 10);
    expect(disc.rateDiscount).toBeCloseTo(0.0025, 10);
    expect(disc.costOfCredit!).toBeLessThan(plain.costOfCredit!);
  });

  it("cost of credit is interest minus cashback, not total repaid", () => {
    const c = bidCost(bid(0.075, [b({ value_amount: 5000, value_unit: "amount" })]));
    expect(c.totalRepaid! - 1_000_000 - 5000).toBeCloseTo(c.costOfCredit!, 6);
    expect(c.costOfCredit!).toBeLessThan(c.totalRepaid!);
  });

  it("non-guaranteed and fee benefits are listed, not priced", () => {
    const c = bidCost(bid(0.075, [
      b({ is_guaranteed: false, value_amount: 0.01, value_unit: "rate_pa" }),
      b({ value_amount: 0.5, value_unit: "fee_fraction" }),
      b({}),
    ]));
    expect(c.effectiveRate).toBe(0.075);
    expect(c.notCounted.map(n => n.reason)).toEqual(["not_guaranteed", "fee_unknown", "no_value"]);
  });

  it("a discount can't push the rate below zero, and 0% still prices", () => {
    const c = bidCost(bid(0.002, [b({ value_amount: 0.0025, value_unit: "rate_pa" })]));
    expect(c.effectiveRate).toBe(0);
    expect(c.monthly).toBeCloseTo(1_000_000 / 240, 6);
    expect(c.costOfCredit).toBeCloseTo(0, 6);
  });

  it("ranks by effective rate, not headline rate", () => {
    const a = bid(0.074);
    const c = bid(0.075, [b({ value_amount: 0.0025, value_unit: "rate_pa" })]);
    expect([a, c].sort(byEffectiveCost)[0]).toBe(c);
  });
});

describe("normalizeBenefit", () => {
  it("keeps well-formed numbers", () => {
    expect(normalizeBenefit({ title: "t", value_amount: "0.0025", value_unit: "rate_pa", is_guaranteed: true }))
      .toMatchObject({ value_amount: 0.0025, value_unit: "rate_pa", is_guaranteed: true });
  });

  it.each([
    [{ value_amount: 0.25, value_unit: "rate_pa" }],     // percent sent as a fraction: 25 points
    [{ value_amount: 50, value_unit: "fee_fraction" }],
    [{ value_amount: 10, value_unit: "pct_pa" }],         // portal's internal unit
    [{ value_amount: -5, value_unit: "amount" }],
    [{ value_amount: 5000 }],
  ])("falls back to wording only for %j", (raw) => {
    const n = normalizeBenefit({ title: "t", ...raw });
    expect(n.value_amount).toBeNull();
    expect(n.value_unit).toBeNull();
  });
});
