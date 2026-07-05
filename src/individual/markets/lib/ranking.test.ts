import { describe, it, expect } from "vitest";
import { scoreNewsItem, rankNews, filterByScope, FOR_YOU_THRESHOLD } from "./ranking";
import { DEFAULT_MARKET_PREFERENCES } from "../types";
import type { NewsItem, MarketPreferences } from "../types";

const NOW = Date.parse("2026-07-05T12:00:00Z");

function makeItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: overrides.id ?? "n1",
    headline: "Test headline",
    category: "Economy",
    emoji: "📰",
    plainEnglish: "Plain english.",
    scope: "local",
    publishedAt: new Date(NOW - 60 * 60 * 1000), // 1h old
    ...overrides,
  };
}

function prefs(overrides: Partial<MarketPreferences> = {}): MarketPreferences {
  return { ...DEFAULT_MARKET_PREFERENCES, ...overrides };
}

describe("scoreNewsItem", () => {
  it("rewards a category match over a non-match", () => {
    const p = prefs({ categories: ["Lending"] });
    const match = scoreNewsItem(makeItem({ category: "Lending" }), p, NOW);
    const other = scoreNewsItem(makeItem({ category: "Economy" }), p, NOW);
    expect(match).toBeGreaterThan(other);
  });

  it("rewards a currency match via related ticker", () => {
    const p = prefs({ currencies: ["USD"] });
    const usd = scoreNewsItem(makeItem({ relatedTickerId: "usd_mur" }), p, NOW);
    const gbp = scoreNewsItem(makeItem({ relatedTickerId: "gbp_mur" }), p, NOW);
    expect(usd).toBeGreaterThan(gbp);
  });

  it("decays recency: fresher items score higher, floor at 48h", () => {
    const p = prefs();
    const fresh = scoreNewsItem(makeItem({ publishedAt: new Date(NOW) }), p, NOW);
    const dayOld = scoreNewsItem(makeItem({ publishedAt: new Date(NOW - 24 * 3600e3) }), p, NOW);
    const ancient = scoreNewsItem(makeItem({ publishedAt: new Date(NOW - 10 * 24 * 3600e3) }), p, NOW);
    const veryAncient = scoreNewsItem(makeItem({ publishedAt: new Date(NOW - 30 * 24 * 3600e3) }), p, NOW);
    expect(fresh).toBeGreaterThan(dayOld);
    expect(dayOld).toBeGreaterThan(ancient);
    expect(ancient).toBe(veryAncient); // decay floors at 0
  });

  it("respects scope preference", () => {
    const localOnly = prefs({ scopes: ["local"] });
    const local  = scoreNewsItem(makeItem({ scope: "local" }),  localOnly, NOW);
    const global = scoreNewsItem(makeItem({ scope: "global" }), localOnly, NOW);
    expect(local).toBeGreaterThan(global);
  });
});

describe("rankNews", () => {
  it("orders preference matches first and keeps input order for ties", () => {
    const p = prefs({ categories: ["Currency"] });
    const items = [
      makeItem({ id: "a", category: "Economy" }),
      makeItem({ id: "b", category: "Currency" }),
      makeItem({ id: "c", category: "Economy" }),
    ];
    const { ranked } = rankNews(items, p, NOW);
    expect(ranked.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("flags 'For you' only on preference matches, not mere recency", () => {
    const p = prefs({ categories: ["Lending"] });
    const items = [
      makeItem({ id: "match", category: "Lending", publishedAt: new Date(NOW - 40 * 3600e3) }),
      makeItem({ id: "fresh", category: "Economy", publishedAt: new Date(NOW) }),
    ];
    const { forYouIds } = rankNews(items, p, NOW);
    expect(forYouIds.has("match")).toBe(true);
    expect(forYouIds.has("fresh")).toBe(false);
  });

  it("with default (empty) preferences nothing is flagged and order is recency-driven", () => {
    const items = [
      makeItem({ id: "old",  publishedAt: new Date(NOW - 30 * 3600e3) }),
      makeItem({ id: "new",  publishedAt: new Date(NOW - 1  * 3600e3) }),
    ];
    const { ranked, forYouIds } = rankNews(items, DEFAULT_MARKET_PREFERENCES, NOW);
    expect(ranked[0].id).toBe("new");
    expect(forYouIds.size).toBe(0);
  });

  it("threshold constant matches a single currency-weight match", () => {
    expect(FOR_YOU_THRESHOLD).toBe(2);
  });
});

describe("filterByScope", () => {
  const items = [
    makeItem({ id: "l", scope: "local" }),
    makeItem({ id: "g", scope: "global" }),
  ];
  it("passes everything through for 'all'", () => {
    expect(filterByScope(items, "all")).toHaveLength(2);
  });
  it("filters to the requested scope", () => {
    expect(filterByScope(items, "global").map((i) => i.id)).toEqual(["g"]);
  });
});
