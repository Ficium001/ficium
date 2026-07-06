// src/individual/finance/hooks/useAccounts.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAccounts, createAccount, updateAccount, deleteAccount } from "@/individual/finance/api/accounts";
import type { AccountInput } from "@/individual/finance/types";
import { DashboardQueryKeys } from "@/individual/dashboard/hooks/useDashboard";

export const FinanceQueryKeys = {
  accounts: ["finance_accounts"] as const,
  holdings: ["finance_holdings"] as const,
  history:  ["finance_net_worth_history"] as const,
};

export function useAccounts() {
  return useQuery({
    queryKey: FinanceQueryKeys.accounts,
    queryFn:  listAccounts,
    staleTime: 60_000,
  });
}

function useInvalidateAfterMutation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: FinanceQueryKeys.accounts });
    qc.invalidateQueries({ queryKey: FinanceQueryKeys.history });
    // Net worth on the dashboard/networth page derives from the same
    // client_financial_snapshot row that recompute_snapshot() updates.
    qc.invalidateQueries({ queryKey: DashboardQueryKeys.profile });
    qc.invalidateQueries({ queryKey: ["financial_snapshot"] });
  };
}

export function useCreateAccount() {
  const invalidate = useInvalidateAfterMutation();
  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAfterMutation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AccountInput }) => updateAccount(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAfterMutation();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: invalidate,
  });
}
