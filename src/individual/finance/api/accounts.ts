// src/individual/finance/api/accounts.ts
//
// All access goes through public-schema RPC wrappers
// (finance_accounts_summary / finance_upsert_account / finance_delete_account)
// rather than supabase.schema("finance") directly — the `finance` schema
// is not guaranteed to be in PostgREST's exposed-schemas allowlist, while
// `public` always is. See migration `finance_public_rpc_wrappers`.
import { supabase } from "@/shared/lib/supabase";
import type { Account, AccountInput } from "@/individual/finance/types";

function mapRow(row: Record<string, unknown>): Account {
  return {
    id:               row.id as string,
    institutionName:  row.institution_name as string,
    accountType:      row.account_type as Account["accountType"],
    currency:         row.currency as Account["currency"],
    balance:          Number(row.balance ?? 0),
    balanceReporting: Number(row.balance_reporting ?? row.balance ?? 0),
    notes:            (row.notes as string | null) ?? null,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  };
}

export async function listAccounts(): Promise<Account[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("finance_accounts_summary", { p_reporting_currency: null });
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[]) ?? []).map(mapRow);
}

export async function createAccount(input: AccountInput): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("finance_upsert_account", {
    p_id:               null,
    p_institution_name: input.institutionName,
    p_account_type:     input.accountType,
    p_currency:         input.currency,
    p_balance:          input.balance,
    p_notes:            input.notes ?? null,
  });

  return { ok: !error, error: error?.message };
}

export async function updateAccount(id: string, input: AccountInput): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("finance_upsert_account", {
    p_id:               id,
    p_institution_name: input.institutionName,
    p_account_type:     input.accountType,
    p_currency:         input.currency,
    p_balance:          input.balance,
    p_notes:            input.notes ?? null,
  });

  return { ok: !error, error: error?.message };
}

export async function deleteAccount(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("finance_delete_account", { p_id: id });
  return { ok: !error, error: error?.message };
}
