/**
 * src/individual/dashboard/hooks/useDashboard.ts
 * ─────────────────────────────────────────────────────────────
 * Dashboard data hooks — profile + derived computations.
 * Requests are now in their own module (src/modules/requests/hooks.ts).
 *
 * Re-exports useMyRequests from the requests module for backward
 * compatibility — existing consumers don't need to change.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getProfileSummary,
  computeNextActions,
  computeBankReadiness,
  computeHealthRecommendations,
} from "../api/profile";

// Re-export from requests module — single source of truth
export { useMyRequests } from "../../../modules/requests/hooks";

// ── Query keys ───────────────────────────────────────────────

export const DashboardQueryKeys = {
  profile: ["profile"] as const,
} as const;

// ── Profile ──────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: DashboardQueryKeys.profile,
    queryFn:  getProfileSummary,
    staleTime: 2 * 60 * 1000, // 2 min — profile rarely changes mid-session
  });
}

// ── Derived (computed client-side from profile — no extra DB calls) ──

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
