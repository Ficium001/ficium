import { supabase }   from "@/shared/lib/supabase";
import { TICKER_CONFIGS } from "../config/tickers";
import type {
  MarketDataResult, NewsResult,
  TickerId, TickerReading, FxRate,
  DepositRateRow, LendingRateRow,
  NewsItem, StoryItem, Direction, NewsCategory,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase adapter — reads from the six market_* tables populated by the
// Edge Function cron. Falls through to mock values when a table is empty
// so the page is never broken before live data starts flowing.
//
// Swap in api/index.ts: export { ... } from "./supabase"
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────

function toDirection(d: string | null): Direction {
  if (d === "up" || d === "down") return d;
  return "flat";
}

function formatDisplay(tickerId: TickerId, value: number): string {
  const pct = ["repo_rate", "avg_deposit_rate", "avg_lending_rate", "inflation_yoy"];
  if (pct.includes(tickerId))       return `${value.toFixed(2)}%`;
  if (tickerId === "semdex")        return new Intl.NumberFormat("en-MU").format(Math.round(value));
  return value.toFixed(2);
}

function calcSaving(currencyCode: string, best: number, worst: number): string {
  const diff = (best - worst) * 1000;
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", ZAR: "R" };
  const sym = symbols[currencyCode] ?? currencyCode;
  return `Rs ${Math.round(diff).toLocaleString("en-MU")} per ${sym}1,000`;
}

// ── fetchMarketData ────────────────────────────────────────────────────────

export async function fetchMarketData(): Promise<MarketDataResult> {
  const [tickerRes, fxRes, depositRes, lendingRes] = await Promise.all([
    supabase.from("market_data").select("*"),
    supabase.from("market_fx_rates").select("*"),
    supabase.from("market_deposit_rates").select("*"),
    supabase.from("market_lending_rates").select("*"),
  ]);

  // Surface any Supabase errors to the browser console for debugging
  if (tickerRes.error)  console.error("[markets] market_data error:",          tickerRes.error);
  if (fxRes.error)      console.error("[markets] market_fx_rates error:",      fxRes.error);
  if (depositRes.error) console.error("[markets] market_deposit_rates error:", depositRes.error);
  if (lendingRes.error) console.error("[markets] market_lending_rates error:", lendingRes.error);

  // ── Ticker readings ──
  const readings = {} as MarketDataResult["readings"];

  // Pre-fill all tickers with nullish defaults so the page never breaks
  // on first deploy before the Edge Function has run.
  const ALL_TICKERS = Object.keys(TICKER_CONFIGS) as TickerId[];
  for (const id of ALL_TICKERS) {
    readings[id] = {
      value:        0,
      displayValue: "—",
      change:       0,
      direction:    "flat",
      history:      [],
      fetchedAt:    new Date(),
    };
  }

  for (const row of tickerRes.data ?? []) {
    const id = row.ticker_id as TickerId;
    if (!TICKER_CONFIGS[id]) continue;
    const r: TickerReading = {
      value:        Number(row.value),
      displayValue: row.display_value ?? formatDisplay(id, Number(row.value)),
      change:       Number(row.change_pct ?? 0),
      direction:    toDirection(row.direction),
      history:      Array.isArray(row.history)
        ? (row.history as number[]).map(Number)
        : [],
      fetchedAt: new Date(row.fetched_at),
    };
    readings[id] = r;
  }

  // ── FX rates — pivot to best/worst per currency ──
  const fxMap = new Map<string, { bank: string; rate: number; sellRate: number; basis: string }[]>();
  for (const row of fxRes.data ?? []) {
    const code = row.currency_code as string;
    if (!fxMap.has(code)) fxMap.set(code, []);
    fxMap.get(code)!.push({
      bank:     row.bank_name,
      rate:     Number(row.buy_rate),
      sellRate: Number(row.sell_rate),
      basis:    row.rate_basis ?? "indicative",
    });
  }

  const CURRENCY_ORDER = ["USD", "EUR", "GBP", "ZAR"];
  const fxRates: FxRate[] = CURRENCY_ORDER
    .filter((c) => fxMap.has(c))
    .map((code) => {
      const rows = fxMap.get(code)!.sort((a, b) => b.rate - a.rate);
      const best  = rows[0];
      const worst = rows[rows.length - 1];
      return {
        currency:      `${code} / MUR`,
        currencyCode:  code,
        bestBank:      best.bank,
        bestRate:      best.rate,
        worstBank:     worst.bank,
        worstRate:     worst.rate,
        savingPer1000: calcSaving(code, best.rate, worst.rate),
        banks:         rows.map((r) => ({ bank: r.bank, buyRate: r.rate, sellRate: r.sellRate })),
        // Whole-currency badge: indicative unless every bank row is a real quote.
        isIndicative:  rows.some((r) => r.basis !== "live"),
        updatedAt:     new Date(),
      };
    });

  // ── Deposit rates ──
  const BANK_COLORS: Record<string, string> = {
    MCB:           "#1d4ed8",
    SBM:           "#dc2626",
    Absa:          "#ea580c",
    "SBI Mauritius":"#7c3aed",
    AfrAsia:       "#0891b2",
    "Bank One":    "#059669",
    HSBC:          "#db2777",
    MauBank:       "#d97706",
  };

  const depositRates: DepositRateRow[] = (depositRes.data ?? []).map((row) => ({
    bank:    row.bank_name,
    color:   BANK_COLORS[row.bank_name] ?? "#64748b",
    rate1y:  row.rate_1y,
    rate2y:  row.rate_2y,
    rate3y:  row.rate_3y,
  }));

  // ── Lending rates ──
  const lendingRates: LendingRateRow[] = (lendingRes.data ?? []).map((row) => ({
    product:  row.product,
    iconName: row.icon_name ?? "landmark",
    bestRate: row.best_rate,
    isBest:   row.is_best ?? false,
  }));

  return {
    readings,
    fxRates,
    depositRates,
    lendingRates,
    fetchedAt: new Date(),
    source:    "supabase",
  };
}

// ── fetchMarketNews ─────────────────────────────────────────────────────────

export async function fetchMarketNews(): Promise<NewsResult> {
  const [newsRes, storiesRes] = await Promise.all([
    supabase.from("market_news").select("*").order("published_at", { ascending: false }).limit(20),
    supabase.from("market_stories").select("*").order("generated_at", { ascending: false }).limit(6),
  ]);

  if (newsRes.error)    console.error("[markets] market_news error:",    newsRes.error);
  if (storiesRes.error) console.error("[markets] market_stories error:", storiesRes.error);

  const items: NewsItem[] = (newsRes.data ?? []).map((row) => ({
    id:               row.id,
    headline:         row.headline,
    category:         row.category as NewsCategory,
    emoji:            row.emoji,
    plainEnglish:     row.plain_english,
    body:             row.body ?? undefined,
    scope:            row.scope === "global" ? "global" : "local",
    sourceName:       row.source_name ?? undefined,
    sourceUrl:        row.source_url ?? undefined,
    publishedAt:      new Date(row.published_at),
    relatedTickerId:  row.related_ticker_id as TickerId | undefined,
  }));

  const stories: StoryItem[] = (storiesRes.data ?? []).map((row) => ({
    id:          row.id,
    emoji:       row.emoji,
    category:    row.category as NewsCategory,
    relatedCTA:  row.related_cta ?? false,
    generatedAt: row.generated_at ? new Date(row.generated_at) : undefined,
    everyday: {
      headline: row.headline_everyday,
      plain:    row.plain_everyday,
      detail:   row.detail_everyday || undefined,
    },
    finance: {
      headline: row.headline_finance,
      plain:    row.plain_finance,
      detail:   row.detail_finance || undefined,
    },
  }));

  return {
    items,
    stories,
    fetchedAt: new Date(),
    source: "supabase",
  };
}
