// =============================================================
// Ficium — shared unread-notification count
//
// Lives in shared/ because the bell badge is page chrome that any
// module (dashboard, requests, markets…) may render. The alerts
// module consumes the same query key so mark-read / clear-all
// mutations invalidate this count automatically.
// =============================================================
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/shared/lib/supabase";

export const UnreadCountQueryKey = (userId: string) =>
  ["notifications", "unread", userId] as const;

/** Count of unread notifications for the current user (RLS-scoped). */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

// Smart polling: 30s when the tab is visible, 5 min when hidden.
// Instantly refetches on tab focus to cover the gap. When a live
// subscription is added (Ably/Pusher), replace queryFn only.
function getPollInterval(): number {
  if (typeof document === "undefined") return 30_000;
  return document.visibilityState === "visible" ? 30_000 : 5 * 60_000;
}

export function useUnreadCount(userId: string | null) {
  const queryClient = useQueryClient();

  // Flush the cached count whenever the user switches back to this tab
  useEffect(() => {
    if (!userId) return;
    const handler = () => {
      void queryClient.invalidateQueries({
        queryKey: UnreadCountQueryKey(userId),
      });
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [userId, queryClient]);

  return useQuery({
    queryKey:             UnreadCountQueryKey(userId ?? ""),
    queryFn:              getUnreadCount,
    enabled:              !!userId,
    refetchInterval:      getPollInterval,   // dynamic: 30s visible / 5m hidden
    refetchOnWindowFocus: true,              // immediate refresh on tab focus
    staleTime:            25_000,            // slightly under poll interval
  });
}
