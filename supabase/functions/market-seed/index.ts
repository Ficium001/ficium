/**
 * supabase/functions/market-seed/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot seed function — populates all six market_* tables with
 * realistic initial data so the Markets page works immediately after
 * running the SQL migration, before the scraper Edge Function is built.
 *
 * Deploy:  supabase functions deploy market-seed
 * Invoke:  supabase functions invoke market-seed
 *          or: POST https://<project>.supabase.co/functions/v1/market-seed
 *              Authorization: Bearer <service_role_key>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const now = new Date().toISOString();

// ── 1. market_data ──────────────────────────────────────────────────────────
const marketData = [
  { ticker_id: "repo_rate",        value: 4.00,    display_value: "4.00%",  change_pct:  0.00, direction: "flat", history: [4.0,4.0,4.0,4.0,4.0,4.0,4.0],          source: "bom",    fetched_at: now },
  { ticker_id: "usd_mur",          value: 46.32,   display_value: "46.32",  change_pct: -0.28, direction: "down", history: [46.0,46.1,46.3,46.5,46.4,46.35,46.32],  source: "banks",  fetched_at: now },
  { ticker_id: "eur_mur",          value: 52.18,   display_value: "52.18",  change_pct:  0.34, direction: "up",   history: [51.6,51.7,51.9,52.0,52.1,52.05,52.18],  source: "banks",  fetched_at: now },
  { ticker_id: "gbp_mur",          value: 61.40,   display_value: "61.40",  change_pct:  0.21, direction: "up",   history: [61.0,61.1,61.1,61.2,61.3,61.35,61.40],  source: "banks",  fetched_at: now },
  { ticker_id: "semdex",           value: 2362.45, display_value: "2,362",  change_pct:  0.72, direction: "up",   history: [2280,2295,2310,2300,2330,2345,2362],     source: "sem",    fetched_at: now },
  { ticker_id: "avg_deposit_rate", value: 3.40,    display_value: "3.40%",  change_pct:  0.10, direction: "up",   history: [3.2,3.25,3.3,3.3,3.35,3.38,3.40],       source: "banks",  fetched_at: now },
  { ticker_id: "avg_lending_rate", value: 8.25,    display_value: "8.25%",  change_pct: -0.20, direction: "down", history: [8.5,8.45,8.4,8.35,8.3,8.28,8.25],       source: "banks",  fetched_at: now },
  { ticker_id: "inflation_yoy",    value: 3.10,    display_value: "3.1%",   change_pct: -0.20, direction: "down", history: [3.6,3.5,3.4,3.3,3.25,3.2,3.1],          source: "stats",  fetched_at: now },
];

// ── 2. market_fx_rates ───────────────────────────────────────────────────────
const fxRates = [
  // USD
  { currency_code: "USD", currency_pair: "USD / MUR", bank_name: "MCB",      buy_rate: 46.80, sell_rate: 47.10, fetched_at: now },
  { currency_code: "USD", currency_pair: "USD / MUR", bank_name: "SBM",      buy_rate: 46.50, sell_rate: 46.85, fetched_at: now },
  { currency_code: "USD", currency_pair: "USD / MUR", bank_name: "Absa",     buy_rate: 46.10, sell_rate: 46.60, fetched_at: now },
  { currency_code: "USD", currency_pair: "USD / MUR", bank_name: "AfrAsia",  buy_rate: 46.75, sell_rate: 47.00, fetched_at: now },
  { currency_code: "USD", currency_pair: "USD / MUR", bank_name: "Bank One", buy_rate: 46.60, sell_rate: 46.95, fetched_at: now },
  // EUR
  { currency_code: "EUR", currency_pair: "EUR / MUR", bank_name: "MCB",      buy_rate: 52.20, sell_rate: 52.60, fetched_at: now },
  { currency_code: "EUR", currency_pair: "EUR / MUR", bank_name: "SBM",      buy_rate: 51.90, sell_rate: 52.30, fetched_at: now },
  { currency_code: "EUR", currency_pair: "EUR / MUR", bank_name: "AfrAsia",  buy_rate: 52.40, sell_rate: 52.70, fetched_at: now },
  { currency_code: "EUR", currency_pair: "EUR / MUR", bank_name: "Absa",     buy_rate: 52.00, sell_rate: 52.45, fetched_at: now },
  { currency_code: "EUR", currency_pair: "EUR / MUR", bank_name: "Bank One", buy_rate: 52.10, sell_rate: 52.50, fetched_at: now },
  // GBP
  { currency_code: "GBP", currency_pair: "GBP / MUR", bank_name: "MCB",      buy_rate: 61.60, sell_rate: 62.10, fetched_at: now },
  { currency_code: "GBP", currency_pair: "GBP / MUR", bank_name: "SBM",      buy_rate: 61.30, sell_rate: 61.80, fetched_at: now },
  { currency_code: "GBP", currency_pair: "GBP / MUR", bank_name: "Bank One", buy_rate: 61.90, sell_rate: 62.20, fetched_at: now },
  { currency_code: "GBP", currency_pair: "GBP / MUR", bank_name: "HSBC",     buy_rate: 61.20, sell_rate: 61.70, fetched_at: now },
  { currency_code: "GBP", currency_pair: "GBP / MUR", bank_name: "AfrAsia",  buy_rate: 61.75, sell_rate: 62.05, fetched_at: now },
  // ZAR
  { currency_code: "ZAR", currency_pair: "ZAR / MUR", bank_name: "Absa",     buy_rate: 2.55,  sell_rate: 2.65,  fetched_at: now },
  { currency_code: "ZAR", currency_pair: "ZAR / MUR", bank_name: "MCB",      buy_rate: 2.50,  sell_rate: 2.62,  fetched_at: now },
  { currency_code: "ZAR", currency_pair: "ZAR / MUR", bank_name: "MauBank",  buy_rate: 2.42,  sell_rate: 2.58,  fetched_at: now },
];

// ── 3. market_deposit_rates ──────────────────────────────────────────────────
const depositRates = [
  { bank_name: "MCB",            bank_color: "#1d4ed8", rate_1y: "3.20%", rate_2y: "3.35%", rate_3y: "3.50%", fetched_at: now },
  { bank_name: "SBM",            bank_color: "#dc2626", rate_1y: "3.10%", rate_2y: "3.25%", rate_3y: "3.40%", fetched_at: now },
  { bank_name: "Absa",           bank_color: "#ea580c", rate_1y: "3.00%", rate_2y: "3.15%", rate_3y: "3.30%", fetched_at: now },
  { bank_name: "SBI Mauritius",  bank_color: "#7c3aed", rate_1y: "2.95%", rate_2y: "3.10%", rate_3y: "3.25%", fetched_at: now },
  { bank_name: "AfrAsia",        bank_color: "#0891b2", rate_1y: "2.85%", rate_2y: "3.00%", rate_3y: "3.19%", fetched_at: now },
];

// ── 4. market_lending_rates ──────────────────────────────────────────────────
const lendingRates = [
  { product: "Home Loan",      icon_name: "home",      best_rate: "4.95%", is_best: true,  fetched_at: now },
  { product: "Vehicle Loan",   icon_name: "car",       best_rate: "5.25%", is_best: false, fetched_at: now },
  { product: "Personal Loan",  icon_name: "user",      best_rate: "6.90%", is_best: false, fetched_at: now },
  { product: "Business Loan",  icon_name: "briefcase", best_rate: "5.75%", is_best: false, fetched_at: now },
  { product: "Education Loan", icon_name: "book-open", best_rate: "5.50%", is_best: false, fetched_at: now },
];

// ── 5. market_news ───────────────────────────────────────────────────────────
const newsItems = [
  { headline: "Bank of Mauritius holds repo rate at 4.00%",          category: "Interest Rates", emoji: "🏦", plain_english: "Your existing loan EMIs won't change for now. Banks' borrowing costs stay the same.",                                              published_at: now, related_ticker_id: "repo_rate",        source: "bom"    },
  { headline: "MCB Group reports record Q2 FY2025 earnings",          category: "Stock Market",   emoji: "📊", plain_english: "MCB Group posted its best quarterly earnings on record. If you hold MCB shares or a local unit trust, your balance likely grew.", published_at: now, related_ticker_id: "semdex",           source: "sem"    },
  { headline: "USD strengthens against MUR amid global dollar rally", category: "Currency",       emoji: "💱", plain_english: "The rupee weakened slightly. Imported goods may cost a little more this week.",                                                  published_at: now, related_ticker_id: "usd_mur",          source: "bom"    },
  { headline: "Mauritius Treasury issues new 10-year bond",           category: "Economy",        emoji: "📋", plain_english: "Government is borrowing at 5.2% — higher than most savings accounts. An alternative worth knowing about.",                       published_at: now,                                        source: "bom"    },
  { headline: "Global markets trade higher after US inflation cools", category: "Economy",        emoji: "🌍", plain_english: "Good news globally. Pressure on the rupee may ease if US interest rates start falling.",                                          published_at: now,                                        source: "rss"    },
  { headline: "SEMDEX rises 0.72% — banking sector leads gains",      category: "Stock Market",   emoji: "📈", plain_english: "Local stocks had a good day. If you have a pension or unit trust, your balance probably went up today.",                         published_at: now, related_ticker_id: "semdex",           source: "sem"    },
];

// ── 6. market_stories ────────────────────────────────────────────────────────
const stories = [
  {
    story_key: "home_loan_rates_2025",
    category: "Lending", emoji: "🏠", related_cta: true,
    headline_everyday: "Thinking of a home loan? Here's what 'a good rate' looks like",
    plain_everyday:    "A home loan rate under 5% is considered strong in Mauritius right now. Banks rarely advertise their best rate upfront — on Ficium they bid against each other, so you see the real floor. The difference between 4.95% and 5.5% on a Rs 3M loan is about Rs 250,000 over 20 years.",
    headline_finance:  "Mortgage pricing: how to read the spread",
    plain_finance:     "Mauritian mortgages price off Repo + margin. With Repo at 4%, a 4.95% offer implies a 95bps margin — tight. Watch the variable/fixed spread (currently ~40bps) and LTV banding: rates step up above 80% LTV. First-home buyers retain the 90% LTV cap.",
    generated_at: now,
  },
  {
    story_key: "savings_rates_2025",
    category: "Savings", emoji: "🏧", related_cta: true,
    headline_everyday: "Where your savings actually grow fastest",
    plain_everyday:    "Most current accounts pay almost nothing. A 1-year fixed deposit in Mauritius pays around 3.4%, and government T-bills can pay more. On Ficium you can post how much you want to save and for how long — let banks compete for your deposit.",
    headline_finance:  "Deposit laddering vs T-bills: the real-rate view",
    plain_finance:     "With CPI at 3.1%, a 3.4% 1Y deposit yields ~+30bps real. The 91-day T-bill at 4.80% beats retail deposits but requires rollover discipline. A deposit ladder (3/6/12mo tranches) balances liquidity against the rate curve without timing risk.",
    generated_at: now,
  },
  {
    story_key: "fuel_prices_2025",
    category: "Economy", emoji: "⛽", related_cta: false,
    headline_everyday: "Why your petrol price changes — and how to see it coming",
    plain_everyday:    "Mauritius resets fuel prices monthly based on world oil prices and the rupee. When global oil rises or the rupee weakens, expect a hike at the next reset. Watching both gives you a few weeks' warning before it hits your wallet.",
    headline_finance:  "Fuel price transmission mechanism",
    plain_finance:     "STC procures on a monthly cycle (reset ~15th). Pump price ≈ landed cost × MUR/USD + excise + margin. Sensitivity: every 1% move in oil ≈ Rs 0.15/L; every 1% MUR depreciation compounds it. Brent + REER together predict the print.",
    generated_at: now,
  },
  {
    story_key: "semdex_pensions_2025",
    category: "Stock Market", emoji: "📊", related_cta: false,
    headline_everyday: "Do you already own shares without knowing it?",
    plain_everyday:    "If you have a pension fund or unit trust in Mauritius, you probably own a slice of the big listed companies — MCB Group, SBM, Rogers, IBL. When the SEMDEX rises, your retirement savings quietly grow, even if you've never bought a share yourself.",
    headline_finance:  "SEMDEX concentration and your indirect equity exposure",
    plain_finance:     "The SEMDEX is heavily weighted toward financials and conglomerates. Most local pension/unit-trust mandates track it closely. Banking-sector PE at 11.2x trailing remains below regional EM peers. Net foreign inflows Rs 120M this week.",
    generated_at: now,
  },
  {
    story_key: "fx_timing_2025",
    category: "Currency", emoji: "💱", related_cta: false,
    headline_everyday: "Sending or receiving money abroad? Timing matters",
    plain_everyday:    "Exchange rates move daily, and banks charge different rates on the same day. If you're paying overseas tuition or receiving a remittance, even a small rate difference adds up. Check the 'best rate today' section above before you convert.",
    headline_finance:  "Spread arbitrage across local banks",
    plain_finance:     "Inter-bank FX spreads in Mauritius can exceed 100bps on the same currency on the same day. For sizeable transfers, comparing the buy/sell board across banks captures more than most fee waivers. The REER trend signals the medium-term direction.",
    generated_at: now,
  },
  {
    story_key: "inflation_outlook_2025",
    category: "Economy", emoji: "📈", related_cta: true,
    headline_everyday: "Inflation is cooling — what that means for you",
    plain_everyday:    "Prices are still rising, but more slowly than last year. That's good: your money loses value less quickly. It also means banks may eventually lower rates, so locking a savings rate now — while they're still decent — can work in your favour.",
    headline_finance:  "Disinflation trajectory and rate-cut odds",
    plain_finance:     "Headline CPI easing to 3.1% YoY widens the real-rate buffer and raises the probability of a dovish tilt at the next MPC. Implication: term deposits locked now capture the current curve before any cut; borrowers may prefer variable if cuts materialise.",
    generated_at: now,
  },
];

// ── Seed ────────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const results: Record<string, unknown> = {};

  const upsert = async (table: string, data: unknown[], conflict: string) => {
    const { error, count } = await supabase
      .from(table)
      .upsert(data as Record<string, unknown>[], { onConflict: conflict, count: "exact" });
    results[table] = error ? { error: error.message } : { upserted: count };
  };

  await Promise.all([
    upsert("market_data",          marketData,   "ticker_id"),
    upsert("market_fx_rates",      fxRates,      "currency_code,bank_name"),
    upsert("market_deposit_rates", depositRates, "bank_name"),
    upsert("market_lending_rates", lendingRates, "product"),
    upsert("market_news",          newsItems,    "id"),
    upsert("market_stories",       stories,      "story_key"),
  ]);

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
