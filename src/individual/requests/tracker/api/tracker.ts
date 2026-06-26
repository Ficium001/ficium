import { supabase }              from "@/shared/lib/supabase";
import type { LoanTrackerResponse } from "../types/tracker";

export async function fetchLoanTracker(
  requestId: string,
): Promise<LoanTrackerResponse | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const res = await fetch(
    `/api/loan-tracker?requestId=${encodeURIComponent(requestId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) return null;

  const json = await res.json() as { ok: boolean; data?: LoanTrackerResponse };
  return json?.ok && json.data ? json.data : null;
}
