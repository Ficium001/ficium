import { STALE_AFTER_MS } from "../api/supabase";
import type { TickerReading } from "../types";

/**
 * A ticker value as text for the AI (market summary and market chat).
 *
 * The cards already show an old reading with its date ("as of 1 Jul"); the AI
 * snapshot used to pass the bare value, so a months-old figure reached the
 * model, and the borrower, as if it were today's. Same rule as the cards:
 * older than STALE_AFTER_MS carries its date. No reading is "—", never a
 * made-up default.
 */
export function aiValue(reading: TickerReading | null | undefined, now: number = Date.now()): string {
  if (!reading || !reading.displayValue || reading.displayValue === "—") return "—";
  if (now - reading.fetchedAt.getTime() <= STALE_AFTER_MS) return reading.displayValue;
  const when = reading.fetchedAt.toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" });
  return `${reading.displayValue} (last updated ${when}, may be out of date)`;
}
