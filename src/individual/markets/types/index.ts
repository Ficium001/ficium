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
  | "avg_lending_rate";

export type NewsCategory =
  | "Interest Rates"
  | "Currency"
  | "Stock Market"
  | "Savings"
  | "Lending"
  | "Economy";

export type Direction = "up" | "down" | "flat";

// ─────────────────────────────────────────────────────────────────────────────
// Ticker — one market data point
// ─────────────────────────────────────────────────────────────────────────────

export interface TickerReading {
  value: number;          // raw numeric value
  displayValue: string;   // formatted for UI (e.g. "4.50%", "46.20")
  change: number;         // % change vs prior period (positive = up)
  direction: Direction;
  history: number[];      // last N readings for sparkline (oldest → newest)
  fetchedAt: Date;
}

export interface TickerConfig {
  id: TickerId;
  label: string;
  unit: string;           // e.g. "%" or "pts" or ""
  icon: ElementType;
  color: string;          // brand hex
  story: string;          // plain-English "what this means" for a layman
}

export interface Ticker extends TickerConfig {
  reading: TickerReading | null;   // null = loading / error
}

// ─────────────────────────────────────────────────────────────────────────────
// News
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  headline: string;
  category: NewsCategory;
  emoji: string;
  plainEnglish: string;   // what this means for the user
  publishedAt: Date;
  relatedTickerId?: TickerId;
}

// ─────────────────────────────────────────────────────────────────────────────
// API response envelopes — adapter pattern so the UI never cares about source
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketDataResult {
  readings: Record<TickerId, TickerReading>;
  fetchedAt: Date;
  source: "mock" | "bom" | "exchangerate-api" | "supabase";
}

export interface NewsResult {
  items: NewsItem[];
  fetchedAt: Date;
  source: "mock" | "rss" | "supabase";
}
