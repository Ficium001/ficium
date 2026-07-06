// src/individual/finance/hooks/useHoldings.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listHoldings, createHolding, updateHolding, deleteHolding } from "@/individual/finance/api/holdings";
import type { HoldingInput } from "@/individual/finance/types";
import { FinanceQueryKeys } from "@/individual/finance/hooks/useAccounts";
import { DashboardQueryKeys } from "@/individual/dashboard/hooks/useDashboard";

export function useHoldings() {
  return useQuery({
    queryKey: FinanceQueryKeys.holdings,
    queryFn:  listHoldings,
    staleTime: 60_000,
  });
}

function useInvalidateAfterMutation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: FinanceQueryKeys.holdings });
    qc.invalidateQueries({ queryKey: FinanceQueryKeys.history });
    qc.invalidateQueries({ queryKey: DashboardQueryKeys.profile });
    qc.invalidateQueries({ queryKey: ["financial_snapshot"] });
  };
}

export function useCreateHolding() {
  const invalidate = useInvalidateAfterMutation();
  return useMutation({
    mutationFn: (input: HoldingInput) => createHolding(input),
    onSuccess: invalidate,
  });
}

export function useUpdateHolding() {
  const invalidate = useInvalidateAfterMutation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: HoldingInput }) => updateHolding(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteHolding() {
  const invalidate = useInvalidateAfterMutation();
  return useMutation({
    mutationFn: (id: string) => deleteHolding(id),
    onSuccess: invalidate,
  });
}
