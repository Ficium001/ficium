import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatMUR,
  formatProductType,
  formatRate,
  formatAmount,
  formatDistanceToNow,
} from "./format";

describe("formatMUR", () => {
  it("prefixes Rs and groups thousands", () => {
    expect(formatMUR(250000)).toBe("Rs 250,000");
  });
});

describe("formatProductType", () => {
  it("maps known keys", () => {
    expect(formatProductType("personal_loan")).toBe("Personal Loan");
    expect(formatProductType("vehicle_loan")).toBe("Vehicle Loan");
  });
  it("title-cases unknown keys", () => {
    expect(formatProductType("solar_loan")).toBe("Solar Loan");
  });
});

describe("formatRate", () => {
  it("formats a decimal as a 2dp percentage", () => {
    expect(formatRate(0.075)).toBe("7.50%");
  });
  it("returns dash for nullish", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(undefined)).toBe("—");
  });
});

describe("formatAmount", () => {
  it("formats with default MUR currency", () => {
    expect(formatAmount(12000)).toBe("MUR 12,000");
  });
  it("returns dash for nullish", () => {
    expect(formatAmount(null)).toBe("—");
  });
});

describe("formatDistanceToNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns 'just now' under a minute", () => {
    expect(formatDistanceToNow("2026-06-27T11:59:40Z")).toBe("just now");
  });
  it("formats past minutes/hours/days with 'ago'", () => {
    expect(formatDistanceToNow("2026-06-27T11:15:00Z")).toBe("45m ago");
    expect(formatDistanceToNow("2026-06-27T08:00:00Z")).toBe("4h ago");
    expect(formatDistanceToNow("2026-06-24T12:00:00Z")).toBe("3d ago");
  });
  it("formats future times with 'in'", () => {
    expect(formatDistanceToNow("2026-06-27T15:00:00Z")).toBe("in 3h");
  });
});
