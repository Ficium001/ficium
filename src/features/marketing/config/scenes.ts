export type Offer = { bank: string; product: string; rate: string; badge: string; color: string };
export type Scene = { label: string; product: string; amount: string; term: string; bidsLabel: string; offers: Offer[] };

// Illustrative only: invented providers and rates for the splash animation.
// Never use real institution names here — it reads as a live offer from them.
export const SCENES: Scene[] = [
  {
    label: "Personal Loan", product: "Personal Loan", amount: "MUR 500,000",
    term: "36 months · Mauritius", bidsLabel: "3 banks bidding",
    offers: [
      { bank: "Bank A",     product: "Personal Loan · MUR 500K", rate: "8.2%", badge: "Best rate",        color: "#FFD84D" },
      { bank: "Bank B",     product: "Personal Loan · MUR 500K", rate: "9.1%", badge: "Fastest decision", color: "#7DF9C5" },
      { bank: "Bank C", product: "Personal Loan · MUR 500K", rate: "9.4%", badge: "No fees",          color: "#FF9F7A" },
    ],
  },
  {
    label: "Business Funding", product: "SME Working Capital", amount: "MUR 2,500,000",
    term: "60 months · Port Louis SME", bidsLabel: "3 banks bidding",
    offers: [
      { bank: "Bank A", product: "SME Loan · MUR 2.5M", rate: "7.9%", badge: "Best rate",     color: "#FFD84D" },
      { bank: "Bank B",     product: "SME Loan · MUR 2.5M", rate: "8.3%", badge: "Relationship",  color: "#7DF9C5" },
      { bank: "Bank C",      product: "SME Loan · MUR 2.5M", rate: "8.7%", badge: "Fast approval", color: "#FF9F7A" },
    ],
  },
  {
    label: "Fixed Deposit", product: "Fixed Deposit", amount: "MUR 1,000,000",
    term: "24 months · p.a.", bidsLabel: "3 banks bidding",
    offers: [
      { bank: "Bank A", product: "FD · MUR 1M · 24mo", rate: "5.4%", badge: "Best yield", color: "#FFD84D" },
      { bank: "Bank B",    product: "FD · MUR 1M · 24mo", rate: "5.1%", badge: "Tier 1",     color: "#7DF9C5" },
      { bank: "Bank C",     product: "FD · MUR 1M · 24mo", rate: "4.9%", badge: "Bonus tier", color: "#FF9F7A" },
    ],
  },
  {
    label: "Investments", product: "Investment Account", amount: "MUR 750,000",
    term: "Managed · 12mo target", bidsLabel: "3 banks bidding",
    offers: [
      { bank: "Wealth desk A",    product: "Balanced · MUR 750K", rate: "+7.4%", badge: "Top return",  color: "#FFD84D" },
      { bank: "Wealth desk B", product: "Growth · MUR 750K",   rate: "+8.1%", badge: "Higher risk", color: "#7DF9C5" },
      { bank: "Wealth desk C", product: "Income · MUR 750K",   rate: "+5.6%", badge: "Lowest fee",  color: "#FF9F7A" },
    ],
  },
];
