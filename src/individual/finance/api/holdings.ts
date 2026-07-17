// src/individual/finance/api/holdings.ts
import { supabase } from "@/shared/lib/supabase";
import type { Holding, HoldingInput } from "@/individual/finance/types";

function mapRow(row: Record<string, unknown>): Holding {
  return {
    id:                     row.id as string,
    assetType:              row.asset_type as Holding["assetType"],
    symbol:                 row.symbol as string,
    exchange:               (row.exchange as string | null) ?? null,
    quantity:               Number(row.quantity ?? 0),
    currency:               row.currency as string,
    costBasis:              row.cost_basis != null ? Number(row.cost_basis) : null,
    price:                  row.price != null ? Number(row.price) : null,
    priceCurrency:          (row.price_currency as string | null) ?? null,
    priceFetchedAt:         (row.price_fetched_at as string | null) ?? null,
    marketValueNative:      Number(row.market_value_native ?? 0),
    marketValueReporting:   Number(row.market_value_reporting ?? 0),
    costBasisReporting:     row.cost_basis_reporting != null ? Number(row.cost_basis_reporting) : null,
    unrealizedPlReporting:  row.unrealized_pl_reporting != null ? Number(row.unrealized_pl_reporting) : null,
    unrealizedPlPct:        row.unrealized_pl_pct != null ? Number(row.unrealized_pl_pct) : null,
    notes:                  (row.notes as string | null) ?? null,
  };
}

export async function listHoldings(): Promise<Holding[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("finance_holdings_summary", { p_reporting_currency: null });
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[]) ?? []).map(mapRow);
}

export async function createHolding(input: HoldingInput): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("finance_upsert_holding", {
    p_id:         null,
    p_asset_type: input.assetType,
    p_symbol:     input.symbol,
    p_exchange:   input.exchange ?? "",
    p_quantity:   input.quantity,
    p_currency:   input.currency,
    p_cost_basis: input.costBasis ?? null,
    p_notes:      input.notes ?? null,
  });

  return { ok: !error, error: error?.message };
}

export async function updateHolding(id: string, input: HoldingInput): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("finance_upsert_holding", {
    p_id:         id,
    p_asset_type: input.assetType,
    p_symbol:     input.symbol,
    p_exchange:   input.exchange ?? "",
    p_quantity:   input.quantity,
    p_currency:   input.currency,
    p_cost_basis: input.costBasis ?? null,
    p_notes:      input.notes ?? null,
  });

  return { ok: !error, error: error?.message };
}

export async function deleteHolding(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("finance_delete_holding", { p_id: id });
  return { ok: !error, error: error?.message };
}
