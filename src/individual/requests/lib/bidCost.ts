// =============================================================
// Ficium — What a bid really costs, benefits included
//
// Banks attach benefits to bids ("0.25% off the rate", "MUR 5,000
// cashback"). Since contract 1.3.0 a benefit can carry its number:
//   rate_pa       reduction of the yearly rate, decimal fraction (0.0025)
//   fee_fraction  share of a fee waived, 0 to 1
//   amount        money in the bid's currency
//
// Only GUARANTEED benefits change the price. A non-guaranteed benefit
// is something the bank may give, and pricing a maybe would make one
// bid look cheaper than it is. A fee waiver can't be priced either:
// the bid doesn't say what the fee is. Both are listed, not counted.
// =============================================================
import { monthlyRepayment } from "@/shared/lib/finance";
import type { Bid, BidBenefit } from "@/individual/requests/api/requests";

export interface BidCost {
  /** The bank's headline yearly rate, decimal fraction. */
  headlineRate: number;
  /** After guaranteed rate discounts, never below 0. */
  effectiveRate: number;
  /** Sum of guaranteed rate discounts actually applied. */
  rateDiscount: number;
  /** Guaranteed cash benefits, in the bid currency. */
  cashback: number;
  monthly: number | null;
  totalRepaid: number | null;
  /** Interest paid minus guaranteed cashback: what borrowing costs you. */
  costOfCredit: number | null;
  /** Benefits shown but not in the price, and why. */
  notCounted: { benefit: BidBenefit; reason: "not_guaranteed" | "fee_unknown" | "no_value" }[];
}

const yearlyRate = (bid: Bid) => (bid.source === "institution" ? bid.rate : bid.rate / 100);

function repayment(principal: number, rate: number, months: number): number | null {
  if (!principal || !months) return null;
  // monthlyRepayment treats 0 as "missing"; a 0% effective rate is real here.
  return rate === 0 ? principal / months : monthlyRepayment(principal, rate, months);
}

export function bidCost(bid: Bid): BidCost {
  const headlineRate = yearlyRate(bid);
  let discount = 0;
  let cashback = 0;
  const notCounted: BidCost["notCounted"] = [];

  for (const b of bid.benefits ?? []) {
    if (b.value_amount == null || b.value_unit == null) {
      notCounted.push({ benefit: b, reason: "no_value" });
    } else if (!b.is_guaranteed) {
      notCounted.push({ benefit: b, reason: "not_guaranteed" });
    } else if (b.value_unit === "rate_pa") {
      discount += b.value_amount;
    } else if (b.value_unit === "amount") {
      cashback += b.value_amount;
    } else {
      notCounted.push({ benefit: b, reason: "fee_unknown" });
    }
  }

  const rateDiscount = Math.min(discount, headlineRate);
  const effectiveRate = headlineRate - rateDiscount;
  const monthly = repayment(bid.amountOffered, effectiveRate, bid.termMonths);
  const totalRepaid = monthly === null ? null : monthly * bid.termMonths;
  const costOfCredit = totalRepaid === null ? null : totalRepaid - bid.amountOffered - cashback;

  return { headlineRate, effectiveRate, rateDiscount, cashback, monthly, totalRepaid,
           costOfCredit, notCounted };
}

/** Cheapest first: effective rate, then guaranteed cashback as the tie-break. */
export function byEffectiveCost(a: Bid, b: Bid): number {
  const ca = bidCost(a), cb = bidCost(b);
  return ca.effectiveRate - cb.effectiveRate || cb.cashback - ca.cashback;
}
