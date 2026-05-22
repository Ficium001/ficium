import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyNotifications, markAllRead, markOneRead } from "../api/notifications";
import type { AppNotification } from "../api/notifications";

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: () => getMyNotifications(),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<AppNotification[]>(["notifications"]);
      const now = new Date().toISOString();
      queryClient.setQueryData<AppNotification[]>(["notifications"], (old) =>
        old?.map((n) => (n.readAt ? n : { ...n, readAt: now })) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["notifications"], context?.previous);
    },
  });
}

export function useMarkOneRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markOneRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<AppNotification[]>(["notifications"]);
      const now = new Date().toISOString();
      queryClient.setQueryData<AppNotification[]>(["notifications"], (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt: now } : n)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["notifications"], context?.previous);
    },
  });
}