# Ficium — Module Pattern (reference: `markets/`)

_The `individual/markets/` feature is the canonical example of how every feature
module in Ficium should be structured. New features should follow this layout;
existing oversized pages (Architecture Review F4) should be refactored toward it._

---

## 1. Why this pattern

Each layer has exactly one job, so any change touches exactly one file:

| To change… | Edit only… |
|------------|------------|
| What data looks like | `types/` |
| Which tickers show, their icons/colours/copy | `config/` |
| Where data comes from (mock → live API) | `api/` |
| How data is fetched, cached, refreshed | `hooks/` |
| How something looks on screen | `components/` |
| How the page is assembled | `pages/` |

The page itself is a **thin orchestrator** — it fetches via hooks and composes
components. It contains no data fetching, no formatting logic, and no hardcoded
values.

---

## 2. Folder layout

```
individual/markets/
├── types/index.ts          Pure TypeScript contracts. The single source of
│                           truth for every data shape (TickerId, Ticker,
│                           NewsItem, MarketDataResult, NewsResult).
│
├── config/tickers.ts       Definitions only, zero data: which tickers exist,
│                           their icons, brand colours, display order, and the
│                           plain-English "what this means" copy. Add a ticker
│                           here and the whole UI picks it up automatically.
│
├── api/
│   ├── mock.ts             Mock adapter. Returns the exact shape a live API
│   │                       would, with simulated latency.
│   └── index.ts            The ONLY place that chooses the data source. Swap
│                           one import to go live — nothing else changes.
│
├── hooks/
│   ├── useMarketData.ts    Fetches + assembles Ticker objects (config +
│   │                       reading), handles loading/error/refresh, auto-
│   │                       refreshes every 5 min. Pages never call fetch.
│   ├── useMarketNews.ts    News fetch, isolated so it can refresh on its own
│   │                       cadence.
│   └── index.ts            Barrel export.
│
├── components/             Eight single-responsibility components, each pure
│   │                       presentational or owning only its own local UI
│   │                       state:
│   ├── Sparkline.tsx         tiny SVG trend line (no state)
│   ├── ChangeBadge.tsx       ↑/↓ % change badge (no state)
│   ├── TickerCard.tsx        one market tile, owns its skeleton state
│   ├── TickerStrip.tsx       horizontal scroll row, lifts selection up
│   ├── StoryCallout.tsx      "what this means" panel (no state)
│   ├── NewsCard.tsx          expandable story, owns expand state
│   ├── MarketHeader.tsx      title + refresh button (no state)
│   ├── FiciumCTA.tsx         conversion banner (no state)
│   └── index.ts            Barrel export.
│
└── pages/Markets.tsx       ~50-line orchestrator. Fetch via hooks, compose
                            components. No logic.
```

---

## 3. Data flow

```
config/tickers.ts ─┐
                   ├─► useMarketData() ─► Ticker[] ─► <TickerStrip> ─► <TickerCard> ─► <Sparkline>
api/index.ts ──────┘                                       │
   (mock | live)                                           └─► selection ─► <StoryCallout>

api/index.ts ─► useMarketNews() ─► NewsItem[] ─► <NewsCard>
```

---

## 4. How to extend it (worked examples)

**Add a new market ticker (e.g. CNY/MUR):**
1. Add `"cny_mur"` to the `TickerId` union in `types/index.ts`.
2. Add its config entry (icon, colour, story) to `config/tickers.ts` and to
   `TICKER_ORDER`.
3. Add a reading to the mock in `api/mock.ts` (or it arrives automatically once
   the live API returns it).
   The UI updates with no component changes.

**Go live with real data:**
1. Create `api/live.ts` (e.g. hitting the Bank of Mauritius site or an FX API)
   that returns the same `MarketDataResult` / `NewsResult` shapes.
2. Change the single export line in `api/index.ts`.
   No hook or component changes.

**A/B test the call-to-action:**
- Edit or duplicate `components/FiciumCTA.tsx`. Nothing else is affected.

---

## 5. Import convention

Use the `@/` alias for cross-boundary imports (configured in `tsconfig.app.json`
and `vite.config.ts`):

```ts
import { BottomNav }     from "@/shared/ui";
import { useMarketData } from "@/individual/markets/hooks";
```

Relative imports (`./Sparkline`) are only for siblings within the same folder.
