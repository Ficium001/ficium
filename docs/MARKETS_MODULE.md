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
│   ├── useMarketData.ts  — Tickers, FX rates, deposit rates, lending rates
│   ├── useMarketNews.ts  — News items + dual-mode stories
│   └── index.ts          — Barrel
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
| Tickers | `TickerStrip` → `TickerCard` | 8 tickers, horizontal scroll |
| Callout | `StoryCallout` | Appears when ticker selected; plain-English story |
| Rates | `RatesPanel` | Deposit (5 banks × 3 terms) + lending (5 products) |
| Summary | `RatesSummaryBar` | AI one-liner with "Read full summary" CTA |
| FX | `FxBestRates` | Best buy rate today, all 4 major currencies |
| News | `MarketNewsFeed` | Expandable news items, full width |
| Stories | `StoryModeToggle` + `StoriesGrid` | 6 stories, everyday / finance toggle |
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
