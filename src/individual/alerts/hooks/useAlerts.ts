import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clearAllNotifications,
  getMyNotifications,
  markAllRead,
  markOneRead,
} from "@/individual/alerts/api/notifications";
import type { AppNotification } from "@/individual/alerts/api/notifications";

// Unread count lives in shared/ (page-chrome bell badge is cross-module).
export { useUnreadCount } from "@/shared/notifications/useUnreadCount";

// ── Query keys — single registry for all notification cache ──────────────────
export const NotificationQueryKeys = {
  all:         ["notifications"]                        as const,
  list:        ["notifications", "list"]                as const,
} as const;

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

export function useClearAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAllNotifications,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NotificationQueryKeys.all });
      const previous = queryClient.getQueryData<AppNotification[]>(NotificationQueryKeys.list);
      queryClient.setQueryData<AppNotification[]>(NotificationQueryKeys.list, []);
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
