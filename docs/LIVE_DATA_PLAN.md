# Ficium Markets — Live Data Plan

_How the Markets module transitions from mock data to real Mauritius financial data._

---

## 1. Data sources

| Source | Data | Frequency | Method | Cost |
|---|---|---|---|---|
| Bank of Mauritius (bom.mu) | Repo rate, key rates, policy statements | On announcement (~monthly) | Scrape PDF / HTML | Free |
| MCB, SBM, Absa, AfrAsia, Bank One, HSBC MU, SBI MU, MauBank | FX buy/sell rates (USD, EUR, GBP, ZAR, AUD, CNY) | Daily (banks publish by 9 AM) | Scrape each bank's rates page | Free |
| Stock Exchange of Mauritius (stockexchangeofmauritius.com) | SEMDEX daily close, top gainers/losers, volume | Daily at market close | Scrape SEM daily bulletin PDF | Free |
| Statistics Mauritius (statsmauritius.govmu.org) | CPI, inflation YoY | Monthly | CSV download | Free |
| exchangerate.host | USD/EUR/GBP/ZAR vs MUR (validation) | Daily | REST API | Free tier (100/day) |
| L'Express / Le Défi / Defimedia | Local financial headlines | Daily | RSS or scrape | Free |
| Bank of Mauritius RSS / press releases | Rate decisions, stability reports | On release | RSS | Free |
| Claude Haiku (Anthropic API) | Plain-English story rewriting | Per data change | API | ~$0.60/month |

**Total ongoing cost: ~$0.60/month** (AI generation only; everything else is free scraping)

---

## 2. Edge Function architecture

```
supabase/functions/market-refresh/index.ts
```

### Trigger
- Supabase cron: every 30 minutes (`0,30 * * * *`)
- Can also be triggered manually via `supabase functions invoke market-refresh`

### Steps
```
1. Fetch all sources in parallel (Promise.all)
2. Compare new values against last-stored values
3. For each value that changed meaningfully (threshold: 0.05%):
   a. Upsert new reading to market_data
   b. Call Claude Haiku to generate everyday + finance story
   c. Upsert story to market_stories
4. Always upsert FX rates (they change daily)
5. Log execution to audit_log
```

### Change thresholds (don't regenerate stories for noise)
| Ticker | Threshold |
|---|---|
| repo_rate | Any change (it moves rarely) |
| usd_mur, eur_mur, gbp_mur | > 0.2% |
| semdex | > 0.5% |
| avg_deposit_rate, avg_lending_rate | > 0.1% |
| inflation_yoy | Any change |

---

## 3. Supabase adapter (to be built)

`src/individual/markets/api/supabase.ts`

```typescript
import { db } from "@/shared/lib/supabase";
import type { MarketDataResult, NewsResult } from "../types";

export async function fetchMarketData(): Promise<MarketDataResult> {
  const [tickerRows, fxRows, depositRows, lendingRows] = await Promise.all([
    db("public").from("market_data").select("*"),
    db("public").from("market_fx_rates").select("*"),
    db("public").from("market_deposit_rates").select("*"),
    db("public").from("market_lending_rates").select("*"),
  ]);
  // ... shape into MarketDataResult
}

export async function fetchMarketNews(): Promise<NewsResult> {
  const [newsRows, storyRows] = await Promise.all([
    db("public").from("market_news").select("*").order("published_at", { ascending: false }).limit(8),
    db("public").from("market_stories").select("*").order("generated_at", { ascending: false }).limit(6),
  ]);
  // ... shape into NewsResult
}
```

To activate: change one line in `api/index.ts`:
```typescript
export { fetchMarketData, fetchMarketNews } from "./supabase";
```

---

## 4. Bank FX scraping notes

Each Mauritius bank publishes their daily FX rates publicly. Scraping approach:

| Bank | URL pattern | Notes |
|---|---|---|
| MCB | mcb.mu/rates | Table with buy/sell per currency |
| SBM | sbmgroup.com | Dynamic — may need puppeteer |
| AfrAsia | afrasiabank.com | Static table |
| Absa MU | absa.mu | Static table |
| Bank One | bankone.mu | Static table |
| HSBC MU | hsbc.com/mu | May require headers |
| SBI MU | sbimauritius.com | Static |
| MauBank | maubank.mu | Static |

Use `cheerio` (static) or `puppeteer` (dynamic) inside the Edge Function.
Cache results for 30 minutes — banks only update once a day.

---

## 5. Rollout phases

| Phase | What | Timeline |
|---|---|---|
| Phase 0 (now) | Mock data, full UI built | Done |
| Phase 1 | Exchange rate API (USD/EUR/GBP/ZAR vs MUR) | 1–2 days |
| Phase 2 | Bank FX scraping (all 8 banks) | 3–5 days |
| Phase 3 | SEM SEMDEX daily close | 1–2 days |
| Phase 4 | Claude Haiku story generation | 1 day |
| Phase 5 | BOM repo rate + deposit/lending rates | 2–3 days |
| Phase 6 | News headlines (RSS + scrape) | 2 days |

Each phase is independently deployable — just swap/extend the adapter.
