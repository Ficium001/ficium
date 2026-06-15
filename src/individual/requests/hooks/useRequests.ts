import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyRequests,
  getRequest,
  getRequestBids,
  acceptBid,
  type Bid,
} from "@/individual/requests/api/requests";

// ── Query keys — single source of truth for cache invalidation ───────────────
// Co-located with the requests domain. Every hook and every mutation
// references these keys, so invalidating ["requests"] clears everything.
export const RequestQueryKeys = {
  all:       ["requests"]                  as const,
  mine:      ["requests", "mine"]          as const,
  detail:    (id: string) => ["requests", id]          as const,
  bids:      (id: string) => ["requests", id, "bids"]  as const,
} as const;

// ── List ─────────────────────────────────────────────────────────────────────

export function useMyRequests() {
  return useQuery({
    queryKey: RequestQueryKeys.mine,
    queryFn:  getMyRequests,
    staleTime: 60 * 1000, // 1 min — bids can arrive at any time
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useRequest(id: string) {
  return useQuery({
    queryKey: RequestQueryKeys.detail(id),
    queryFn:  () => getRequest(id),
    enabled:  !!id,
  });
}

// ── Bids for a request ───────────────────────────────────────────────────────

export function useRequestBids(requestId: string) {
  return useQuery({
    queryKey: RequestQueryKeys.bids(requestId),
    queryFn:  () => getRequestBids(requestId),
    enabled:  !!requestId,
    staleTime: 30 * 1000, // 30s — bids arrive frequently
  });
}

// ── Accept a bid ─────────────────────────────────────────────────────────────

export function useAcceptBid(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bid: Bid) =>
      acceptBid(bid.id, requestId, { source: bid.source, institutionId: bid.bankId }),
    onSuccess: () => {
      // Invalidate all requests-related cache so dashboard + list + detail sync
      queryClient.invalidateQueries({ queryKey: RequestQueryKeys.all });
    },
  });
}
