import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "@/individual/alerts/api/notifications";
import type { AppNotification } from "@/individual/alerts/api/notifications";

// ── Query keys — single registry for all notification cache ──────────────────
export const NotificationQueryKeys = {
  all:         ["notifications"]                        as const,
  list:        ["notifications", "list"]                as const,
  unread:      (userId: string) => ["notifications", "unread", userId] as const,
} as const;

// ── Unread count — smart polling (visibility-aware interval) ─────────────────
// 30s when tab is visible, 5 min when hidden — saves battery + connections.
// Instantly refetches on tab focus to cover the gap.
// When a live subscription is added (Ably/Pusher), replace queryFn only —
// the hook shell, interval, and invalidation logic stay identical.

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
        queryKey: NotificationQueryKeys.unread(userId),
      });
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [userId, queryClient]);

  return useQuery({
    queryKey:            NotificationQueryKeys.unread(userId ?? ""),
    queryFn:             getUnreadCount,
    enabled:             !!userId,
    refetchInterval:     getPollInterval,   // dynamic: 30s visible / 5m hidden
    refetchOnWindowFocus: true,             // immediate refresh on tab focus
    staleTime:           25_000,            // slightly under poll interval
    select:              (data: number) => data,
  });
}

// ── Full list ────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: NotificationQueryKeys.list,
    queryFn:  () => getMyNotifications(),
    staleTime: 30_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NotificationQueryKeys.list });
      const previous = queryClient.getQueryData<AppNotification[]>(NotificationQueryKeys.list);
      const now = new Date().toISOString();
      queryClient.setQueryData<AppNotification[]>(
        NotificationQueryKeys.list,
        (old) => old?.map((n) => (n.readAt ? n : { ...n, readAt: now })) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(NotificationQueryKeys.list, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NotificationQueryKeys.all });
    },
  });
}

export function useMarkOneRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markOneRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NotificationQueryKeys.list });
      const previous = queryClient.getQueryData<AppNotification[]>(NotificationQueryKeys.list);
      const now = new Date().toISOString();
      queryClient.setQueryData<AppNotification[]>(
        NotificationQueryKeys.list,
        (old) => old?.map((n) => (n.id === id ? { ...n, readAt: now } : n)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(NotificationQueryKeys.list, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NotificationQueryKeys.all });
    },
  });
}
