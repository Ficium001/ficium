import type {
  NewsItem, MarketPreferences, CurrencyCode, TickerId,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// ranking — pure relevance scoring for the personalised news feed.
// No I/O, no React: fully unit-testable. Higher score = more relevant.
//
// Signals (explicit preferences only — implicit signals can be layered in
// later by extending MarketPreferences upstream):
//   +3.0  category matches a preferred category
//   +2.0  related ticker maps to a preferred currency
//   +1.0  scope is in the user's preferred scopes
//   +0..2 recency decay over 48h (fresh news floats regardless of prefs)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_WEIGHT = 3;
const CURRENCY_WEIGHT = 2;
const SCOPE_WEIGHT    = 1;
const RECENCY_WEIGHT  = 2;
const RECENCY_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Threshold above which an item is considered a personal match ("For you"). */
export const FOR_YOU_THRESHOLD = CURRENCY_WEIGHT;

const TICKER_CURRENCY: Partial<Record<TickerId, CurrencyCode>> = {
  usd_mur: "USD",
  eur_mur: "EUR",
  gbp_mur: "GBP",
};

export function scoreNewsItem(
  item: NewsItem,
  prefs: MarketPreferences,
  nowMs: number = Date.now(),
): number {
  let score = 0;

  if (prefs.categories.includes(item.category)) score += CATEGORY_WEIGHT;

  const currency = item.relatedTickerId ? TICKER_CURRENCY[item.relatedTickerId] : undefined;
  if (currency && prefs.currencies.includes(currency)) score += CURRENCY_WEIGHT;

  if (prefs.scopes.includes(item.scope)) score += SCOPE_WEIGHT;

  const ageMs = Math.max(0, nowMs - item.publishedAt.getTime());
  const freshness = Math.max(0, 1 - ageMs / RECENCY_WINDOW_MS);
  score += RECENCY_WEIGHT * freshness;

  return score;
}

export interface RankedNews {
  /** All items, most relevant first (stable for equal scores). */
  ranked: NewsItem[];
  /** IDs whose preference-driven score clears FOR_YOU_THRESHOLD. */
  forYouIds: Set<string>;
}

export function rankNews(
  items: NewsItem[],
  prefs: MarketPreferences,
  nowMs: number = Date.now(),
): RankedNews {
  const scored = items.map((item, index) => ({
    item,
    index,
    score: scoreNewsItem(item, prefs, nowMs),
    // Preference-only score (no recency/scope) decides the "For you" badge,
    // so merely-recent items aren't mislabelled as personal matches.
    prefScore:
      (prefs.categories.includes(item.category) ? CATEGORY_WEIGHT : 0) +
      (item.relatedTickerId && TICKER_CURRENCY[item.relatedTickerId] &&
       prefs.currencies.includes(TICKER_CURRENCY[item.relatedTickerId]!)
        ? CURRENCY_WEIGHT : 0),
  }));

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  return {
    ranked: scored.map((s) => s.item),
    forYouIds: new Set(scored.filter((s) => s.prefScore >= FOR_YOU_THRESHOLD).map((s) => s.item.id)),
  };
}

/** Scope filter applied after ranking; "all" is a pass-through. */
export function filterByScope(items: NewsItem[], scope: "all" | "local" | "global"): NewsItem[] {
  if (scope === "all") return items;
  return items.filter((i) => i.scope === scope);
}
