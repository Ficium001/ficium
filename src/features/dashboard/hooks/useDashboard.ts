import { useQuery } from "@tanstack/react-query";
import { getProfileSummary, getMyRequests } from "../api/profile";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfileSummary,
  });
}

export function useMyRequests() {
  return useQuery({
    queryKey: ["my-requests"],
    queryFn: getMyRequests,
  });
}