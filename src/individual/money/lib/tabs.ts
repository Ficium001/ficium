// src/individual/money/lib/tabs.ts
// The one Money page is split into tabs, addressed by ?tab= so every old
// entry point (dashboard tiles, Fia, bookmarks) can deep-link to its part.

export const MONEY_TABS = [
  { key: "overview",    label: "Overview" },
  { key: "accounts",    label: "Accounts" },
  { key: "assets",      label: "Assets & debts" },
  { key: "health",      label: "Health" },
  { key: "calculators", label: "Calculators" },
] as const;

export type MoneyTab = (typeof MONEY_TABS)[number]["key"];

export function parseMoneyTab(raw: string | null): MoneyTab {
  return MONEY_TABS.some((t) => t.key === raw) ? (raw as MoneyTab) : "overview";
}

/** Path for a tab. Use this everywhere instead of hand-writing URLs. */
export function moneyPath(tab: MoneyTab = "overview", extra?: Record<string, string>): string {
  const q = new URLSearchParams(tab === "overview" ? {} : { tab });
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  const s = q.toString();
  return s ? `/money?${s}` : "/money";
}
