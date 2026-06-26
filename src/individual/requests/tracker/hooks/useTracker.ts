import { useQuery } from "@tanstack/react-query";
import { fetchLoanTracker } from "../api/tracker";

export const TrackerKeys = {
  detail: (requestId: string) => ["tracker", requestId] as const,
};

export function useLoanTracker(requestId: string, enabled = true) {
  return useQuery({
    queryKey: TrackerKeys.detail(requestId),
    queryFn:  () => fetchLoanTracker(requestId),
    enabled:  !!requestId && enabled,
    staleTime: 60_000,   // pipeline stages change infrequently
    retry: 1,
  });
}
