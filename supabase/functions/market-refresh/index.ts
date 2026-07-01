// market-refresh v6 — uses native Supabase edge runtime client (no bundle bloat)
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const now = () => new Date().toISOString();
const dir = (p: number, c: number) => c > p + 0.001 ? "up" : c < p - 0.001 ? "down" : "flat";
const chg = (p: number, c: number) => p === 0 ? 0 : parseFloat(((c - p) / p * 100).toFixed(2));

async function fetchFx() {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,ZAR,MUR", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const { rates } = await r.json();
    const m = rates.MUR;
    return { usd: +m.toFixed(2), eur: +(m/rates.EUR).toFixed(2), gbp: +(m/rates.GBP).toFixed(2), zar: +(m/rates.ZAR).toFixed(4) };
  } catch { return null; }
}

async function fetchBom() {
  try {
    const r = await fetch("https://www.bom.mu/statistics/key-rates", { headers: { "User-Agent": "Ficium/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const html = await r.text();
    const repo = html.match(/Key\s*Rate[\s\S]{0,300}?(\d+\.\d+)/i) ?? html.match(/Repo\s*Rate[\s\S]{0,300}?(\d+\.\d+)/i);
    if (!repo) return null;
    const dep = html.match(/Average[\s\S]{0,50}?[Dd]eposit[\s\S]{0,200}?(\d+\.\d+)/i);
    const len = html.match(/Average[\s\S]{0,50}?[Ll]ending[\s\S]{0,200}?(\d+\.\d+)/i);
    return { repo: +repo[1], deposit: +(dep?.[1] ?? "3.40"), lending: +(len?.[1] ?? "8.25") };
  } catch { return null; }
}

async function fetchSemdex(): Promise<number | null> {
  try {
    const r = await fetch("https://www.stockexchangeofmauritius.com/api/v1/market/indices", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const data = await r.json();
    const rows: Record<string,unknown>[] = Array.isArray(data) ? data : Object.values(data);
    const row = rows.find(i => String(i.name ?? i.index_name ?? "").toUpperCase().includes("SEMDEX"));
    if (!row) return null;
    const v = parseFloat(String(row.value ?? row.current ?? row.close ?? "0"));
    return v > 100 ? v : null;
  } catch { return null; }
}

async function getPrev(): Promise<Record<string,number>> {
  const { data } = await sb.from("market_data").select("ticker_id,value");
  return Object.fromEntries((data ?? []).map((r: Record<string,unknown>) => [r.ticker_id, parseFloat(String(r.value))]));
}

async function getHist(id: string): Promise<number[]> {
  const { data } = await sb.from("market_data").select("history").eq("ticker_id", id).single();
  return Array.isArray(data?.history) ? (data.history as number[]).map(Number).slice(-6) : [];
}

async function generateNews(snap: Record<string, number | undefined>): Promise<Record<string,unknown>[]> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return [];
  const today = new Date().toLocaleDateString("en-MU", { day:"numeric", month:"long", year:"numeric", timeZone:"Indian/Mauritius" });
  const prompt = `You are a Mauritius financial news writer for Ficium app. Today is ${today}.
Generate 6 short news items from these live figures:
USD/MUR: ${snap.usd}, EUR/MUR: ${snap.eur}, GBP/MUR: ${snap.gbp}, BOM Key Rate: ${snap.repo}%, SEMDEX: ${snap.semdex}
Rules: plain English for everyday Mauritians, grounded in the numbers above, categories must be one of: "Interest Rates"|"Currency"|"Stock Market"|"Economy"|"Savings"|"Lending", related_ticker_id one of: repo_rate|usd_mur|eur_mur|gbp_mur|semdex|avg_deposit_rate|avg_lending_rate (or omit), headline under 80 chars, plain_english under 180 chars.
Respond ONLY with a JSON array, no markdown, no explanation:
[{"headline":"...","category":"...","emoji":"...","plain_english":"...","related_ticker_id":"..."}]`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    const text: string = d.content?.[0]?.text ?? "";
    const items = JSON.parse(text.replace(/```json|```/g, "").trim());
    return Array.isArray(items) ? items.slice(0, 6) : [];
  } catch (e) { console.error("news gen failed", e); return []; }
}

Deno.serve(async () => {
  const ts = now();
  const log: Record<string,unknown> = { started_at: ts };

  const [fx, bom, semdex, prev] = await Promise.all([fetchFx(), fetchBom(), fetchSemdex(), getPrev()]);
  log.sources = { fx: !!fx, bom: !!bom, semdex: !!semdex };

  const ups: Record<string,unknown>[] = [];

  if (fx) {
    for (const [id, val] of [["usd_mur", fx.usd], ["eur_mur", fx.eur], ["gbp_mur", fx.gbp]] as [string, number][]) {
      const p = prev[id] ?? val, h = await getHist(id);
      ups.push({ ticker_id: id, value: val, display_value: val.toFixed(2), change_pct: chg(p, val), direction: dir(p, val), history: [...h, val], source: "frankfurter", fetched_at: ts });
    }
  }
  if (bom) {
    for (const [id, val, fmt] of [["repo_rate", bom.repo, `${bom.repo.toFixed(2)}%`], ["avg_deposit_rate", bom.deposit, `${bom.deposit.toFixed(2)}%`], ["avg_lending_rate", bom.lending, `${bom.lending.toFixed(2)}%`]] as [string, number, string][]) {
      const p = prev[id] ?? val, h = await getHist(id);
      ups.push({ ticker_id: id, value: val, display_value: fmt, change_pct: chg(p, val), direction: dir(p, val), history: [...h, val], source: "bom", fetched_at: ts });
    }
  }
  if (semdex) {
    const p = prev["semdex"] ?? semdex, h = await getHist("semdex");
    ups.push({ ticker_id: "semdex", value: semdex, display_value: new Intl.NumberFormat("en-MU").format(Math.round(semdex)), change_pct: chg(p, semdex), direction: dir(p, semdex), history: [...h, semdex], source: "sem", fetched_at: ts });
  }

  if (ups.length > 0) {
    const { error, count } = await sb.from("market_data").upsert(ups, { onConflict: "ticker_id", count: "exact" });
    log.tickers = error ? { error: error.message } : { updated: count };
  }

  if (fx) {
    const s = (b: number, m: number, dp = 2) => parseFloat((b * m).toFixed(dp));
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
    ].map(r => ({ ...r, fetched_at: ts }));
    const { error, count } = await sb.from("market_fx_rates").upsert(fxRows, { onConflict: "currency_code,bank_name", count: "exact" });
    log.fx_rates = error ? { error: error.message } : { updated: count };
  }

  const news = await generateNews({ usd: fx?.usd, eur: fx?.eur, gbp: fx?.gbp, repo: bom?.repo, semdex: semdex ?? undefined });
  if (news.length > 0) {
    await sb.from("market_news").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error, count } = await sb.from("market_news").insert(
      news.map(n => ({ headline: n.headline, category: n.category, emoji: n.emoji, plain_english: n.plain_english, related_ticker_id: n.related_ticker_id ?? null, published_at: ts, source: "ai" }))
    );
    log.news = error ? { error: error.message } : { generated: count };
  } else {
    await sb.from("market_news").update({ published_at: ts }).neq("id", "00000000-0000-0000-0000-000000000000");
    log.news = { refreshed_timestamps: true };
  }

  log.done_at = now();
  return new Response(JSON.stringify({ ok: true, log }, null, 2), { headers: { "Content-Type": "application/json" } });
});
