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
  publishedAt: Date;
  relatedTickerId?: TickerId;
}

export interface StoryItem {
  id: string;
  emoji: string;
  category: NewsCategory;
  relatedCTA: boolean;
  everyday: { headline: string; plain: string };
  finance:  { headline: string; plain: string };
}

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
