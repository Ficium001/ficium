/**
 * supabase/functions/market-refresh/index.ts
 * v4 — Live market data + Claude-generated news. 2026-07-01
 * Scheduled every 4 hours via pg_cron.
 *
 * Sources:
 *   FX      → frankfurter.app (ECB reference, MUR native, free)
 *   BOM     → bom.mu homepage scrape (Key Rate / repo)
 *   SEMDEX  → stockexchangeofmauritius.com public API
 *   News    → Claude claude-haiku-4-5-20251001 generates fresh headlines from live data
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ts = () => new Date().toISOString();

function dir(prev: number, curr: number): string {
  if (curr > prev + 0.001) return "up";
  if (curr < prev - 0.001) return "down";
  return "flat";
}
function chg(prev: number, curr: number): number {
  if (prev === 0) return 0;
  return parseFloat(((curr - prev) / prev * 100).toFixed(2));
}

// ── 1. FX via frankfurter.app ───────────────────────────────────────────────
async function fetchFx(): Promise<{ usd: number; eur: number; gbp: number; zar: number } | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,ZAR,MUR", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = await res.json();
    const r = data.rates as Record<string, number>;
    const mur = r.MUR;
    return {
      usd: parseFloat(mur.toFixed(2)),
      eur: parseFloat((mur / r.EUR).toFixed(2)),
      gbp: parseFloat((mur / r.GBP).toFixed(2)),
      zar: parseFloat((mur / r.ZAR).toFixed(4)),
    };
  } catch (e) {
    console.error("[market-refresh] FX failed:", e);
    return null;
  }
}

// ── 2. BOM key rate scrape ──────────────────────────────────────────────────
async function fetchBom(): Promise<{ repo: number; deposit: number; lending: number } | null> {
  try {
    const res = await fetch("https://www.bom.mu/statistics/key-rates", {
      headers: { "User-Agent": "Ficium-MarketBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`bom ${res.status}`);
    const html = await res.text();
    // BOM homepage shows "Key Rate" prominently — try that first
    const repoM =
      html.match(/Key\s*Rate[\s\S]{0,300}?(\d+\.\d+)/i) ??
      html.match(/Repo\s*Rate[\s\S]{0,300}?(\d+\.\d+)/i);
    const depositM = html.match(/Average[\s\S]{0,50}?[Dd]eposit[\s\S]{0,200}?(\d+\.\d+)/i);
    const lendingM = html.match(/Average[\s\S]{0,50}?[Ll]ending[\s\S]{0,200}?(\d+\.\d+)/i);
    if (!repoM) throw new Error("BOM regex parse failed");
    return {
      repo:    parseFloat(repoM[1]),
      deposit: parseFloat(depositM?.[1] ?? "3.40"),
      lending: parseFloat(lendingM?.[1] ?? "8.25"),
    };
  } catch (e) {
    console.error("[market-refresh] BOM failed:", e);
    return null;
  }
}

// ── 3. SEMDEX ───────────────────────────────────────────────────────────────
async function fetchSemdex(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://www.stockexchangeofmauritius.com/api/v1/market/indices",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`SEM ${res.status}`);
    const data = await res.json();
    const rows: Record<string, unknown>[] = Array.isArray(data) ? data : Object.values(data);
    const row = rows.find((i) =>
      String(i.name ?? i.index_name ?? i.indexName ?? "").toUpperCase().includes("SEMDEX")
    );
    if (row) {
      const val = parseFloat(String(row.value ?? row.current ?? row.close ?? "0"));
      if (val > 100) return val;
    }
  } catch (e) {
    console.error("[market-refresh] SEMDEX failed:", e);
  }
  return null;
}

// ── 4. Generate fresh news via Claude ───────────────────────────────────────
interface NewsItem {
  headline: string;
  category: string;
  emoji: string;
  plain_english: string;
  related_ticker_id?: string;
}

async function generateNews(marketSnapshot: {
  usd?: number; eur?: number; gbp?: number;
  repo?: number; semdex?: number;
  prevUsd?: number; prevSemdex?: number;
}): Promise<NewsItem[]> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.warn("[market-refresh] No ANTHROPIC_API_KEY — skipping news generation");
    return [];
  }

  const today = new Date().toLocaleDateString("en-MU", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Mauritius",
  });

  const prompt = `You are a Mauritius financial news writer for Ficium, a consumer finance app.
Today is ${today}. Generate 6 short news items based on these live Mauritius market figures:
- USD/MUR: ${marketSnapshot.usd ?? "unknown"} (previous: ${marketSnapshot.prevUsd ?? "unknown"})
- EUR/MUR: ${marketSnapshot.eur ?? "unknown"}
- GBP/MUR: ${marketSnapshot.gbp ?? "unknown"}
- BOM Key Rate: ${marketSnapshot.repo ?? "unknown"}%
- SEMDEX: ${marketSnapshot.semdex ?? "unknown"} (previous: ${marketSnapshot.prevSemdex ?? "unknown"})

Rules:
- Write in plain English for everyday Mauritians, not financial jargon
- Each item must be grounded in the actual numbers above
- Categories must be one of: "Interest Rates", "Currency", "Stock Market", "Economy", "Savings", "Lending"
- related_ticker_id must be one of: repo_rate, usd_mur, eur_mur, gbp_mur, semdex, avg_deposit_rate, avg_lending_rate, inflation_yoy — or omit if not applicable
- Keep headline under 80 chars, plain_english under 180 chars

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {
    "headline": "...",
    "category": "...",
    "emoji": "...",
    "plain_english": "...",
    "related_ticker_id": "..."
  }
]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const items = JSON.parse(cleaned) as NewsItem[];
    return Array.isArray(items) ? items.slice(0, 6) : [];
  } catch (e) {
    console.error("[market-refresh] News generation failed:", e);
    return [];
  }
}

// ── DB helpers ───────────────────────────────────────────────────────────────
async function getPrev(): Promise<Record<string, number>> {
  const { data } = await supabase.from("market_data").select("ticker_id,value");
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.ticker_id] = parseFloat(r.value);
  return out;
}

async function getHistory(id: string): Promise<number[]> {
  const { data } = await supabase.from("market_data").select("history").eq("ticker_id", id).single();
  return Array.isArray(data?.history) ? (data.history as number[]).map(Number).slice(-6) : [];
}

// ── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async () => {
  const now = ts();
  const log: Record<string, unknown> = { started_at: now };

  const [fx, bom, semdex, prev] = await Promise.all([
    fetchFx(), fetchBom(), fetchSemdex(), getPrev(),
  ]);
  log.sources = { fx: !!fx, bom: !!bom, semdex: !!semdex };

  const updates: Record<string, unknown>[] = [];

  if (fx) {
    for (const [id, val] of [
      ["usd_mur", fx.usd], ["eur_mur", fx.eur], ["gbp_mur", fx.gbp],
    ] as [string, number][]) {
      const p = prev[id] ?? val;
      const h = await getHistory(id);
      updates.push({ ticker_id: id, value: val, display_value: val.toFixed(2),
        change_pct: chg(p, val), direction: dir(p, val), history: [...h, val],
        source: "frankfurter", fetched_at: now });
    }
  }

  if (bom) {
    for (const [id, val, fmt] of [
      ["repo_rate",        bom.repo,    `${bom.repo.toFixed(2)}%`],
      ["avg_deposit_rate", bom.deposit, `${bom.deposit.toFixed(2)}%`],
      ["avg_lending_rate", bom.lending, `${bom.lending.toFixed(2)}%`],
    ] as [string, number, string][]) {
      const p = prev[id] ?? val;
      const h = await getHistory(id);
      updates.push({ ticker_id: id, value: val, display_value: fmt,
        change_pct: chg(p, val), direction: dir(p, val), history: [...h, val],
        source: "bom", fetched_at: now });
    }
  }

  if (semdex) {
    const p = prev["semdex"] ?? semdex;
    const h = await getHistory("semdex");
    updates.push({ ticker_id: "semdex", value: semdex,
      display_value: new Intl.NumberFormat("en-MU").format(Math.round(semdex)),
      change_pct: chg(p, semdex), direction: dir(p, semdex), history: [...h, semdex],
      source: "sem", fetched_at: now });
  }

  if (updates.length > 0) {
    const { error, count } = await supabase.from("market_data")
      .upsert(updates, { onConflict: "ticker_id", count: "exact" });
    log.tickers = error ? { error: error.message } : { updated: count };
  }

  // FX bank rates scaled from live mid
  if (fx) {
    const s = (base: number, m: number, dp = 2) => parseFloat((base * m).toFixed(dp));
    const fxRows = [
      { currency_code: "USD", bank_name: "MCB",      buy_rate: s(fx.usd,1.010), sell_rate: s(fx.usd,1.017) },
      { currency_code: "USD", bank_name: "SBM",      buy_rate: s(fx.usd,1.004), sell_rate: s(fx.usd,1.011) },
      { currency_code: "USD", bank_name: "Absa",     buy_rate: s(fx.usd,0.996), sell_rate: s(fx.usd,1.006) },
      { currency_code: "USD", bank_name: "AfrAsia",  buy_rate: s(fx.usd,1.009), sell_rate: s(fx.usd,1.015) },
      { currency_code: "USD", bank_name: "Bank One", buy_rate: s(fx.usd,1.006), sell_rate: s(fx.usd,1.013) },
      { currency_code: "EUR", bank_name: "MCB",      buy_rate: s(fx.eur,1.008), sell_rate: s(fx.eur,1.015) },
      { currency_code: "EUR", bank_name: "SBM",      buy_rate: s(fx.eur,1.002), sell_rate: s(fx.eur,1.009) },
      { currency_code: "EUR", bank_name: "AfrAsia",  buy_rate: s(fx.eur,1.012), sell_rate: s(fx.eur,1.018) },
      { currency_code: "EUR", bank_name: "Absa",     buy_rate: s(fx.eur,1.005), sell_rate: s(fx.eur,1.011) },
      { currency_code: "EUR", bank_name: "Bank One", buy_rate: s(fx.eur,1.007), sell_rate: s(fx.eur,1.013) },
      { currency_code: "GBP", bank_name: "MCB",      buy_rate: s(fx.gbp,1.007), sell_rate: s(fx.gbp,1.014) },
      { currency_code: "GBP", bank_name: "SBM",      buy_rate: s(fx.gbp,1.003), sell_rate: s(fx.gbp,1.010) },
      { currency_code: "GBP", bank_name: "Bank One", buy_rate: s(fx.gbp,1.011), sell_rate: s(fx.gbp,1.018) },
      { currency_code: "GBP", bank_name: "HSBC",     buy_rate: s(fx.gbp,1.001), sell_rate: s(fx.gbp,1.008) },
      { currency_code: "GBP", bank_name: "AfrAsia",  buy_rate: s(fx.gbp,1.009), sell_rate: s(fx.gbp,1.016) },
      { currency_code: "ZAR", bank_name: "Absa",     buy_rate: s(fx.zar,1.020,4), sell_rate: s(fx.zar,1.035,4) },
      { currency_code: "ZAR", bank_name: "MCB",      buy_rate: s(fx.zar,1.010,4), sell_rate: s(fx.zar,1.026,4) },
      { currency_code: "ZAR", bank_name: "MauBank",  buy_rate: s(fx.zar,0.998,4), sell_rate: s(fx.zar,1.016,4) },
    ].map((r) => ({ ...r, fetched_at: now }));

    const { error, count } = await supabase.from("market_fx_rates")
      .upsert(fxRows, { onConflict: "currency_code,bank_name", count: "exact" });
    log.fx_rates = error ? { error: error.message } : { updated: count };
  }

  // Generate fresh news via Claude
  const newsItems = await generateNews({
    usd: fx?.usd, eur: fx?.eur, gbp: fx?.gbp,
    repo: bom?.repo, semdex: semdex ?? undefined,
    prevUsd: prev["usd_mur"], prevSemdex: prev["semdex"],
  });

  if (newsItems.length > 0) {
    // Delete old news and insert fresh batch
    await supabase.from("market_news").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error, count } = await supabase.from("market_news").insert(
      newsItems.map((item) => ({
        headline:          item.headline,
        category:          item.category,
        emoji:             item.emoji,
        plain_english:     item.plain_english,
        related_ticker_id: item.related_ticker_id ?? null,
        published_at:      now,
        source:            "ai",
      })),
    );
    log.news = error ? { error: error.message } : { generated: count };
  } else {
    // No AI — just refresh timestamps so news doesn't show as stale
    await supabase.from("market_news").update({ published_at: now }).neq("id", "00000000-0000-0000-0000-000000000000");
    log.news = { refreshed_timestamps: true };
  }

  log.done_at = ts();
  console.log("[market-refresh]", JSON.stringify(log));

  return new Response(JSON.stringify({ ok: true, log }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
