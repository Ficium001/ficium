# Ficium — Markets Module

_Last updated: June 2026 · Owner: engineering_

---

## 1. Overview

The Markets module (`src/individual/markets/`) gives Ficium clients a live financial dashboard
for the Mauritius market. It is the primary engagement surface outside of requests/bids —
designed to be opened daily, not just when a user needs a loan.

**Core value propositions:**
- Best FX rates across all Mauritius banks (unique in the market)
- Deposit & lending rate comparison in one place
- Plain-English stories so non-financial users understand what market moves mean for them
- Dual mode: "Everyday" (layman) and "Finance" (professional) — same data, different framing

---

## 2. Module structure

```
src/individual/markets/
├── types/
│   └── index.ts          — All domain types; single source of truth
├── config/
│   └── tickers.ts        — Ticker metadata, colors, stories, category colors
├── api/
│   ├── index.ts          — Adapter selector (change one import to go live)
│   └── mock.ts           — Mock adapter — mirrors live API shape exactly
├── hooks/
│   ├── useMarketData.ts       — Tickers, FX, deposit, lending (+ _rawResult)
│   ├── useMarketNews.ts       — News headlines + dual-mode stories
│   ├── useAiMarketSummary.ts  — Streams AI summary, 30min client cache
│   ├── useAiMarketChat.ts     — Streaming AI Q&A conversation state
│   └── index.ts               — Barrel
├── components/
│   ├── MarketHeader.tsx      — Top bar: title, live indicator, refresh button
│   ├── TickerStrip.tsx       — Horizontal scrollable ticker row
│   ├── TickerCard.tsx        — Individual ticker tile with sparkline
│   ├── StoryCallout.tsx      — Inline callout when ticker is selected
│   ├── ChangeBadge.tsx       — ▲ / ▼ percentage badge
│   ├── Sparkline.tsx         — SVG mini chart
│   ├── RatesPanel.tsx        — Deposit & lending rate tables (side by side)
│   ├── RatesSummaryBar.tsx   — AI-generated one-liner summary
│   ├── FxBestRates.tsx       — Best FX rate grid (all Mauritius banks)
│   ├── MarketNewsFeed.tsx    — Full-width expandable news list
│   ├── StoryModeToggle.tsx   — "Everyday / Finance" pill toggle
│   ├── StoriesGrid.tsx       — 2-col expandable story cards
│   ├── FiciumCTA.tsx         — Conversion banner
│   └── index.ts              — Barrel
└── pages/
    └── Markets.tsx           — Thin orchestrator; no data-fetch logic
```

---

## 3. Page layout (top → bottom)

| Section | Component | Description |
|---|---|---|
| Header | `MarketHeader` | Title, live dot, last-updated, refresh |
| Tickers | `TickerStrip` → `TickerCard` | 8 tickers; scroll on mobile, grid on desktop |
| Callout | `StoryCallout` | Ticker explainer + streaming AI "Explain" button |
| AI Summary | `RatesSummaryBar` | Streaming AI one-sentence market summary |
| AI Q&A | `AiMarketChat` | Inline ask-AI panel, grounded in live data |
| FX | `FxBestRates` | Best buy rate today, all 4 major currencies |
| News | `MarketNewsFeed` | **Headlines** — what happened, when (timestamped) |
| Stories | `StoryModeToggle` + `StoriesGrid` | **Explainers** — evergreen, everyday/finance toggle |
| CTA | `FiciumCTA` | Conversion to new request |

---

## 4. Data types

### Ticker
```typescript
interface TickerReading {
  value:        number;      // raw numeric
  displayValue: string;      // "4.00%", "46.32"
  change:       number;      // % vs prior period
  direction:    Direction;   // "up" | "down" | "flat"
  history:      number[];    // 7 readings for sparkline
  fetchedAt:    Date;
}
```

### FxRate
```typescript
interface FxRate {
  currency:       string;   // "USD / MUR"
  currencyCode:   string;   // "USD"
  bestBank:       string;
  bestRate:       number;
  worstBank:      string;
  worstRate:      number;
  savingPer1000:  string;   // "Rs 700 per $1,000"
  updatedAt:      Date;
}
```

### StoryItem
```typescript
interface StoryItem {
  id:          string;
  emoji:       string;
  category:    NewsCategory;
  relatedCTA:  boolean;
  everyday:    { headline: string; plain: string };
  finance:     { headline: string; plain: string };
}
```

Full type definitions: `src/individual/markets/types/index.ts`

---

## 5. Data adapters

The API surface (`api/index.ts`) is a single import swap:

```typescript
// Current (mock)
export { fetchMarketData, fetchMarketNews } from "./mock";

// Switch to live data (change this one line):
export { fetchMarketData, fetchMarketNews } from "./supabase";
// or:
export { fetchMarketData, fetchMarketNews } from "./bom";
```

### Planned adapters

| File | Status | Description |
|---|---|---|
| `mock.ts` | ✅ Live | Static data with simulated latency |
| `supabase.ts` | ⏳ Planned | Reads from `market_data` and `market_stories` tables |
| `bom.ts` | ⏳ Planned | Direct BOM + SEM + bank scraping (via Edge Function) |

---

## 6. Live data architecture (planned)

```
Supabase Edge Function (cron: every 30 min)
├── Scrape Bank of Mauritius → repo_rate, avg_deposit_rate, avg_lending_rate
├── Scrape all 8 Mauritius bank websites → FX buy/sell rates per currency
├── Scrape Stock Exchange of Mauritius (SEM) → SEMDEX daily close
├── Fetch exchangerate.host API (backup validation) → USD/EUR/GBP/ZAR vs MUR
├── Fetch Statistics Mauritius RSS → CPI / inflation_yoy
├── Scrape L'Express / Le Défi → top 5 financial headlines
├── If any value changed meaningfully:
│   └── Call Claude Haiku → generate everyday + finance story per item
│       (cached in Supabase — only regenerated when data changes)
└── Upsert → market_data + market_stories tables

Frontend adapter (supabase.ts)
└── Single read from market_data + market_stories
    → Same MarketDataResult / NewsResult shape as mock
    → Zero changes to hooks, components, or page
```

**Estimated AI cost:** ~20 story generations/day × $0.001 = **~$0.60/month**

---

## 7. Planned Supabase schema

```sql
-- Cached market readings (one row per ticker, upserted each refresh)
create table market_data (
  id           uuid primary key default gen_random_uuid(),
  ticker_id    text not null unique,
  value        numeric not null,
  display_value text not null,
  change_pct   numeric not null default 0,
  direction    text not null check (direction in ('up','down','flat')),
  history      numeric[] not null default '{}',
  source       text not null,
  fetched_at   timestamptz not null default now()
);

-- FX rates (one row per currency pair per bank)
create table market_fx_rates (
  id            uuid primary key default gen_random_uuid(),
  currency_code text not null,    -- "USD"
  bank_name     text not null,
  buy_rate      numeric not null,
  sell_rate     numeric not null,
  fetched_at    timestamptz not null default now(),
  unique (currency_code, bank_name)
);

-- AI-generated stories (everyday + finance version per item)
create table market_stories (
  id                uuid primary key default gen_random_uuid(),
  story_key         text not null unique,   -- "repo_rate_q3_2025"
  category          text not null,
  emoji             text not null,
  related_cta       boolean not null default false,
  headline_everyday text not null,
  plain_everyday    text not null,
  headline_finance  text not null,
  plain_finance     text not null,
  generated_at      timestamptz not null default now()
);
```

---

## 8. Adding a new ticker

1. Add the `TickerId` literal to `types/index.ts`
2. Add config entry to `config/tickers.ts` (label, icon, color, story)
3. Add `TICKER_ORDER` entry to position it in the strip
4. Add mock reading to `api/mock.ts`
5. That's it — TickerStrip, TickerCard, Sparkline all work automatically

---

## 9. Conventions

- **No data fetching in components.** All fetching in hooks only.
- **No hardcoded values in components.** All labels/colors come from config or props.
- **Adapter pattern strictly maintained.** `api/index.ts` is the only file that decides the data source.
- **Types first.** Any new data shape goes in `types/index.ts` before writing any component.
- **Barrel imports.** Import from `../components`, `../hooks`, `../types` — never from individual files across module boundaries.

---

## 10. News vs Stories — avoiding duplication

These two sections look similar but serve different purposes. Keep them distinct:

| | Market News | Financial Stories |
|---|---|---|
| **Answers** | "What happened?" | "What does it mean for me?" |
| **Lifespan** | Timestamped, expires | Evergreen, educational |
| **Source** | RSS / scraped headlines | AI-generated explainers |
| **Format** | Single plain-English line | Everyday + Finance dual mode |
| **Example** | "BoM holds repo rate at 4.00%" | "Thinking of a home loan? Here's what a good rate looks like" |

**Rule:** a story must NOT restate a news headline. News reports the event; stories teach
the underlying concept. If the repo decision is in the news feed, the story covers
*how to read mortgage pricing* — not the decision itself.

---

## 11. GenAI architecture

Three AI touchpoints, all using `claude-haiku-4-5` for speed and cost:

### 11.1 Streaming summary (`RatesSummaryBar`)
- Hook: `useAiMarketSummary` → `POST /api/market-summary`
- One sentence (max 25 words), grounded in the live snapshot
- Client-cached 30 min; regenerates only when data changes
- Graceful fallback to static text if AI unavailable
- Cost: ~$0.0005/call

### 11.2 Inline Q&A (`AiMarketChat`)
- Hook: `useAiMarketChat` → `POST /api/market-ask`
- Streaming token-by-token, 6-turn history retained
- Snapshot enriched with best deposit/lending/FX rates for accurate answers
- 6 suggested starter questions
- Cost: ~$0.002/exchange

### 11.3 Ticker "Explain with AI" (`StoryCallout`)
- Direct `streamClaude` call → `POST /api/market-ask`
- Deeper 3-sentence explanation of the selected ticker's current value
- Static config line = instant teaser; AI = on-demand depth

### Endpoints
| Route | Runtime | Model | Streams |
|---|---|---|---|
| `/api/market-summary` | nodejs | claude-haiku-4-5 | SSE |
| `/api/market-ask` | nodejs | claude-haiku-4-5 | SSE |

Both require `ANTHROPIC_API_KEY` (server-held, never in browser bundle).

**Total AI cost at scale: under $2/month** for typical usage.

---

## 9. Content pipeline v7 (July 2026)

**News is now real.** `market-refresh` v7 ingests actual headlines each run:

1. Two Google News RSS feeds (Mauritius finance → `scope='local'`; global
   central-bank/markets → `scope='global'`), parsed dependency-free.
2. Dedupe by `content_hash` (SHA-256 of the canonical link).
3. One grounded Haiku call rewrites fetched titles into the Ficium format —
   `headline`, `plain_english`, and a new 2–3 sentence `body`. The prompt
   forbids inventing facts beyond the title + live snapshot.
4. Rows carry real `published_at`, `source_name`, `source_url`.
5. Retention: 7 days / max 40 rows. **On any failure, existing rows are left
   untouched — the v6 timestamp-bumping fallback was removed** (freshness is
   never faked).

**Stories regenerate daily.** The same run upserts 6 dual-mode stories into
`market_stories` (keyed `YYYYMMDD_slug`), built from the live snapshot,
change-vs-previous deltas, and the top real headlines. Each mode now has a
long-form `detail_*` body; cards display `generated_at`. Retention: 12 rows.

**Personalisation.** `public.market_preferences` (owner-only RLS) stores each
user's topics, currencies, coverage scopes, and default story mode.

- `hooks/useMarketPreferences.ts` — load/save; signed-out users get in-memory defaults.
- `lib/ranking.ts` — pure scoring (category +3, currency +2, scope +1, 48h
  recency decay). Only preference-driven matches earn the "For you" badge.
  Unit-tested in `lib/ranking.test.ts`.
- `MarketNewsFeed` — scope chips (All / Mauritius / World), For-you badges,
  expandable detail with publisher attribution, "Personalise" entry point.
- `PreferenceSheet` — chip picker for coverage, topics, currencies.

Migration: `supabase/migrations/20260705_markets_content_v7.sql`.
