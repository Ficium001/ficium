import type { MarketDataResult, NewsResult } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Mock adapter — mimics the shape a live BOM / ExchangeRate / bank-scrape would return.
// To go live: replace this file's exports with a real adapter — hooks/UI unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_READINGS: MarketDataResult["readings"] = {
  repo_rate:        { value: 4.0,    displayValue: "4.00%",   change: 0,     direction: "flat", history: [4.0,4.0,4.0,4.0,4.0,4.0,4.0],          fetchedAt: new Date() },
  usd_mur:          { value: 46.32,  displayValue: "46.32",   change: -0.28, direction: "down", history: [46.0,46.1,46.3,46.5,46.4,46.35,46.32],  fetchedAt: new Date() },
  eur_mur:          { value: 52.18,  displayValue: "52.18",   change: 0.34,  direction: "up",   history: [51.6,51.7,51.9,52.0,52.1,52.05,52.18],  fetchedAt: new Date() },
  gbp_mur:          { value: 61.40,  displayValue: "61.40",   change: 0.21,  direction: "up",   history: [61.0,61.1,61.1,61.2,61.3,61.35,61.40],  fetchedAt: new Date() },
  semdex:           { value: 2362.45,displayValue: "2,362",   change: 0.72,  direction: "up",   history: [2280,2295,2310,2300,2330,2345,2362],     fetchedAt: new Date() },
  avg_deposit_rate: { value: 3.4,    displayValue: "3.40%",   change: 0.1,   direction: "up",   history: [3.2,3.25,3.3,3.3,3.35,3.38,3.40],       fetchedAt: new Date() },
  avg_lending_rate: { value: 8.25,   displayValue: "8.25%",   change: -0.2,  direction: "down", history: [8.5,8.45,8.4,8.35,8.3,8.28,8.25],       fetchedAt: new Date() },
  inflation_yoy:    { value: 3.1,    displayValue: "3.1%",    change: -0.2,  direction: "down", history: [3.6,3.5,3.4,3.3,3.25,3.2,3.1],          fetchedAt: new Date() },
};

const MOCK_FX_RATES: MarketDataResult["fxRates"] = [
  { currency: "USD / MUR", currencyCode: "USD", bestBank: "MCB",      bestRate: 46.80, worstBank: "Absa",   worstRate: 46.10, savingPer1000: "Rs 700 per $1,000",  updatedAt: new Date() },
  { currency: "EUR / MUR", currencyCode: "EUR", bestBank: "AfrAsia",  bestRate: 52.40, worstBank: "SBM",    worstRate: 51.90, savingPer1000: "Rs 500 per €1,000",  updatedAt: new Date() },
  { currency: "GBP / MUR", currencyCode: "GBP", bestBank: "Bank One", bestRate: 61.90, worstBank: "HSBC",   worstRate: 61.20, savingPer1000: "Rs 700 per £1,000",  updatedAt: new Date() },
  { currency: "ZAR / MUR", currencyCode: "ZAR", bestBank: "Absa",     bestRate: 2.55,  worstBank: "MauBank",worstRate: 2.42,  savingPer1000: "Rs 130 per R1,000",  updatedAt: new Date() },
];

const MOCK_DEPOSIT_RATES: MarketDataResult["depositRates"] = [
  { bank: "MCB",           color: "#1d4ed8", rate1y: "3.20%", rate2y: "3.35%", rate3y: "3.50%" },
  { bank: "SBM",           color: "#dc2626", rate1y: "3.10%", rate2y: "3.25%", rate3y: "3.40%" },
  { bank: "Absa",          color: "#ea580c", rate1y: "3.00%", rate2y: "3.15%", rate3y: "3.30%" },
  { bank: "SBI Mauritius", color: "#7c3aed", rate1y: "2.95%", rate2y: "3.10%", rate3y: "3.25%" },
  { bank: "AfrAsia",       color: "#0891b2", rate1y: "2.85%", rate2y: "3.00%", rate3y: "3.19%" },
];

const MOCK_LENDING_RATES: MarketDataResult["lendingRates"] = [
  { product: "Home Loan",      iconName: "home",      bestRate: "4.95%", isBest: true  },
  { product: "Vehicle Loan",   iconName: "car",       bestRate: "5.25%", isBest: false },
  { product: "Personal Loan",  iconName: "user",      bestRate: "6.90%", isBest: false },
  { product: "Business Loan",  iconName: "briefcase", bestRate: "5.75%", isBest: false },
  { product: "Education Loan", iconName: "book-open", bestRate: "5.50%", isBest: false },
];

const MOCK_NEWS: NewsResult["items"] = [
  { id: "n1", headline: "Bank of Mauritius holds repo rate at 4.00%",         category: "Interest Rates", emoji: "🏦", plainEnglish: "Your existing loan EMIs won't change for now.",                                              publishedAt: new Date(), relatedTickerId: "repo_rate"        },
  { id: "n2", headline: "MCB Group reports record Q2 FY2025 earnings",         category: "Stock Market",   emoji: "📊", plainEnglish: "MCB Group posted its best quarterly earnings. If you hold MCB shares, your investment grew.", publishedAt: new Date(), relatedTickerId: "semdex"           },
  { id: "n3", headline: "USD strengthens against MUR amid global dollar rally",category: "Currency",       emoji: "💱", plainEnglish: "Imported goods may cost a little more this week.",                                          publishedAt: new Date(), relatedTickerId: "usd_mur"          },
  { id: "n4", headline: "Mauritius Treasury issues new 10-year bond",          category: "Economy",        emoji: "📋", plainEnglish: "Government borrowing at 5.2% — higher than most savings accounts.",                        publishedAt: new Date()                                     },
  { id: "n5", headline: "Global markets trade higher after US inflation cools", category: "Economy",        emoji: "🌍", plainEnglish: "Good news globally. Pressure on the rupee may ease if US rates fall.",                      publishedAt: new Date()                                     },
];

const MOCK_STORIES: NewsResult["stories"] = [
  {
    id: "s1", emoji: "🏠", category: "Lending", relatedCTA: true,
    everyday: { headline: "Thinking of a home loan? Here's what 'a good rate' looks like", plain: "A home loan rate under 5% is considered strong in Mauritius right now. Banks rarely advertise their best rate upfront — on Ficium they bid against each other, so you see the real floor. The difference between 4.95% and 5.5% on a Rs 3M loan is about Rs 250,000 over 20 years." },
    finance:  { headline: "Mortgage pricing: how to read the spread", plain: "Mauritian mortgages price off Repo + margin. With Repo at 4%, a 4.95% offer implies a 95bps margin — tight. Watch the variable/fixed spread (currently ~40bps) and LTV banding: rates step up above 80% LTV. First-home buyers retain the 90% LTV cap." },
  },
  {
    id: "s2", emoji: "🏧", category: "Savings", relatedCTA: true,
    everyday: { headline: "Where your savings actually grow fastest", plain: "Most current accounts pay almost nothing. A 1-year fixed deposit in Mauritius pays around 3.4%, and government T-bills can pay more. The catch: fixed deposits lock your money. On Ficium you can post how much and how long, and let banks compete for it." },
    finance:  { headline: "Deposit laddering vs T-bills: the real-rate view", plain: "With CPI at 3.1%, a 3.4% 1Y deposit yields ~+30bps real. The 91-day T-bill at 4.80% beats retail deposits but requires rollover discipline. A deposit ladder (3/6/12mo tranches) balances liquidity against the rate curve without timing risk." },
  },
  {
    id: "s3", emoji: "⛽", category: "Economy", relatedCTA: false,
    everyday: { headline: "Why your petrol price changes — and how to see it coming", plain: "Mauritius resets fuel prices monthly based on world oil prices and the rupee. When global oil rises or the rupee weakens, expect a hike at the next reset. Watching both gives you a few weeks' warning before it hits your wallet." },
    finance:  { headline: "Fuel price transmission mechanism", plain: "STC procures on a monthly cycle (reset ~15th). Pump price ≈ landed cost × MUR/USD + excise + margin. Sensitivity: every 1% move in oil ≈ Rs 0.15/L; every 1% MUR depreciation compounds it. Brent + REER together predict the print." },
  },
  {
    id: "s4", emoji: "📊", category: "Stock Market", relatedCTA: false,
    everyday: { headline: "Do you already own shares without knowing it?", plain: "If you have a pension fund or unit trust in Mauritius, you probably own a slice of the big listed companies — MCB Group, SBM, Rogers, IBL. When the SEMDEX rises, your retirement savings quietly grow, even if you've never bought a share yourself." },
    finance:  { headline: "SEMDEX concentration and your indirect exposure", plain: "The SEMDEX is heavily weighted toward financials and conglomerates. Most local pension/unit-trust mandates track it closely, so household equity exposure is higher than self-reported. Banking-sector PE at 11.2x trailing remains below regional EM peers." },
  },
  {
    id: "s5", emoji: "💱", category: "Currency", relatedCTA: false,
    everyday: { headline: "Sending or receiving money abroad? Timing matters", plain: "Exchange rates move daily, and banks charge different rates on the same day. If you're paying overseas tuition or receiving a remittance, even a small rate difference adds up. Check the 'best rate today' card above before you convert." },
    finance:  { headline: "Spread arbitrage across local banks", plain: "Inter-bank FX spreads in Mauritius can exceed 100bps on the same currency on the same day. For sizeable transfers, comparing the buy/sell board across banks captures more than most fee waivers. The REER trend signals the medium-term direction." },
  },
  {
    id: "s6", emoji: "📈", category: "Economy", relatedCTA: true,
    everyday: { headline: "Inflation is cooling — what that means for you", plain: "Prices are still rising, but more slowly than last year. That's good: your money loses value less quickly. It also means banks may eventually lower rates, so locking a savings rate now — while they're still decent — can work in your favour." },
    finance:  { headline: "Disinflation trajectory and rate-cut odds", plain: "Headline CPI easing to 3.1% YoY widens the real-rate buffer and raises the probability of a dovish tilt at the next MPC. Implication: term deposits locked now capture the current curve before any cut; borrowers may prefer variable if cuts materialise." },
  },
];

export async function fetchMarketData(): Promise<MarketDataResult> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    readings:     MOCK_READINGS,
    fxRates:      MOCK_FX_RATES,
    depositRates: MOCK_DEPOSIT_RATES,
    lendingRates: MOCK_LENDING_RATES,
    fetchedAt: new Date(),
    source: "mock",
  };
}

export async function fetchMarketNews(): Promise<NewsResult> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    items:     MOCK_NEWS,
    stories:   MOCK_STORIES,
    fetchedAt: new Date(),
    source: "mock",
  };
}
