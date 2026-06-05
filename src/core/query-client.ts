/**
 * src/core/query-client.ts
 * Single QueryClient instance for the entire app.
 * Profile is persisted to sessionStorage so page refreshes
 * don't show "there" while fetching.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000, // 5 min
      gcTime:              30 * 60 * 1000, // 30 min — keep in memory
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ── Persist profile to sessionStorage ────────────────────────
// On page load, rehydrate profile cache immediately so the name
// appears instantly without waiting for the network round-trip.
const PROFILE_KEY = "ficium:profile:v1";

export function hydrateProfileCache(): void {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    const { data, timestamp } = JSON.parse(raw) as { data: unknown; timestamp: number };
    // Only rehydrate if cached within last 30 minutes
    if (Date.now() - timestamp > 30 * 60 * 1000) {
      sessionStorage.removeItem(PROFILE_KEY);
      return;
    }
    queryClient.setQueryData(["profile"], data);
  } catch { /* ignore */ }
}

export function persistProfileCache(data: unknown): void {
  try {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore — storage quota exceeded */ }
}

export function clearProfileCache(): void {
  try { sessionStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
}
