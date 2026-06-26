import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyRequests,
  getRequest,
  getRequestBids,
  acceptBid,
  type Bid,
  type Phase2Reveal,
} from "@/individual/requests/api/requests";

// ── Query keys ────────────────────────────────────────────────────────────────
export const RequestQueryKeys = {
  all:    ["requests"]                          as const,
  mine:   ["requests", "mine"]                  as const,
  detail: (id: string) => ["requests", id]      as const,
  bids:   (id: string) => ["requests", id, "bids"] as const,
} as const;

export function useMyRequests() {
  return useQuery({
    queryKey: RequestQueryKeys.mine,
    queryFn:  getMyRequests,
    staleTime: 60 * 1000,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: RequestQueryKeys.detail(id),
    queryFn:  () => getRequest(id),
    enabled:  !!id,
  });
}

export function useRequestBids(requestId: string) {
  return useQuery({
    queryKey: RequestQueryKeys.bids(requestId),
    queryFn:  () => getRequestBids(requestId),
    enabled:  !!requestId,
    staleTime: 30 * 1000,
  });
}

export function useAcceptBid(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bid: Bid) => acceptBid(bid.id, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RequestQueryKeys.all });
    },
  });
}

export type { Bid, Phase2Reveal };
