export type Offer = { bank: string; product: string; rate: string; badge: string; color: string };
export type Scene = { label: string; product: string; amount: string; term: string; bidsLabel: string; offers: Offer[] };

export const SCENES: Scene[] = [
  {
    label: "Personal Loan", product: "Personal Loan", amount: "MUR 500,000",
    term: "36 months · Mauritius", bidsLabel: "12 banks bidding",
    offers: [
      { bank: "MCB Bank",     product: "Personal Loan · MUR 500K", rate: "8.2%", badge: "Best rate",        color: "#FFD84D" },
      { bank: "SBM Bank",     product: "Personal Loan · MUR 500K", rate: "9.1%", badge: "Fastest decision", color: "#7DF9C5" },
      { bank: "AfrAsia Bank", product: "Personal Loan · MUR 500K", rate: "9.4%", badge: "No fees",          color: "#FF9F7A" },
    ],
  },
  {
    label: "Business Funding", product: "SME Working Capital", amount: "MUR 2,500,000",
    term: "60 months · Port Louis SME", bidsLabel: "8 banks bidding",
    offers: [
      { bank: "AfrAsia Bank", product: "SME Loan · MUR 2.5M", rate: "7.9%", badge: "Best rate",     color: "#FFD84D" },
      { bank: "MCB Bank",     product: "SME Loan · MUR 2.5M", rate: "8.3%", badge: "Relationship",  color: "#7DF9C5" },
      { bank: "MauBank",      product: "SME Loan · MUR 2.5M", rate: "8.7%", badge: "Fast approval", color: "#FF9F7A" },
    ],
  },
  {
    label: "Fixed Deposit", product: "Fixed Deposit", amount: "MUR 1,000,000",
    term: "24 months · p.a.", bidsLabel: "9 banks bidding",
    offers: [
      { bank: "ABC Banking", product: "FD · MUR 1M · 24mo", rate: "5.4%", badge: "Best yield", color: "#FFD84D" },
      { bank: "SBM Bank",    product: "FD · MUR 1M · 24mo", rate: "5.1%", badge: "Tier 1",     color: "#7DF9C5" },
      { bank: "MauBank",     product: "FD · MUR 1M · 24mo", rate: "4.9%", badge: "Bonus tier", color: "#FF9F7A" },
    ],
  },
  {
    label: "Investments", product: "Investment Account", amount: "MUR 750,000",
    term: "Managed · 12mo target", bidsLabel: "6 banks bidding",
    offers: [
      { bank: "MCB Capital",    product: "Balanced · MUR 750K", rate: "+7.4%", badge: "Top return",  color: "#FFD84D" },
      { bank: "AfrAsia Wealth", product: "Growth · MUR 750K",   rate: "+8.1%", badge: "Higher risk", color: "#7DF9C5" },
      { bank: "SBM Asset Mgmt", product: "Income · MUR 750K",   rate: "+5.6%", badge: "Lowest fee",  color: "#FF9F7A" },
    ],
  },
];
