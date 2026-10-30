// market-refresh v8 — no invented numbers, visible failures, staleness alert
//
// v8 (2026-10-30):
//   - BOM: no fallback figures. v7 wrote hard-coded 3.40% / 8.25% as the
//     "BOM" average deposit/lending rates whenever the page didn't parse;
//     a figure we can't read is now left at its last real value (with its
//     real fetched_at), never replaced by a guess.
//   - Per-bank FX rows computed from one mid-market rate + assumed spreads
//     are no longer written (the app named a "best bank" from them).
//   - Anthropic failures record the API's error type/message, not just the status.
//   - Every run checks freshness; anything stale makes ok=false and logs
//     "ALERT market stale" (route that line to an alert).
//
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
  // NOTE (Aug 2026): Frankfurter/ECB never carries MUR (ECB tracks ~31
  // currencies, Mauritian Rupee isn't one of them) — rates.MUR was always
  // undefined here, so this silently failed on every run since v7 shipped.
  // Switched to ExchangeRate-API's free, keyless open endpoint (161
  // currencies incl. MUR, daily updates). Same USD-base cross-rate math.
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const { result, rates } = await r.json();
    if (result !== "success") return null;
    const m = rates.MUR;
    if (!m) return null;
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
    // A figure that isn't on the page stays unknown: never a default.
    return { repo: +repo[1], deposit: dep ? +dep[1] : null, lending: len ? +len[1] : null };
  } catch { return null; }
}

async function fetchSemdex(): Promise<number | null> {
  // NOTE (Aug 2026): /api/v1/market/indices was never a real SEM endpoint —
  // it 404'd on every run since v7 shipped. SEM publishes the indices table
  // as plain server-rendered HTML, not JSON. Scrape that page instead: the
  // SEMDEX row is Ticker, Trend, Last Closing, Latest(bold), Change, %Change
  // — take the second decimal figure after the SEMDEX label ("Latest").
  try {
    const r = await fetch("https://www.stockexchangeofmauritius.com/products-market-data/indices", { headers: { "User-Agent": "Ficium/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/SEMDEX[\s\S]{0,500}?([\d,]+\.\d+)[\s\S]{0,200}?([\d,]+\.\d+)/i);
    if (!m) return null;
    const v = parseFloat(m[2].replace(/,/g, ""));
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

/** The API's own reason for a failed call (type + message), for the run log. */
async function anthropicError(r: Response): Promise<string> {
  try {
    const d = await r.json();
    return `anthropic ${r.status} ${d?.error?.type ?? ""}: ${String(d?.error?.message ?? "").slice(0, 200)}`.trim();
  } catch { return `anthropic ${r.status}`; }
}

let lastEnrichError: string | null = null;

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
    if (!r.ok) { lastEnrichError = await anthropicError(r); console.error("news enrichment failed", lastEnrichError); return null; }
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
  if (!enriched) return { error: lastEnrichError ?? "enrichment unavailable", note: "existing news left untouched" };

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
    if (!r.ok) { const e = await anthropicError(r); console.error("story generation failed", e); return { error: e }; }
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

// Only the scheduled job may run this: it costs Anthropic credit and scrapes
// BOM/SEM from our IPs. pg_cron sends x-cron-secret from Vault; we verify it
// through a service_role-only definer function, so the secret is never in env
// or code. (Security audit 2026-10-24: previously publicly invokable.)
async function authorised(req: Request): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (!secret) return false;
  const { data, error } = await sb.rpc("verify_market_refresh_secret", { p_secret: secret });
  return !error && data === true;
}

// What borrowers would see as current but isn't. Thresholds per lane.
async function staleness(): Promise<string[]> {
  const out: string[] = [];
  const age = (iso: unknown) => iso ? (Date.now() - Date.parse(String(iso))) / 3600000 : Infinity;
  const { data: ticks } = await sb.from("market_data").select("ticker_id,fetched_at");
  for (const t of ticks ?? []) {
    const limit = t.ticker_id === "inflation_yoy" ? 24 * 45 : 72;  // monthly series vs daily
    if (age(t.fetched_at) > limit) out.push(`${t.ticker_id} last fetched ${t.fetched_at}`);
  }
  const { data: n } = await sb.from("market_news").select("published_at").order("published_at", { ascending: false }).limit(1);
  if (age(n?.[0]?.published_at) > 72) out.push(`news newest ${n?.[0]?.published_at ?? "none"}`);
  const { data: st } = await sb.from("market_stories").select("generated_at").order("generated_at", { ascending: false }).limit(1);
  if (age(st?.[0]?.generated_at) > 48) out.push(`stories newest ${st?.[0]?.generated_at ?? "none"}`);
  return out;
}

Deno.serve(async (req: Request) => {
  if (!(await authorised(req))) {
    return new Response(JSON.stringify({ error: "unauthorised" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  const ts = now();
  const log: Record<string,unknown> = { started_at: ts, version: "v8" };

  const [fx, bom, semdex, prev] = await Promise.all([fetchFx(), fetchBom(), fetchSemdex(), getPrev()]);
  log.sources = { fx: !!fx, bom: !!bom, semdex: !!semdex };

  const ups: Record<string,unknown>[] = [];

  if (fx) {
    for (const [id, val] of [["usd_mur", fx.usd], ["eur_mur", fx.eur], ["gbp_mur", fx.gbp]] as [string, number][]) {
      const p = prev[id] ?? val, h = await getHist(id);
      ups.push({ ticker_id: id, value: val, display_value: val.toFixed(2), change_pct: chg(p, val), direction: dir(p, val), history: [...h, val], source: "exchangerate-api", fetched_at: ts });
    }
  }
  if (bom) {
    const bomRows = ([["repo_rate", bom.repo], ["avg_deposit_rate", bom.deposit], ["avg_lending_rate", bom.lending]] as [string, number | null][])
      .filter((r): r is [string, number] => r[1] !== null && Number.isFinite(r[1]))
      .map(([id, v]) => [id, v, `${v.toFixed(2)}%`] as [string, number, string]);
    for (const [id, val, fmt] of bomRows) {
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

  // v8: no per-bank FX rows. They were one mid-market rate times assumed
  // per-bank spreads, and the app used them to name a "best bank".
  log.fx_rates = { skipped: "no real per-bank quotes feed" };

  const snap = { usd: fx?.usd, eur: fx?.eur, gbp: fx?.gbp, repo: bom?.repo, semdex: semdex ?? undefined };

  // Lane 2: real news. Lane 3: stories (uses freshly ingested headlines).
  log.news    = await ingestNews(snap);
  log.stories = await generateStories(snap, prev);

  log.stale = await staleness();
  const ok = (log.stale as string[]).length === 0;
  if (!ok) console.error("ALERT market stale", JSON.stringify(log.stale));

  log.done_at = now();
  return new Response(JSON.stringify({ ok, log }, null, 2), { headers: { "Content-Type": "application/json" } });
});
