import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCouple,
  createInvitation,
  respondToInvitation,
  revokeInvitation,
} from "@/individual/couple/api/couple";

export const CoupleQueryKeys = {
  mine: ["couple", "mine"] as const,
} as const;

export function useCouple() {
  return useQuery({
    queryKey: CoupleQueryKeys.mine,
    queryFn: getCouple,
    staleTime: 30 * 1000,
    select: (result) => (result.ok ? result.data : { couple: null }),
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CoupleQueryKeys.mine });
    },
  });
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, respondAction }: { token: string; respondAction: "accept" | "decline" }) =>
      respondToInvitation(token, respondAction),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CoupleQueryKeys.mine });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CoupleQueryKeys.mine });
    },
  });
}
