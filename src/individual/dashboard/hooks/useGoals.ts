// =============================================================
// Ficium — useGoals hook
// TanStack Query wrapper around goals API.
// Returns live Supabase data when table exists, seed data otherwise.
// =============================================================
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGoals, createGoal,
  type Goal, type CreateGoalInput, type GoalType,
  GOAL_TYPE_ROUTE, goalProgress,
} from "@/individual/dashboard/api/goals";

export { type Goal, type GoalType, type CreateGoalInput, GOAL_TYPE_ROUTE, goalProgress };

// ── Seed data — shown while table is empty / not yet created ─
export const SEED_GOALS: Goal[] = [
  {
    id: "seed-1", clientId: "", type: "mortgage",
    title: "Buy a House", targetAmount: 1_000_000, savedAmount: 800_000,
    targetDate: "2026-12-01", status: "on-track",
    aiInsight: "You're eligible for better rates — post a request now.",
    banksReady: 5, loanRoute: GOAL_TYPE_ROUTE.mortgage, createdAt: "",
  },
  {
    id: "seed-2", clientId: "", type: "vehicle",
    title: "Mercedes A250e", targetAmount: 1_000_000, savedAmount: 250_000,
    targetDate: "2027-06-01", status: "needs-attention",
    aiInsight: "Increase deposit by Rs 50k to unlock better offers.",
    banksReady: 3, loanRoute: GOAL_TYPE_ROUTE.vehicle, createdAt: "",
  },
  {
    id: "seed-3", clientId: "", type: "personal",
    title: "Europe Trip", targetAmount: 180_000, savedAmount: 108_000,
    targetDate: "2026-08-01", status: "on-track",
    aiInsight: "You can reach your goal 2 months earlier.",
    banksReady: 2, loanRoute: GOAL_TYPE_ROUTE.personal, createdAt: "",
  },
  {
    id: "seed-4", clientId: "", type: "investment",
    title: "Investment Fund", targetAmount: 100_000, savedAmount: 40_000,
    targetDate: "2027-12-01", status: "on-track",
    aiInsight: "Your returns are outperforming similar profiles.",
    banksReady: 4, loanRoute: GOAL_TYPE_ROUTE.investment, createdAt: "",
  },
];

const QK_GOALS = ["goals"] as const;

// ── useGoals — main data hook ─────────────────────────────────
export function useGoals() {
  return useQuery({
    queryKey: QK_GOALS,
    queryFn:  getMyGoals,
    staleTime: 5 * 60 * 1000,
    // Return seed data while real data loads or table is empty
    placeholderData: SEED_GOALS,
  });
}

// ── useCreateGoal — mutation ──────────────────────────────────
export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_GOALS }),
  });
}
