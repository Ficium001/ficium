import { describe, it, expect } from "vitest";
import { goalProgress } from "./goals";

describe("goalProgress", () => {
  it("returns 0 when target is missing/zero (no divide-by-zero)", () => {
    expect(goalProgress({ savedAmount: 5000, targetAmount: 0 })).toBe(0);
  });
  it("computes a normal percentage", () => {
    expect(goalProgress({ savedAmount: 25000, targetAmount: 100000 })).toBe(25);
  });
  it("rounds to the nearest whole percent", () => {
    expect(goalProgress({ savedAmount: 333, targetAmount: 1000 })).toBe(33);
  });
  it("caps at 100 even when over-saved", () => {
    expect(goalProgress({ savedAmount: 150000, targetAmount: 100000 })).toBe(100);
  });
});
