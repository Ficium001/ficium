import { useQuery } from "@tanstack/react-query";
import {
  getProfileSummary,
  computeNextActions,
  computeBankReadiness,
  computeHealthRecommendations,
} from "@/individual/dashboard/api/profile";

export { useMyRequests } from "@/individual/requests/hooks/useRequests";

export const DashboardQueryKeys = {
  profile: ["profile"] as const,
} as const;

export function useProfile() {
  return useQuery({
    queryKey:  DashboardQueryKeys.profile,
    queryFn:   getProfileSummary,
    staleTime: 10 * 60 * 1000,  // 10 min — don't refetch while navigating
    gcTime:    30 * 60 * 1000,  // 30 min — keep in memory across page loads
    refetchOnWindowFocus: false, // don't refetch when user tabs back
    refetchOnMount: false,       // use cached data immediately on remount
  });
}

export function useNextActions() {
  const { data: profile } = useProfile();
  return {
    actions: profile ? computeNextActions(profile) : [],
    isReady: !!profile,
  };
}

export function useBankReadiness() {
  const { data: profile } = useProfile();
  return {
    score:   profile ? computeBankReadiness(profile) : null,
    isReady: !!profile,
  };
}

export function useHealthRecommendations() {
  const { data: profile } = useProfile();
  return {
    recommendations: profile ? computeHealthRecommendations(profile) : [],
    isReady:         !!profile,
  };
}
