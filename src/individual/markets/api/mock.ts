import type { MarketDataResult, NewsResult, TickerId } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Mock adapter — mimics the shape a live BOM / ExchangeRate API would return.
// To go live: replace this file's export with a real fetch, keep the same
// return type. The hooks and UI never change.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_READINGS: MarketDataResult["readings"] = {
  repo_rate: {
    value: 4.5,
    displayValue: "4.50%",
    change: 0,
    direction: "flat",
    history: [4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5],
    fetchedAt: new Date(),
  },
  usd_mur: {
    value: 46.2,
    displayValue: "46.20",
    change: -0.3,
    direction: "down",
    history: [46.0, 46.1, 46.3, 46.5, 46.4, 46.2, 46.2],
    fetchedAt: new Date(),
  },
  eur_mur: {
    value: 50.15,
    displayValue: "50.15",
    change: 0.5,
    direction: "up",
    history: [49.6, 49.7, 49.9, 50.0, 50.1, 50.0, 50.15],
    fetchedAt: new Date(),
  },
  gbp_mur: {
    value: 58.8,
    displayValue: "58.80",
    change: -0.1,
    direction: "down",
    history: [59.1, 58.9, 58.8, 59.0, 58.9, 58.85, 58.8],
    fetchedAt: new Date(),
  },
  semdex: {
    value: 2341,
    displayValue: "2,341",
    change: 1.2,
    direction: "up",
    history: [2280, 2295, 2310, 2300, 2315, 2330, 2341],
    fetchedAt: new Date(),
  },
  avg_deposit_rate: {
    value: 3.8,
    displayValue: "3.80%",
    change: 0.1,
    direction: "up",
    history: [3.6, 3.65, 3.7, 3.72, 3.75, 3.78, 3.8],
    fetchedAt: new Date(),
  },
  avg_lending_rate: {
    value: 8.25,
    displayValue: "8.25%",
    change: -0.2,
    direction: "down",
    history: [8.5, 8.45, 8.4, 8.35, 8.3, 8.28, 8.25],
    fetchedAt: new Date(),
  },
};

const MOCK_NEWS: NewsResult["items"] = [
  {
    id: "1",
    headline: "Bank of Mauritius holds repo rate steady at 4.50%",
    category: "Interest Rates",
    emoji: "🏦",
    plainEnglish:
      "Your existing loan EMIs won't change for now. But if rates drop next quarter, you could refinance at a lower cost through Ficium.",
    publishedAt: new Date(),
    relatedTickerId: "repo_rate",
  },
  {
    id: "2",
    headline: "Rupee weakens slightly against USD as global oil prices rise",
    category: "Currency",
    emoji: "💱",
    plainEnglish:
      "Imported goods — electronics, fuel, anything priced in dollars — may cost a little more. If you hold USD savings, they're worth more rupees right now.",
    publishedAt: new Date(),
    relatedTickerId: "usd_mur",
  },
  {
    id: "3",
    headline: "SEMDEX closes 1.2% higher led by banking and telecom stocks",
    category: "Stock Market",
    emoji: "📈",
    plainEnglish:
      "Local companies had a good day. If you have a pension, unit trust, or any investments tied to local stocks, this is likely good news for your balance.",
    publishedAt: new Date(),
    relatedTickerId: "semdex",
  },
  {
    id: "4",
    headline: "Competition pushes local banks to offer better deposit rates",
    category: "Savings",
    emoji: "🏧",
    plainEnglish:
      "Banks are fighting for your savings. Instead of calling each one, post a deposit request on Ficium — let them come to you with their best offer.",
    publishedAt: new Date(),
    relatedTickerId: "avg_deposit_rate",
  },
  {
    id: "5",
    headline: "Personal loan demand rises ahead of end-of-year spending",
    category: "Lending",
    emoji: "💳",
    plainEnglish:
      "Many people are taking loans right now. Posting on Ficium means banks compete to give you the lowest rate — no door-to-door shopping needed.",
    publishedAt: new Date(),
    relatedTickerId: "avg_lending_rate",
  },
];

// ── Simulated async fetch — mirrors what a real API call looks like ──────────

export async function fetchMarketData(): Promise<MarketDataResult> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 400));
  return {
    readings: MOCK_READINGS,
    fetchedAt: new Date(),
    source: "mock",
  };
}

export async function fetchMarketNews(): Promise<NewsResult> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    items: MOCK_NEWS,
    fetchedAt: new Date(),
    source: "mock",
  };
}
