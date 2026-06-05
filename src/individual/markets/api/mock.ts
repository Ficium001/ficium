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
    id: "s1", emoji: "🏦", category: "Interest Rates", relatedCTA: true,
    everyday: { headline: "Your loan costs the same this month",       plain: "The Bank of Mauritius kept its key rate at 4%. Your monthly repayments won't change. If you're thinking of taking a new loan, now is a stable time — banks on Ficium are competing." },
    finance:  { headline: "BoM MPC holds repo at 400bps for Q3 FY2025", plain: "Unanimous hold. 12-month inflation expectations anchored at 3.1%. Real rate +90bps. Neutral policy stance maintained. Next MPC review: September 2025." },
  },
  {
    id: "s2", emoji: "💱", category: "Currency", relatedCTA: false,
    everyday: { headline: "Your imports cost slightly more today",     plain: "The rupee weakened a little against the dollar. Electronics, fuel, anything priced in USD may cost a bit more. If you hold USD savings, they're worth more rupees right now." },
    finance:  { headline: "MUR/USD spot -0.28% · REER index softening", plain: "USD/MUR at 46.32, testing 5-week high. BoM FX reserves at 10.2 months import cover. REER depreciation 1.2% YTD. Oil import bill pressure persists." },
  },
  {
    id: "s3", emoji: "📈", category: "Stock Market", relatedCTA: false,
    everyday: { headline: "Local companies had a good day — your pension likely benefited", plain: "The SEMDEX rose 0.72%. If you have a pension, unit trust, or local stock investment, your balance probably went up. MCB Group and Rogers led the gains." },
    finance:  { headline: "SEMDEX +0.72% · MCB Group +1.8% · Rogers +2.1%",               plain: "Volume: 42M shares (+18% vs 30d avg). Banking sector PE 11.2x trailing. Net foreign inflows Rs 120M. DCDM upgrades MCB to Accumulate." },
  },
  {
    id: "s4", emoji: "🏧", category: "Savings", relatedCTA: true,
    everyday: { headline: "Banks are fighting for your savings right now",  plain: "Competition pushed deposit rates up slightly. Instead of calling each bank, post a deposit request on Ficium — banks come to you with their best offer." },
    finance:  { headline: "Avg 1Y deposit rate +10bps MoM to 3.40%",       plain: "Rate dispersion across 8 banks: 285–350bps. MCB leads on 3Y term (350bps). Real deposit rate +30bps vs CPI. T-bill 91d yield 4.80% — above retail deposit rates." },
  },
  {
    id: "s5", emoji: "🏠", category: "Lending", relatedCTA: true,
    everyday: { headline: "Home loan rates at their lowest in 2 years",     plain: "Banks are offering home loans below 5% — historically low. If you've been waiting to buy, this could be a good window. Post a request on Ficium to see what you qualify for." },
    finance:  { headline: "Mortgage market: avg rate 4.95% · -35bps YoY",  plain: "Variable vs fixed spread compressed to 40bps. LTV limits unchanged at 90% for first-home buyers. FSC macro-prudential buffer held at 1%." },
  },
  {
    id: "s6", emoji: "⛽", category: "Economy", relatedCTA: false,
    everyday: { headline: "Petrol price may rise next month — here's why",  plain: "Global oil prices rose 4% this week. Mauritius sets petrol prices monthly based on world prices — if oil stays high, your next tank could cost more." },
    finance:  { headline: "Brent crude +4.1% WoW · STC hedging position unconfirmed", plain: "Brent at $87.40/bbl. MUR/USD sensitivity: every 1% oil move = ~Rs 0.15/L pump price impact. STC procurement cycle ends 15th of each month." },
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
