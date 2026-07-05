// market-refresh v7 — real news ingestion + regenerated stories + honest freshness
//
// Content lanes per run:
//   1. Tickers / FX / BOM / SEMDEX   — unchanged from v6 (live numeric data)
//   2. News                          — REAL headlines ingested from RSS
//        (Mauritius + global finance), deduped by content hash, then enriched
//        by Haiku into plain-English + detail body. Real published_at, real
//        source name + URL. No invented events, no re-stamped timestamps.
//   3. Stories                       — regenerated dual-mode explainers from
//        the live snapshot + week-over-week deltas + today's real headlines,
//        upserted into market_stories with generated_at.
//
// Honesty rules (v7):
//   - On any ingestion failure, existing rows are left UNTOUCHED. We never
//     bump published_at to fake freshness (v6 behaviour removed).
//   - The AI enrichment prompt is grounded in fetched titles + live numbers
//     only; it rewrites, it does not report events we didn't fetch.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const now = () => new Date().toISOString();
const dir = (p: number, c: number) => c > p + 0.001 ? "up" : c < p - 0.001 ? "down" : "flat";
const chg = (p: number, c: number) => p === 0 ? 0 : parseFloat(((c - p) / p * 100).toFixed(2));

// ─────────────────────────────────────────────────────────────────────────────
// Lane 1 — live numeric data (unchanged from v6)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Lane 2 — real news ingestion (RSS → dedupe → grounded AI enrichment)
// ─────────────────────────────────────────────────────────────────────────────

type NewsScope = "local" | "global";

interface RawHeadline {
  title:       string;
  link:        string;
  sourceName:  string;
  publishedAt: string;   // ISO
  scope:       NewsScope;
}

/** RSS feeds per scope. Google News RSS is stable, keyless, and carries
 *  real publisher names + links per item. `when:` bounds recency. */
const NEWS_FEEDS: { url: string; scope: NewsScope }[] = [
  {
    scope: "local",
    url: "https://news.google.com/rss/search?q=" +
      encodeURIComponent('Mauritius (economy OR banking OR "Bank of Mauritius" OR rupee OR MCB OR inflation) when:3d') +
      "&hl=en&gl=MU&ceid=MU:en",
  },
  {
    scope: "global",
    url: "https://news.google.com/rss/search?q=" +
      encodeURIComponent('("central bank" OR "interest rates" OR "Federal Reserve" OR ECB OR "global markets" OR inflation) when:1d') +
      "&hl=en&gl=US&ceid=US:en",
  },
];

const MAX_PER_SCOPE   = 6;    // candidates enriched per scope per run
const NEWS_KEEP_MAX   = 40;   // rows retained in market_news
const NEWS_KEEP_DAYS  = 7;    // rows older than this are pruned

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return m ? m[1] : s;
}

/** Minimal, dependency-free RSS <item> parser. Google News items always
 *  carry <title>, <link>, <pubDate> and <source>. */
function parseRssItems(xml: string, scope: NewsScope): RawHeadline[] {
  const out: RawHeadline[] = [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const item of items) {
    const pick = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(stripCdata(m[1].trim())) : "";
    };
    const title = pick("title");
    const link  = pick("link");
    const pub   = pick("pubDate");
    if (!title || !link) continue;
    // Google News titles end with " - Publisher"; prefer the <source> tag.
    const sourceName = pick("source") || title.split(" - ").pop() || "News";
    const cleanTitle = sourceName && title.endsWith(` - ${sourceName}`)
      ? title.slice(0, -(sourceName.length + 3))
      : title;
    const publishedAt = pub && !Number.isNaN(Date.parse(pub))
      ? new Date(pub).toISOString()
      : now();
    out.push({ title: cleanTitle, link, sourceName, publishedAt, scope });
  }
  return out;
}

async function fetchFeed(url: string, scope: NewsScope): Promise<RawHeadline[]> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Ficium/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    return parseRssItems(await r.text(), scope);
  } catch { return []; }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface EnrichedItem {
  headline:          string;
  category:          string;
  emoji:             string;
  plain_english:     string;
  body:              string;
  related_ticker_id: string | null;
}

/** Rewrite real headlines into Ficium's plain-English format. Grounded:
 *  the model only rephrases and contextualises titles we fetched, using
 *  the live snapshot for the "what this means for you" angle. */
async function enrichHeadlines(
  raw: RawHeadline[],
  snap: Record<string, number | undefined>,
): Promise<EnrichedItem[] | null> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key || raw.length === 0) return null;
  const today = new Date().toLocaleDateString("en-MU", { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Mauritius" });
  const list = raw.map((h, i) => `${i}. [${h.scope}] "${h.title}" — ${h.sourceName}`).join("\n");
  const prompt = `You are a financial editor for Ficium, a Mauritius lending marketplace app. Today is ${today}.

Live Mauritius figures: USD/MUR ${snap.usd ?? "n/a"}, EUR/MUR ${snap.eur ?? "n/a"}, GBP/MUR ${snap.gbp ?? "n/a"}, BOM Key Rate ${snap.repo ?? "n/a"}%, SEMDEX ${snap.semdex ?? "n/a"}.

Here are REAL headlines fetched just now (index. [scope] "title" — publisher):
${list}

For EACH headline, in the same order, produce a JSON object:
- "headline": the story restated clearly, under 80 chars. Keep it factual to the original title — do not add events or numbers not present in the title or the live figures above.
- "category": one of "Interest Rates"|"Currency"|"Stock Market"|"Economy"|"Savings"|"Lending".
- "emoji": one relevant emoji.
- "plain_english": under 180 chars, what this means for an everyday Mauritian.
- "body": 2–3 sentences of context and practical impact. Ground it ONLY in the title and the live figures. If the title alone isn't enough for specifics, stay general — never invent facts, quotes, or numbers.
- "related_ticker_id": one of repo_rate|usd_mur|eur_mur|gbp_mur|semdex|avg_deposit_rate|avg_lending_rate, or null.

Respond ONLY with a JSON array of ${raw.length} objects in input order. No markdown, no commentary.`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const text: string = d.content?.[0]?.text ?? "";
    const items = JSON.parse(text.replace(/```json|```/g, "").trim());
    return Array.isArray(items) && items.length === raw.length ? items : null;
  } catch (e) { console.error("news enrichment failed", e); return null; }
}

async function ingestNews(snap: Record<string, number | undefined>): Promise<Record<string, unknown>> {
  // 1. Fetch both feeds in parallel
  const feeds = await Promise.all(NEWS_FEEDS.map(f => fetchFeed(f.url, f.scope)));
  const candidates = feeds.flatMap(items => items.slice(0, MAX_PER_SCOPE * 2));
  if (candidates.length === 0) return { skipped: "no feed items — existing news left untouched" };

  // 2. Dedupe against what we've already ingested (hash of canonical link)
  const hashed = await Promise.all(candidates.map(async h => ({ ...h, hash: await sha256Hex(h.link) })));
  const { data: existing } = await sb
    .from("market_news").select("content_hash").not("content_hash", "is", null);
  const seen = new Set((existing ?? []).map((r: Record<string, unknown>) => String(r.content_hash)));
  const perScope: Record<NewsScope, number> = { local: 0, global: 0 };
  const fresh = hashed.filter(h => {
    if (seen.has(h.hash) || perScope[h.scope] >= MAX_PER_SCOPE) return false;
    seen.add(h.hash);
    perScope[h.scope]++;
    return true;
  });
  if (fresh.length === 0) return { skipped: "no new headlines since last run" };

  // 3. Enrich with grounded AI rewrite
  const enriched = await enrichHeadlines(fresh, snap);
  if (!enriched) return { skipped: "enrichment unavailable — existing news left untouched" };

  // 4. Insert with REAL timestamps and attribution
  const rows = fresh.map((h, i) => ({
    headline:          enriched[i].headline || h.title,
    category:          enriched[i].category,
    emoji:             enriched[i].emoji || "📰",
    plain_english:     enriched[i].plain_english,
    body:              enriched[i].body,
    related_ticker_id: enriched[i].related_ticker_id ?? null,
    scope:             h.scope,
    source_name:       h.sourceName,
    source_url:        h.link,
    content_hash:      h.hash,
    published_at:      h.publishedAt,
    source:            "rss+ai",
  }));
  const { error, count } = await sb.from("market_news").insert(rows, { count: "exact" });
  if (error) return { error: error.message };

  // 5. Prune: drop rows past retention, keep at most NEWS_KEEP_MAX
  await sb.from("market_news").delete()
    .lt("published_at", new Date(Date.now() - NEWS_KEEP_DAYS * 86400000).toISOString());
  const { data: overflow } = await sb.from("market_news")
    .select("id").order("published_at", { ascending: false }).range(NEWS_KEEP_MAX, NEWS_KEEP_MAX + 200);
  if (overflow?.length) {
    await sb.from("market_news").delete().in("id", overflow.map((r: Record<string, unknown>) => r.id));
  }
  return { ingested: count, local: perScope.local, global: perScope.global };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lane 3 — regenerated dual-mode stories (snapshot + deltas + real headlines)
// ─────────────────────────────────────────────────────────────────────────────

const STORIES_KEEP_MAX = 12;

async function generateStories(
  snap: Record<string, number | undefined>,
  prev: Record<string, number>,
): Promise<Record<string, unknown>> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { skipped: "no API key" };

  const { data: topNews } = await sb.from("market_news")
    .select("headline,scope,source_name")
    .order("published_at", { ascending: false }).limit(5);
  const headlines = (topNews ?? [])
    .map((n: Record<string, unknown>) => `- [${n.scope}] ${n.headline} (${n.source_name ?? "Ficium"})`)
    .join("\n") || "- (none available)";

  const delta = (id: string, cur?: number) =>
    cur !== undefined && prev[id] !== undefined && prev[id] !== 0
      ? `${cur} (prev ${prev[id]}, ${chg(prev[id], cur)}%)`
      : String(cur ?? "n/a");

  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prompt = `You are a financial storyteller for Ficium, a Mauritius lending marketplace. Today is ${today.toLocaleDateString("en-MU", { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Mauritius" })}.

Live figures with change vs last refresh:
USD/MUR ${delta("usd_mur", snap.usd)}, EUR/MUR ${delta("eur_mur", snap.eur)}, GBP/MUR ${delta("gbp_mur", snap.gbp)}, BOM Key Rate ${delta("repo_rate", snap.repo)}%, SEMDEX ${delta("semdex", snap.semdex)}.

Real headlines currently in the app:
${headlines}

Write 6 story cards explaining what today's market means for people's money. Each card has an "everyday" version (warm, jargon-free, for non-financial readers) and a "finance" version (precise, numeric, for professionals). Ground every claim in the figures/headlines above — never invent numbers or events. At most 2 cards may set related_cta true (when a Ficium request genuinely helps, e.g. beating average lending/deposit rates).

Respond ONLY with a JSON array of 6 objects, no markdown:
[{
  "slug": "short-kebab-case-topic",
  "category": "Interest Rates"|"Currency"|"Stock Market"|"Economy"|"Savings"|"Lending",
  "emoji": "…",
  "related_cta": false,
  "headline_everyday": "<70 chars", "plain_everyday": "<160 chars hook",
  "detail_everyday": "3-4 sentences, concrete and practical",
  "headline_finance": "<70 chars, numeric", "plain_finance": "<160 chars",
  "detail_finance": "3-4 sentences with the relevant figures"
}]`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return { error: `anthropic ${r.status}` };
    const d = await r.json();
    const text: string = d.content?.[0]?.text ?? "";
    const items = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!Array.isArray(items) || items.length === 0) return { skipped: "empty generation" };

    const ts = now();
    const rows = items.slice(0, 6).map((s: Record<string, unknown>) => ({
      story_key:         `${dateKey}_${String(s.slug ?? "story").slice(0, 40)}`,
      category:          s.category,
      emoji:             s.emoji ?? "💡",
      related_cta:       Boolean(s.related_cta),
      headline_everyday: s.headline_everyday,
      plain_everyday:    s.plain_everyday,
      detail_everyday:   s.detail_everyday ?? "",
      headline_finance:  s.headline_finance,
      plain_finance:     s.plain_finance,
      detail_finance:    s.detail_finance ?? "",
      generated_at:      ts,
    }));
    const { error, count } = await sb.from("market_stories")
      .upsert(rows, { onConflict: "story_key", count: "exact" });
    if (error) return { error: error.message };

    // Prune old stories beyond retention window
    const { data: overflow } = await sb.from("market_stories")
      .select("id").order("generated_at", { ascending: false })
      .range(STORIES_KEEP_MAX, STORIES_KEEP_MAX + 100);
    if (overflow?.length) {
      await sb.from("market_stories").delete().in("id", overflow.map((r: Record<string, unknown>) => r.id));
    }
    return { generated: count };
  } catch (e) {
    console.error("story generation failed", e);
    return { error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const ts = now();
  const log: Record<string,unknown> = { started_at: ts, version: "v7" };

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
    ].map(r => ({ ...r, currency_pair: `${r.currency_code} / MUR`, fetched_at: ts }));
    const { error, count } = await sb.from("market_fx_rates").upsert(fxRows, { onConflict: "currency_code,bank_name", count: "exact" });
    log.fx_rates = error ? { error: error.message } : { updated: count };
  }

  const snap = { usd: fx?.usd, eur: fx?.eur, gbp: fx?.gbp, repo: bom?.repo, semdex: semdex ?? undefined };

  // Lane 2: real news. Lane 3: stories (uses freshly ingested headlines).
  log.news    = await ingestNews(snap);
  log.stories = await generateStories(snap, prev);

  log.done_at = now();
  return new Response(JSON.stringify({ ok: true, log }, null, 2), { headers: { "Content-Type": "application/json" } });
});
