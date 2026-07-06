// src/individual/finance/hooks/useFinanceReporting.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNetWorthHistory, setReportingCurrency, getReportingCurrency } from "@/individual/finance/api/history";
import type { Currency } from "@/individual/finance/types";
import { FinanceQueryKeys } from "@/individual/finance/hooks/useAccounts";
import { DashboardQueryKeys } from "@/individual/dashboard/hooks/useDashboard";

export function useNetWorthHistory(days = 180) {
  return useQuery({
    queryKey: [...FinanceQueryKeys.history, days],
    queryFn:  () => getNetWorthHistory(days),
    staleTime: 60_000,
  });
}

export function useReportingCurrency() {
  return useQuery({
    queryKey: ["financial_snapshot", "currency"],
    queryFn:  getReportingCurrency,
    staleTime: 60_000,
  });
}

export function useSetReportingCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currency: Currency) => setReportingCurrency(currency),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FinanceQueryKeys.accounts });
      qc.invalidateQueries({ queryKey: FinanceQueryKeys.holdings });
      qc.invalidateQueries({ queryKey: FinanceQueryKeys.history });
      qc.invalidateQueries({ queryKey: DashboardQueryKeys.profile });
      qc.invalidateQueries({ queryKey: ["financial_snapshot"] });
    },
  });
}
