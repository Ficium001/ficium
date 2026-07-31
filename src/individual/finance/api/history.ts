// src/individual/finance/api/history.ts
import { supabase , getCachedUser } from "@/shared/lib/supabase";
import type { Currency, NetWorthHistoryPoint } from "@/individual/finance/types";

function mapRow(row: Record<string, unknown>): NetWorthHistoryPoint {
  return {
    snapshotDate:     row.snapshot_date as string,
    cashSavings:      Number(row.cash_savings ?? 0),
    fixedDeposits:    Number(row.fixed_deposits ?? 0),
    investmentsValue: Number(row.investments_value ?? 0),
    totalAssets:      Number(row.total_assets ?? 0),
    totalLiabilities: Number(row.total_liabilities ?? 0),
    netWorth:         Number(row.net_worth ?? 0),
    currency:         row.currency as Currency,
  };
}

export async function getNetWorthHistory(days = 180): Promise<NetWorthHistoryPoint[]> {
  const { data: { user } } = await getCachedUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("finance_get_net_worth_history", { p_days: days });
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[]) ?? []).map(mapRow);
}

export async function setReportingCurrency(currency: Currency): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("set_reporting_currency", { p_currency: currency });
  return { ok: !error, error: error?.message };
}

export async function getReportingCurrency(): Promise<Currency> {
  const { data: { user } } = await getCachedUser();
  if (!user) return "MUR";

  const { data, error } = await supabase
    .from("client_financial_snapshot")
    .select("currency")
    .eq("client_id", user.id)
    .maybeSingle();

  if (error || !data) return "MUR";
  return (data.currency as Currency) ?? "MUR";
}
