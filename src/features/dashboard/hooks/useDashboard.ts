import { useQuery } from "@tanstack/react-query";

import {
  getProfileSummary,
  getMyRequests,
  computeNextActions,
  computeBankReadiness,
  computeHealthRecommendations,
} from "../api/profile";

/* ── Profile (from client_profile_view) ── */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfileSummary,
    staleTime: 2 * 60 * 1000,
  });
}

/* ── Requests ── */

export function useMyRequests() {
  return useQuery({
    queryKey: ["my-requests"],
    queryFn: getMyRequests,
    staleTime: 60 * 1000,
  });
}

/* ── Derived: next actions ── */

export function useNextActions() {
  const { data: profile } = useProfile();
  return {
    actions: profile ? computeNextActions(profile) : [],
    isReady: !!profile,
  };
}

/* ── Derived: bank readiness ── */

export function useBankReadiness() {
  const { data: profile } = useProfile();
  return {
    score: profile ? computeBankReadiness(profile) : null,
    isReady: !!profile,
  };
}

/* ── Derived: health recommendations ── */

export function useHealthRecommendations() {
  const { data: profile } = useProfile();
  return {
    recommendations: profile ? computeHealthRecommendations(profile) : [],
    isReady: !!profile,
  };
}