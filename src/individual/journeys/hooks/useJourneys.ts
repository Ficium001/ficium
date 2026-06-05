import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyJourneys, getJourney, createJourney, updateJourney,
  getJourneyTasks, completeTask, calculateAffordability,
  type Journey, type JourneyType, type JourneyAnswers, type JourneyAIResults, type JourneyTask,
} from "@/individual/journeys/api/journeys";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";

export type { Journey, JourneyType, JourneyAnswers, JourneyAIResults, JourneyTask };

const QK = {
  journeys: ["journeys"] as const,
  journey:  (id: string) => ["journeys", id] as const,
  tasks:    (id: string) => ["journeys", id, "tasks"] as const,
};

export function useJourneys() {
  return useQuery({ queryKey: QK.journeys, queryFn: getMyJourneys, staleTime: 2 * 60_000 });
}

export function useJourney(id: string) {
  return useQuery({ queryKey: QK.journey(id), queryFn: () => getJourney(id), enabled: !!id });
}

export function useJourneyTasks(journeyId: string) {
  return useQuery({ queryKey: QK.tasks(journeyId), queryFn: () => getJourneyTasks(journeyId), enabled: !!journeyId });
}

export function useCreateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, title, answers, aiResults }: {
      type: JourneyType; title: string; answers: JourneyAnswers; aiResults: JourneyAIResults;
    }) => createJourney(type, title, answers, aiResults),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.journeys }),
  });
}

export function useCompleteTask(journeyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK.tasks(journeyId) }),
  });
}

// AI calculation with profile context
export function useCalculateAffordability() {
  const { data: profile } = useProfile();
  return (type: JourneyType, answers: JourneyAnswers) => {
    const ctx = profile
      ? `Income: Rs ${profile.monthlyIncome ?? 0}/month. Health score: ${profile.healthScore ?? 0}. Employment: ${profile.employmentStatus ?? "unknown"}.`
      : "Profile not available.";
    return calculateAffordability(type, answers, ctx);
  };
}
