import type { ElementType } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Core domain types — these never change regardless of data source
// ─────────────────────────────────────────────────────────────────────────────

export type TickerId =
  | "repo_rate"
  | "usd_mur"
  | "eur_mur"
  | "gbp_mur"
  | "semdex"
  | "avg_deposit_rate"
  | "avg_lending_rate"
  | "inflation_yoy";

export type NewsCategory =
  | "Interest Rates"
  | "Currency"
  | "Stock Market"
  | "Savings"
  | "Lending"
  | "Economy";

export type Direction = "up" | "down" | "flat";

export type NewsScope = "local" | "global";

export type StoryMode = "everyday" | "finance";

// ─────────────────────────────────────────────────────────────────────────────
// Ticker — one market data point
// ─────────────────────────────────────────────────────────────────────────────

export interface TickerReading {
  value: number;
  displayValue: string;
  change: number;
  direction: Direction;
  history: number[];
  fetchedAt: Date;
}

export interface TickerConfig {
  id: TickerId;
  label: string;
  unit: string;
  icon: ElementType;
  color: string;
  story: string;
}

export interface Ticker extends TickerConfig {
  reading: TickerReading | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FX — best rate across banks
// ─────────────────────────────────────────────────────────────────────────────

export interface FxRate {
  currency: string;          // "USD / MUR"
  currencyCode: string;      // "USD"
  bestBank: string;
  bestRate: number;
  worstBank: string;
  worstRate: number;
  savingPer1000: string;     // "Rs 700 per $1,000"
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deposit & Lending rates
// ─────────────────────────────────────────────────────────────────────────────

export interface DepositRateRow {
  bank: string;
  color: string;
  rate1y: string;
  rate2y: string;
  rate3y: string;
}

export interface LendingRateRow {
  product: string;
  iconName: string;
  bestRate: string;
  isBest: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// News — dual-mode stories
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  headline: string;
  category: NewsCategory;
  emoji: string;
  plainEnglish: string;
  /** 2–3 sentence detail shown when the item is expanded. */
  body?: string;
  /** Mauritius vs international coverage. Defaults to "local" for legacy rows. */
  scope: NewsScope;
  /** Real publisher attribution for ingested headlines. */
  sourceName?: string;
  sourceUrl?: string;
  publishedAt: Date;
  relatedTickerId?: TickerId;
}

export interface StoryItem {
  id: string;
  emoji: string;
  category: NewsCategory;
  relatedCTA: boolean;
  /** When this story was (re)generated — surfaced so freshness is honest. */
  generatedAt?: Date;
  everyday: { headline: string; plain: string; detail?: string };
  finance:  { headline: string; plain: string; detail?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalisation — per-user market feed preferences
// ─────────────────────────────────────────────────────────────────────────────

export type CurrencyCode = "USD" | "EUR" | "GBP" | "ZAR";

export interface MarketPreferences {
  categories: NewsCategory[];
  currencies: CurrencyCode[];
  scopes: NewsScope[];
  defaultMode: StoryMode;
}

export const DEFAULT_MARKET_PREFERENCES: MarketPreferences = {
  categories: [],
  currencies: [],
  scopes: ["local", "global"],
  defaultMode: "everyday",
};

// ─────────────────────────────────────────────────────────────────────────────
// API response envelopes
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketDataResult {
  readings: Record<TickerId, TickerReading>;
  fxRates: FxRate[];
  depositRates: DepositRateRow[];
  lendingRates: LendingRateRow[];
  fetchedAt: Date;
  source: "mock" | "bom" | "exchangerate-api" | "supabase";
}

export interface NewsResult {
  items: NewsItem[];
  stories: StoryItem[];
  fetchedAt: Date;
  source: "mock" | "rss" | "supabase";
}
