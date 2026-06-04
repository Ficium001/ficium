import { TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ElementType } from "react";

// ── Sparkline seed data ───────────────────────────────────────────────────────
export const SPARK_HEALTH   = [30, 35, 32, 40, 38, 44, 46];
export const SPARK_NETWORTH = [20, 22, 21, 24, 25, 27, 28];
export const SPARK_REQUESTS = [0, 0, 0, 1, 1, 1, 1];

// ── Insight shape ─────────────────────────────────────────────────────────────
export type InsightItem = {
  icon:  ElementType;
  color: string;
  bg:    string;
  text:  string;
  type:  "positive" | "info" | "warning";
};

// ── Static fallbacks shown while intelligence loads ───────────────────────────
export const FALLBACK_INSIGHTS: InsightItem[] = [
  {
    icon:  TrendingUp,
    color: "#16a34a",
    bg:    "rgba(22,163,74,0.12)",
    text:  "Your debt ratio improved 8% this month",
    type:  "positive",
  },
  {
    icon:  CheckCircle2,
    color: "#4f46e5",
    bg:    "rgba(79,70,229,0.12)",
    text:  "Your liquidity is above average for your income bracket",
    type:  "info",
  },
  {
    icon:  AlertTriangle,
    color: "#d97706",
    bg:    "rgba(217,119,6,0.12)",
    text:  "You may be overpaying on your current loan — compare rates now",
    type:  "warning",
  },
];

// ── Greeting ──────────────────────────────────────────────────────────────────
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ── Formatting ────────────────────────────────────────────────────────────────
export function formatAmount(n: number): string {
  if (n === 0) return "0";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function healthLabel(score: number | null): { label: string; color: string } {
  if (score == null)  return { label: "—",    color: "#888"    };
  if (score >= 70)    return { label: "Good", color: "#16a34a" };
  if (score >= 50)    return { label: "Fair", color: "#d97706" };
  return                     { label: "Low",  color: "#dc2626" };
}
