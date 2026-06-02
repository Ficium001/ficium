/**
 * src/modules/requests/hooks.ts
 * ─────────────────────────────────────────────────────────────
 * React Query hooks for the Requests module.
 * Query keys are co-located with their module — easy to invalidate.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyRequests, createRequest, type CreateRequestInput } from "./api";

// ── Query keys ───────────────────────────────────────────────
// Co-located with the module. Prefix with "requests" to namespace.
export const RequestQueryKeys = {
  all:  ["requests"] as const,
  mine: ["requests", "mine"] as const,
} as const;

// ── Queries ──────────────────────────────────────────────────

export function useMyRequests() {
  return useQuery({
    queryKey: RequestQueryKeys.mine,
    queryFn:  getMyRequests,
    staleTime: 60 * 1000, // 1 min — bids can arrive at any time
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRequestInput) => createRequest(input),
    onSuccess: () => {
      // Invalidate the requests list so it refetches with the new entry
      queryClient.invalidateQueries({ queryKey: RequestQueryKeys.mine });
    },
  });
}
