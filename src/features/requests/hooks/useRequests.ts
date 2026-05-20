import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, getRequestBids, acceptBid } from "../api/requests";

export function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: () => getRequest(id),
    enabled: !!id,
  });
}

export function useRequestBids(requestId: string) {
  return useQuery({
    queryKey: ["request-bids", requestId],
    queryFn: () => getRequestBids(requestId),
    enabled: !!requestId,
  });
}

export function useAcceptBid(requestId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bidId: string) => acceptBid(bidId, requestId),
    onSuccess: () => {
      // Invalidate everything that needs to refresh
      queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["request-bids", requestId] });
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}