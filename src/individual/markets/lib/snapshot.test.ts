import { describe, it, expect } from "vitest";
import { aiValue } from "./snapshot";
import type { TickerReading } from "../types";

const NOW = Date.parse("2026-11-26T12:00:00Z");

function reading(displayValue: string, fetchedAt: string): TickerReading {
  return { value: 0, displayValue, change: 0, direction: "flat", history: [], fetchedAt: new Date(fetchedAt) };
}

describe("aiValue", () => {
  it("passes a fresh value through unchanged", () => {
    expect(aiValue(reading("4.50%", "2026-11-26T08:00:00Z"), NOW)).toBe("4.50%");
  });

  it("dates a stale value so the AI never treats it as current", () => {
    const out = aiValue(reading("3.1%", "2026-07-01T13:27:02Z"), NOW);
    expect(out.startsWith("3.1% (last updated ")).toBe(true);
    expect(out).toContain("2026");
    expect(out).toContain("may be out of date");
  });

  it("gives a dash, not a default, when there is no reading", () => {
    expect(aiValue(null, NOW)).toBe("—");
    expect(aiValue(undefined, NOW)).toBe("—");
    expect(aiValue(reading("—", "2026-11-26T08:00:00Z"), NOW)).toBe("—");
  });
});
