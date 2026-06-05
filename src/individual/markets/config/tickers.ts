import {
  Percent, DollarSign, Globe, BarChart2, Landmark, TrendingDown, TrendingUp,
} from "lucide-react";
import type { TickerConfig, TickerId } from "../types";

export const TICKER_CONFIGS: Record<TickerId, TickerConfig> = {
  repo_rate: {
    id: "repo_rate",
    label: "Repo Rate",
    unit: "%",
    icon: Percent,
    color: "#2A1FE6",
    story: "The rate the Bank of Mauritius charges banks to borrow money. When it rises, your loan gets more expensive. When it falls, savings accounts often pay less.",
  },
  usd_mur: {
    id: "usd_mur",
    label: "USD / MUR",
    unit: "",
    icon: DollarSign,
    color: "#16a34a",
    story: "How many Mauritian rupees it takes to buy one US dollar. A rising number means the rupee is weakening — imported goods cost more.",
  },
  eur_mur: {
    id: "eur_mur",
    label: "EUR / MUR",
    unit: "",
    icon: Globe,
    color: "#d97706",
    story: "The cost of one Euro in rupees. Relevant if you shop from Europe, study abroad, or receive salary in Euros.",
  },
  gbp_mur: {
    id: "gbp_mur",
    label: "GBP / MUR",
    unit: "",
    icon: Globe,
    color: "#7c3aed",
    story: "Rupees needed to buy one British pound. Useful if you send money to the UK or pay British tuition fees.",
  },
  semdex: {
    id: "semdex",
    label: "SEMDEX",
    unit: "pts",
    icon: BarChart2,
    color: "#0891b2",
    story: "Mauritius's main stock market index. Rising means local companies are doing well — often good news for your pension or unit trust.",
  },
  avg_deposit_rate: {
    id: "avg_deposit_rate",
    label: "Avg Deposit",
    unit: "%",
    icon: Landmark,
    color: "#059669",
    story: "The average interest rate banks pay on savings across Mauritius. Use Ficium to post a deposit request and let banks compete to beat this.",
  },
  avg_lending_rate: {
    id: "avg_lending_rate",
    label: "Avg Lending",
    unit: "%",
    icon: TrendingDown,
    color: "#dc2626",
    story: "The average rate banks charge for loans. Anything you get on Ficium should aim to beat this — banks compete, you win.",
  },
  inflation_yoy: {
    id: "inflation_yoy",
    label: "Inflation (YoY)",
    unit: "%",
    icon: TrendingUp,
    color: "#ea580c",
    story: "How much more expensive things are compared to a year ago. When inflation is high, your money buys less — a good reason to keep your savings working harder.",
  },
};

export const TICKER_ORDER: TickerId[] = [
  "repo_rate",
  "usd_mur",
  "eur_mur",
  "gbp_mur",
  "semdex",
  "avg_deposit_rate",
  "avg_lending_rate",
  "inflation_yoy",
];

export const NEWS_CATEGORY_COLORS: Record<string, string> = {
  "Interest Rates": "#2A1FE6",
  "Currency":       "#d97706",
  "Stock Market":   "#0891b2",
  "Savings":        "#059669",
  "Lending":        "#7c3aed",
  "Economy":        "#64748b",
};

export const NEWS_CATEGORY_BG: Record<string, string> = {
  "Interest Rates": "#ede9fe",
  "Currency":       "#fef3c7",
  "Stock Market":   "#e0f2fe",
  "Savings":        "#d1fae5",
  "Lending":        "#f3e8ff",
  "Economy":        "#f1f5f9",
};
