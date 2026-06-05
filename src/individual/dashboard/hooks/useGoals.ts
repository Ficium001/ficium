// =============================================================
// Ficium — useGoals hook
// TanStack Query wrapper around goals API.
// Returns live Supabase data. Empty array if no goals yet.
// =============================================================
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGoals, createGoal,
  type Goal, type CreateGoalInput, type GoalType,
  GOAL_TYPE_ROUTE, goalProgress,
} from "@/individual/dashboard/api/goals";

export { type Goal, type GoalType, type CreateGoalInput, GOAL_TYPE_ROUTE, goalProgress };

const QK_GOALS = ["goals"] as const;

export function useGoals() {
  return useQuery({
    queryKey: QK_GOALS,
    queryFn:  getMyGoals,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_GOALS }),
  });
}
