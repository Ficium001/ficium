import { describe, it, expect } from "vitest";
import { parseMoneyTab, moneyPath } from "./tabs";

describe("money tabs", () => {
  it("falls back to overview for unknown or missing tabs", () => {
    expect(parseMoneyTab(null)).toBe("overview");
    expect(parseMoneyTab("networth")).toBe("overview");
    expect(parseMoneyTab("health")).toBe("health");
  });
  it("builds paths", () => {
    expect(moneyPath()).toBe("/money");
    expect(moneyPath("assets")).toBe("/money?tab=assets");
    expect(moneyPath("calculators", { tool: "roi" })).toBe("/money?tab=calculators&tool=roi");
  });
});
