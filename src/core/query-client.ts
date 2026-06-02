/**
 * src/core/query-client.ts
 * ─────────────────────────────────────────────────────────────
 * Single QueryClient instance for the entire app.
 * Tuned for high-concurrency: conservative refetch strategy,
 * longer stale times to reduce DB pressure.
 *
 * To upgrade caching strategy, change only this file.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           2 * 60 * 1000, // 2 min — data stays fresh
      gcTime:             10 * 60 * 1000, // 10 min — keep in memory
      retry:               1,              // 1 retry on network failure
      refetchOnWindowFocus: false,         // FIXED: was true — caused spikes at scale
      refetchOnReconnect:  true,           // re-fetch on network reconnect only
    },
    mutations: {
      retry: 0, // mutations don't retry — avoid duplicate writes
    },
  },
});
