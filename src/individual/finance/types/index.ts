// src/individual/finance/types/index.ts

export type AccountType = "savings" | "current" | "fixed_deposit";
export type AssetType   = "stock" | "etf" | "bond" | "crypto";
export type Currency    = "MUR" | "USD" | "EUR" | "GBP" | "ZAR";

export const CURRENCIES: Currency[] = ["MUR", "USD", "EUR", "GBP", "ZAR"];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings:       "Savings",
  current:       "Current",
  fixed_deposit: "Fixed Deposit",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock:  "Stock",
  etf:    "ETF",
  bond:   "Bond",
  crypto: "Crypto",
};

export type Account = {
  id: string;
  institutionName: string;
  accountType: AccountType;
  currency: Currency;
  balance: number;
  balanceReporting: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountInput = {
  institutionName: string;
  accountType: AccountType;
  currency: Currency;
  balance: number;
  notes?: string | null;
};

export type Holding = {
  id: string;
  assetType: AssetType;
  symbol: string;
  exchange: string | null;
  quantity: number;
  currency: Currency | string;
  costBasis: number | null;
  price: number | null;
  priceCurrency: string | null;
  priceFetchedAt: string | null;
  marketValueNative: number;
  marketValueReporting: number;
  costBasisReporting: number | null;
  unrealizedPlReporting: number | null;
  unrealizedPlPct: number | null;
  notes: string | null;
};

export type HoldingInput = {
  assetType: AssetType;
  symbol: string;
  exchange?: string | null;
  quantity: number;
  currency: string;
  costBasis?: number | null;
  notes?: string | null;
};

export type NetWorthHistoryPoint = {
  snapshotDate: string;
  cashSavings: number;
  fixedDeposits: number;
  investmentsValue: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  currency: Currency;
};
