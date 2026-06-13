import { describe, it, expect } from "vitest";
import { formatAmount, healthLabel, getGreeting } from "./dashboard";

describe("formatAmount", () => {
  it("returns '0' for zero", () => {
    expect(formatAmount(0)).toBe("0");
  });
  it("groups thousands (en-IN)", () => {
    // en-IN groups as 1,00,000
    expect(formatAmount(100000)).toBe("1,00,000");
  });
  it("formats a plain thousand", () => {
    expect(formatAmount(4200)).toBe("4,200");
  });
});

describe("healthLabel", () => {
  it("returns a dash for null", () => {
    expect(healthLabel(null).label).toBe("—");
  });
  it("labels >= 70 as Good", () => {
    expect(healthLabel(70).label).toBe("Good");
    expect(healthLabel(92).label).toBe("Good");
  });
  it("labels 50–69 as Fair", () => {
    expect(healthLabel(50).label).toBe("Fair");
    expect(healthLabel(69).label).toBe("Fair");
  });
  it("labels < 50 as Low", () => {
    expect(healthLabel(49).label).toBe("Low");
    expect(healthLabel(0).label).toBe("Low");
  });
});

describe("getGreeting", () => {
  it("returns a non-empty greeting string", () => {
    expect(getGreeting().length).toBeGreaterThan(0);
  });
});
