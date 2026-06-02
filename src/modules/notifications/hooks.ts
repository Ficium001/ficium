/**
 * src/modules/notifications/hooks.ts
 * ─────────────────────────────────────────────────────────────
 * React Query hook for notification count with smart polling.
 * Replaces the always-on WebSocket in AuthContext.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect }                from "react";
import { fetchUnreadCount, getPollInterval } from "./service";

export const NotificationQueryKeys = {
  unreadCount: (userId: string) => ["notifications", "unread", userId] as const,
} as const;

export function useUnreadCount(userId: string | null) {
  const queryClient = useQueryClient();

  // Adjust poll interval when visibility changes
  useEffect(() => {
    if (!userId) return;

    const handler = () => {
      queryClient.invalidateQueries({
        queryKey: NotificationQueryKeys.unreadCount(userId),
      });
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [userId, queryClient]);

  return useQuery({
    queryKey:         NotificationQueryKeys.unreadCount(userId ?? ""),
    queryFn:          () => fetchUnreadCount(userId!),
    enabled:          !!userId,
    refetchInterval:  getPollInterval,   // dynamic: 30s visible / 5m hidden
    refetchOnWindowFocus: true,          // immediate refresh on tab focus
    staleTime:        25_000,            // slightly less than poll interval
    select:           (data) => data.unread,
  });
}
