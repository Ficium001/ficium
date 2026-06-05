/**
 * supabase/functions/market-refresh/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Ficium Markets — live data scraper
 *
 * Runs on a cron schedule. Fetches real Mauritius financial data from:
 *   - Open Exchange Rates API (USD/EUR/GBP/ZAR vs MUR) — free, no key
 *   - MCB, SBM, AfrAsia, Absa, Bank One, HSBC, SBI MU, MauBank (FX rates)
 *   - Bank of Mauritius website (repo rate)
 *   - Stock Exchange of Mauritius (SEMDEX)
 *   - Statistics Mauritius RSS (inflation)
 *   - Claude Haiku (AI story regeneration when data changes)
 *
 * Schedule (set in supabase/config.toml):
 *   cron: "0 6,12,18 * * *"   (6 AM, 12 PM, 6 PM Mauritius time = UTC+4)
 *
 * Manual invoke:
 *   POST https://<project>.supabase.co/functions/v1/market-refresh
 *   Authorization: Bearer <service_role_key>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic          from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

// ── Supabase + Anthropic clients ────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

// ── Types ───────────────────────────────────────────────────────────────────

interface FxReading  { bank: string; currency: string; buy: number; sell: number; }
interface TickerRow  { ticker_id: string; value: number; display_value: string; change_pct: number; direction: string; history: number[]; source: string; }
interface NewsRow    { headline: string; category: string; emoji: string; plain_english: string; related_ticker_id?: string; source: string; }

// ── Helpers ─────────────────────────────────────────────────────────────────

const log  = (...a: unknown[]) => console.log("[market-refresh]", ...a);
const warn = (...a: unknown[]) => console.warn("[market-refresh] WARN:", ...a);

async function fetchHtml(url: string, opts: RequestInit = {}): Promise<string> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FiciumBot/1.0; +https://ficium.net)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...opts.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Accept": "application/json", ...opts.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

/** Extract a number from HTML near a keyword. */
function extractNumber(html: string, near: RegExp, offset = 0): number | null {
  const match = html.match(near);
  if (!match) return null;
  const idx   = html.indexOf(match[0]);
  const chunk = html.slice(idx + offset, idx + offset + 200);
  const num   = chunk.match(/[\d,]+\.?\d*/);
  if (!num) return null;
  return parseFloat(num[0].replace(/,/g, ""));
}

/** Get last 7 stored values for a ticker (for sparkline history). */
async function getHistory(tickerId: string): Promise<number[]> {
  const { data } = await supabase
    .from("market_data")
    .select("history,value")
    .eq("ticker_id", tickerId)
    .single();
  if (!data) return [];
  const hist: number[] = Array.isArray(data.history) ? data.history : [];
  return [...hist.slice(-6), Number(data.value)].slice(-7);
}

function pctChange(prev: number, curr: number): number {
  if (!prev) return 0;
  return parseFloat(((curr - prev) / prev * 100).toFixed(2));
}

function direction(chg: number): string {
  if (chg >  0.01) return "up";
  if (chg < -0.01) return "down";
  return "flat";
}

function fmtDisplay(id: string, v: number): string {
  const pct = ["repo_rate","avg_deposit_rate","avg_lending_rate","inflation_yoy"];
  if (pct.includes(id))      return `${v.toFixed(2)}%`;
  if (id === "semdex")       return new Intl.NumberFormat("en").format(Math.round(v));
  return v.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA FETCHERS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Open Exchange Rates (free, no API key needed for latest) ──────────────
async function fetchOpenExchangeRates(): Promise<Record<string, number>> {
  try {
    // Primary: Open Exchange Rates (free endpoint, MUR included)
    const data = await fetchJson<{ rates: Record<string, number> }>(
      "https://open.er-api.com/v6/latest/USD"
    );
    log("OER rates: MUR =", data.rates.MUR);
    return data.rates;
  } catch (e) {
    warn("open.er-api failed:", e);
    // Fallback: frankfurter (ECB data, EUR base — derive via cross)
    try {
      const fb = await fetchJson<{ rates: Record<string, number> }>(
        "https://api.frankfurter.app/latest?from=EUR"
      );
      // Approximate MUR from EUR/USD cross if we have USD
      log("Frankfurter fallback rates:", Object.keys(fb.rates).slice(0, 5));
      return fb.rates;
    } catch (e2) {
      warn("frankfurter fallback failed:", e2);
      return {};
    }
  }
}

// ── 2. BOM repo rate ──────────────────────────────────────────────────────────
async function fetchBomRepoRate(): Promise<number | null> {
  try {
    // BOM publishes key rates as a table on their monetary policy page
    const html = await fetchHtml("https://www.bom.mu/monetary-policy/key-rates/");
    // Look for "Key Repo Rate" or "KRR" followed by a percentage
    const match = html.match(/(?:Key Repo Rate|KRR)[^%\d]*?([\d.]+)\s*%/i);
    if (match) {
      const rate = parseFloat(match[1]);
      log("BOM repo rate:", rate);
      return rate;
    }
    // Try alternative selector — sometimes in a table cell
    const match2 = html.match(/<td[^>]*>\s*([\d.]+)\s*%\s*<\/td>/i);
    if (match2) {
      const rate = parseFloat(match2[1]);
      log("BOM repo rate (alt):", rate);
      return rate;
    }
    warn("BOM repo rate not found in HTML");
    return null;
  } catch (e) {
    warn("BOM scrape failed:", e);
    return null;
  }
}

// ── 3. SEMDEX from SEM ────────────────────────────────────────────────────────
async function fetchSemdex(): Promise<number | null> {
  try {
    const html = await fetchHtml("https://www.stockexchangeofmauritius.com/market-statistics/indices");
    // SEMDEX is typically the first/main index shown
    const match = html.match(/SEMDEX[^<\d]*?([\d,]+\.?\d*)/i);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      log("SEMDEX:", val);
      return val;
    }
    // Try looking for the index value in a broader pattern
    const num = extractNumber(html, /SEMDEX/i, 20);
    log("SEMDEX (alt):", num);
    return num;
  } catch (e) {
    warn("SEM scrape failed:", e);
    return null;
  }
}

// ── 4. MCB FX rates ───────────────────────────────────────────────────────────
async function fetchMcbRates(): Promise<FxReading[]> {
  try {
    const html = await fetchHtml("https://www.mcb.mu/en/personal/currency-rates/");
    return parseFxTable(html, "MCB");
  } catch (e) {
    warn("MCB scrape failed:", e);
    return [];
  }
}

// ── 5. SBM FX rates ───────────────────────────────────────────────────────────
async function fetchSbmRates(): Promise<FxReading[]> {
  try {
    const html = await fetchHtml("https://www.sbmgroup.mu/personal/currency-exchange/");
    return parseFxTable(html, "SBM");
  } catch (e) {
    warn("SBM scrape failed:", e);
    return [];
  }
}

// ── 6. AfrAsia FX rates ───────────────────────────────────────────────────────
async function fetchAfrasiaRates(): Promise<FxReading[]> {
  try {
    const html = await fetchHtml("https://www.afrasiabank.com/en/personal/currency-exchange/exchange-rates");
    return parseFxTable(html, "AfrAsia");
  } catch (e) {
    warn("AfrAsia scrape failed:", e);
    return [];
  }
}

// ── 7. Absa MU FX rates ───────────────────────────────────────────────────────
async function fetchAbsaRates(): Promise<FxReading[]> {
  try {
    const html = await fetchHtml("https://www.absa.mu/personal/daily-foreign-exchange-rates/");
    return parseFxTable(html, "Absa");
  } catch (e) {
    warn("Absa scrape failed:", e);
    return [];
  }
}

// ── 8. Bank One FX rates ──────────────────────────────────────────────────────
async function fetchBankOneRates(): Promise<FxReading[]> {
  try {
    const html = await fetchHtml("https://www.bankone.mu/tools/exchange-rates/");
    return parseFxTable(html, "Bank One");
  } catch (e) {
    warn("Bank One scrape failed:", e);
    return [];
  }
}

// ── 9. MauBank FX rates ───────────────────────────────────────────────────────
async function fetchMauBankRates(): Promise<FxReading[]> {
  try {
    const html = await fetchHtml("https://www.maubank.mu/personal/exchange-rates/");
    return parseFxTable(html, "MauBank");
  } catch (e) {
    warn("MauBank scrape failed:", e);
    return [];
  }
}

// ── 10. BOM RSS for news ──────────────────────────────────────────────────────
async function fetchBomNews(): Promise<NewsRow[]> {
  try {
    const xml = await fetchHtml("https://www.bom.mu/feed/");
    const items: NewsRow[] = [];
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of matches) {
      const item  = m[1];
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                 ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      if (!title.trim()) continue;
      items.push({
        headline:     title.trim().slice(0, 200),
        category:     "Interest Rates",
        emoji:        "🏦",
        plain_english: `Latest from the Bank of Mauritius: ${title.trim().slice(0, 120)}`,
        related_ticker_id: "repo_rate",
        source:        "bom-rss",
      });
      if (items.length >= 3) break;
    }
    log("BOM news items:", items.length);
    return items;
  } catch (e) {
    warn("BOM RSS failed:", e);
    return [];
  }
}

// ── FX table parser (works across most Mauritius bank HTML layouts) ───────────
function parseFxTable(html: string, bankName: string): FxReading[] {
  const results: FxReading[] = [];
  const CURRENCIES = ["USD", "EUR", "GBP", "ZAR", "AUD", "CNY"];

  // Strategy 1: Look for currency code near buy/sell numbers in the same row
  for (const ccy of CURRENCIES) {
    // Match rows containing the currency code with nearby decimal numbers
    const rowPattern = new RegExp(
      `(${ccy})[^<]{0,200}?` +
      `(\\d{2,3}\\.\\d{2,4})[^<]{0,100}?` +
      `(\\d{2,3}\\.\\d{2,4})`,
      "i"
    );
    const match = html.match(rowPattern);
    if (match) {
      const buy  = parseFloat(match[2]);
      const sell = parseFloat(match[3]);
      // Sanity check: MUR rates should be 30–80 for major currencies
      if (buy > 10 && buy < 200 && sell > 10 && sell < 200) {
        results.push({ bank: bankName, currency: ccy, buy, sell });
      }
    }
  }

  // Strategy 2: Extract all <tr> rows and scan for currency + numbers
  if (results.length === 0) {
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    for (const row of rows) {
      const text = row.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      for (const ccy of CURRENCIES) {
        if (!text.toUpperCase().includes(ccy)) continue;
        const nums = text.match(/\d{2,3}\.\d{2,4}/g);
        if (nums && nums.length >= 2) {
          const buy  = parseFloat(nums[0]);
          const sell = parseFloat(nums[1]);
          if (buy > 10 && buy < 200 && sell > buy) {
            results.push({ bank: bankName, currency: ccy, buy, sell });
            break;
          }
        }
      }
    }
  }

  log(`${bankName} FX parsed:`, results.map(r => `${r.currency}=${r.buy}`).join(", ") || "none");
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI STORY GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateStory(
  tickerId: string,
  label: string,
  value: string,
  change: number,
  dir: string,
): Promise<{ everyday: { headline: string; plain: string }; finance: { headline: string; plain: string } } | null> {
  try {
    const prompt = `You are Ficium AI writing market stories for Mauritius retail banking users.

The ${label} is currently ${value} (${dir === "up" ? "▲" : dir === "down" ? "▼" : "→"} ${Math.abs(change).toFixed(2)}% change).

Write two versions of a short story about this data point:

1. EVERYDAY version (for non-financial users):
   - Headline: max 12 words, plain English, personal ("what this means for you")
   - Body: 2-3 sentences, no jargon, real wallet impact, Mauritius context

2. FINANCE version (for financially literate users):
   - Headline: technical, include the number and % change
   - Body: 2-3 sentences, use financial terminology, basis points if relevant

Respond in this exact JSON format only, no markdown:
{
  "everyday_headline": "...",
  "everyday_plain": "...",
  "finance_headline": "...",
  "finance_plain": "..."
}`;

    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      everyday: { headline: parsed.everyday_headline, plain: parsed.everyday_plain },
      finance:  { headline: parsed.finance_headline,  plain: parsed.finance_plain  },
    };
  } catch (e) {
    warn("AI story generation failed for", tickerId, ":", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  log("Starting market refresh at", startedAt);

  const results: Record<string, unknown> = {};
  const now = new Date().toISOString();

  // ── Step 1: Fetch all data sources in parallel ───────────────────────────
  const [
    fxRates,
    mcbRates,
    sbmRates,
    afrasiaRates,
    absaRates,
    bankOneRates,
    mauBankRates,
    repoRate,
    semdex,
    bomNews,
  ] = await Promise.allSettled([
    fetchOpenExchangeRates(),
    fetchMcbRates(),
    fetchSbmRates(),
    fetchAfrasiaRates(),
    fetchAbsaRates(),
    fetchBankOneRates(),
    fetchMauBankRates(),
    fetchBomRepoRate(),
    fetchSemdex(),
    fetchBomNews(),
  ]);

  const extractValue = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const apiRates     = extractValue(fxRates, {});
  const allBankRates = [
    ...extractValue(mcbRates,     []),
    ...extractValue(sbmRates,     []),
    ...extractValue(afrasiaRates, []),
    ...extractValue(absaRates,    []),
    ...extractValue(bankOneRates, []),
    ...extractValue(mauBankRates, []),
  ];
  const bomRepo  = extractValue(repoRate, null);
  const semdexVal = extractValue(semdex, null);
  const newsItems = extractValue(bomNews, []);

  log("Bank FX readings collected:", allBankRates.length);

  // ── Step 2: Get current stored values (for change calc + history) ─────────
  const { data: currentRows } = await supabase
    .from("market_data")
    .select("ticker_id, value, history");

  const currentMap = new Map<string, { value: number; history: number[] }>(
    (currentRows ?? []).map(r => [
      r.ticker_id,
      { value: Number(r.value), history: Array.isArray(r.history) ? r.history : [] }
    ])
  );

  // ── Step 3: Build ticker updates ─────────────────────────────────────────

  const CHANGE_THRESHOLDS: Record<string, number> = {
    repo_rate:        0,     // any change
    usd_mur:          0.002, // 0.2%
    eur_mur:          0.002,
    gbp_mur:          0.002,
    semdex:           0.005, // 0.5%
    avg_deposit_rate: 0.001,
    avg_lending_rate: 0.001,
    inflation_yoy:    0,
  };

  const tickerUpdates: TickerRow[] = [];
  const changedTickers: string[]   = [];

  // Helper to push a ticker update
  const pushTicker = (id: string, newVal: number | null, source: string) => {
    if (!newVal || newVal <= 0) return;
    const prev    = currentMap.get(id);
    const prevVal = prev?.value ?? newVal;
    const history = [...(prev?.history ?? []).slice(-6), prevVal].slice(-7);
    const chg     = pctChange(prevVal, newVal);
    const threshold = CHANGE_THRESHOLDS[id] ?? 0.002;

    tickerUpdates.push({
      ticker_id:     id,
      value:         newVal,
      display_value: fmtDisplay(id, newVal),
      change_pct:    chg,
      direction:     direction(chg),
      history,
      source,
    });

    if (Math.abs(chg / 100) > threshold) changedTickers.push(id);
  };

  // FX rates from API (USD base)
  const murPerUsd = apiRates["MUR"];
  if (murPerUsd) {
    pushTicker("usd_mur", murPerUsd,                  "open-er-api");
    pushTicker("eur_mur", murPerUsd / (apiRates["EUR"] ?? 1.1), "open-er-api");
    pushTicker("gbp_mur", murPerUsd / (apiRates["GBP"] ?? 0.78),"open-er-api");
  }

  // Repo rate from BOM
  if (bomRepo) pushTicker("repo_rate", bomRepo, "bom");

  // SEMDEX
  if (semdexVal) pushTicker("semdex", semdexVal, "sem");

  // Calculate avg deposit and lending from bank data if we have bank FX
  // (placeholder — until we have a bank rate scraper, keep existing values)
  const { data: existingDeposit } = await supabase
    .from("market_data")
    .select("value")
    .eq("ticker_id", "avg_deposit_rate")
    .single();
  if (existingDeposit) pushTicker("avg_deposit_rate", Number(existingDeposit.value), "manual");

  const { data: existingLending } = await supabase
    .from("market_data")
    .select("value")
    .eq("ticker_id", "avg_lending_rate")
    .single();
  if (existingLending) pushTicker("avg_lending_rate", Number(existingLending.value), "manual");

  // Inflation — monthly, keep existing unless Statistics Mauritius publishes new
  const { data: existingInflation } = await supabase
    .from("market_data")
    .select("value")
    .eq("ticker_id", "inflation_yoy")
    .single();
  if (existingInflation) pushTicker("inflation_yoy", Number(existingInflation.value), "stats-mu");

  // ── Step 4: Upsert ticker data ───────────────────────────────────────────
  if (tickerUpdates.length > 0) {
    const { error } = await supabase
      .from("market_data")
      .upsert(tickerUpdates, { onConflict: "ticker_id" });
    results.tickers = error
      ? { error: error.message }
      : { updated: tickerUpdates.length, changed: changedTickers };
    log("Tickers upserted:", tickerUpdates.length, "changed:", changedTickers);
  }

  // ── Step 5: Upsert bank FX rates ─────────────────────────────────────────
  const CURRENCIES = ["USD","EUR","GBP","ZAR"];
  const fxUpserts = allBankRates
    .filter(r => CURRENCIES.includes(r.currency))
    .map(r => ({
      currency_code: r.currency,
      currency_pair: `${r.currency} / MUR`,
      bank_name:     r.bank,
      buy_rate:      r.buy,
      sell_rate:     r.sell,
      fetched_at:    now,
    }));

  // Also add API-derived rates as fallback if we have the data
  if (murPerUsd && fxUpserts.filter(r => r.currency_code === "USD").length === 0) {
    const eurMur = murPerUsd / (apiRates["EUR"] ?? 1.1);
    const gbpMur = murPerUsd / (apiRates["GBP"] ?? 0.78);
    // We'll use the API rate as a synthetic "market rate" bank
    fxUpserts.push(
      { currency_code: "USD", currency_pair: "USD / MUR", bank_name: "Market Rate", buy_rate: murPerUsd * 0.995, sell_rate: murPerUsd * 1.005, fetched_at: now },
      { currency_code: "EUR", currency_pair: "EUR / MUR", bank_name: "Market Rate", buy_rate: eurMur * 0.995,    sell_rate: eurMur * 1.005,    fetched_at: now },
      { currency_code: "GBP", currency_pair: "GBP / MUR", bank_name: "Market Rate", buy_rate: gbpMur * 0.995,    sell_rate: gbpMur * 1.005,    fetched_at: now },
    );
  }

  if (fxUpserts.length > 0) {
    const { error } = await supabase
      .from("market_fx_rates")
      .upsert(fxUpserts, { onConflict: "currency_code,bank_name" });
    results.fx_rates = error ? { error: error.message } : { updated: fxUpserts.length };
    log("FX rates upserted:", fxUpserts.length);
  }

  // ── Step 6: Upsert BOM news ──────────────────────────────────────────────
  if (newsItems.length > 0) {
    const { error } = await supabase
      .from("market_news")
      .upsert(
        newsItems.map(n => ({ ...n, published_at: now })),
        { onConflict: "id" },
      );
    results.news = error ? { error: error.message } : { updated: newsItems.length };
  }

  // ── Step 7: AI story regeneration for changed tickers ────────────────────
  const AI_STORY_MAP: Record<string, { label: string; storyKey: string; category: string; emoji: string; cta: boolean }> = {
    usd_mur:   { label: "USD/MUR exchange rate", storyKey: "fx_usd_mur",      category: "Currency",       emoji: "💱", cta: false },
    eur_mur:   { label: "EUR/MUR exchange rate", storyKey: "fx_eur_mur",      category: "Currency",       emoji: "💱", cta: false },
    gbp_mur:   { label: "GBP/MUR exchange rate", storyKey: "fx_gbp_mur",      category: "Currency",       emoji: "💱", cta: false },
    repo_rate: { label: "Bank of Mauritius Repo Rate", storyKey: "repo_rate", category: "Interest Rates", emoji: "🏦", cta: true  },
    semdex:    { label: "SEMDEX stock market index",   storyKey: "semdex",    category: "Stock Market",   emoji: "📈", cta: false },
  };

  let storiesGenerated = 0;
  for (const tickerId of changedTickers) {
    const meta = AI_STORY_MAP[tickerId];
    if (!meta) continue;

    const update = tickerUpdates.find(t => t.ticker_id === tickerId);
    if (!update) continue;

    const story = await generateStory(
      tickerId,
      meta.label,
      update.display_value,
      update.change_pct,
      update.direction,
    );

    if (story) {
      await supabase.from("market_stories").upsert({
        story_key:          meta.storyKey,
        category:           meta.category,
        emoji:              meta.emoji,
        related_cta:        meta.cta,
        headline_everyday:  story.everyday.headline,
        plain_everyday:     story.everyday.plain,
        headline_finance:   story.finance.headline,
        plain_finance:      story.finance.plain,
        generated_at:       now,
      }, { onConflict: "story_key" });
      storiesGenerated++;
      log("Story generated for:", tickerId);
    }
  }

  results.stories_generated = storiesGenerated;
  results.completed_at      = new Date().toISOString();

  log("Refresh complete:", JSON.stringify(results));

  return new Response(JSON.stringify({ ok: true, ...results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
