// =============================================================
// Ficium — Goals API
// Reads/writes goals from Supabase `client_goals` table.
// Falls back to seed data gracefully if table doesn't exist yet.
// =============================================================
import { supabase } from "@/shared/lib/supabase";

export type GoalStatus = "on-track" | "needs-attention" | "ahead";

export type GoalType =
  | "mortgage"
  | "vehicle"
  | "personal"
  | "investment"
  | "education"
  | "business"
  | "savings"
  | "other";

export type Goal = {
  id:          string;
  clientId:    string;
  type:        GoalType;
  title:       string;
  targetAmount: number;
  savedAmount:  number;
  targetDate:   string | null;   // ISO date string
  status:       GoalStatus;
  aiInsight:    string | null;
  banksReady:   number;
  loanRoute:    string;
  createdAt:    string;
};

export type CreateGoalInput = {
  type:         GoalType;
  title:        string;
  targetAmount: number;
  savedAmount:  number;
  targetDate?:  string;
};

// ── Map goal type → request route ────────────────────────────
export const GOAL_TYPE_ROUTE: Record<GoalType, string> = {
  mortgage:   "/requests/new?type=mortgage",
  vehicle:    "/requests/new?type=leasing",
  personal:   "/requests/new?type=personal_loan",
  investment: "/requests/new?type=investment_account",
  education:  "/requests/new?type=personal_loan&purpose=education",
  business:   "/requests/new?type=business_loan",
  savings:    "/requests/new?type=fixed_deposit",
  other:      "/requests/new",
};

// ── Computed fields ───────────────────────────────────────────
export function goalProgress(g: Pick<Goal, "savedAmount" | "targetAmount">): number {
  if (!g.targetAmount) return 0;
  return Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
}

function computeStatus(saved: number, target: number, targetDate: string | null): GoalStatus {
  const pct = target ? saved / target : 0;
  if (pct >= 0.9) return "ahead";
  if (!targetDate) return "on-track";
  const daysLeft = (new Date(targetDate).getTime() - Date.now()) / 86_400_000;
  const expected = daysLeft > 0 ? pct * (365 / daysLeft) : 1;
  return expected >= 0.8 ? "on-track" : "needs-attention";
}

// ── Fetch goals ───────────────────────────────────────────────
export async function getMyGoals(): Promise<Goal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("client_goals")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: true });

  // Table may not exist yet — return empty so UI shows seed data
  if (error || !data?.length) return [];

  return data.map((row) => ({
    id:           row.id,
    clientId:     row.client_id,
    type:         row.type as GoalType,
    title:        row.title,
    targetAmount: row.target_amount,
    savedAmount:  row.saved_amount ?? 0,
    targetDate:   row.target_date ?? null,
    status:       computeStatus(row.saved_amount ?? 0, row.target_amount, row.target_date),
    aiInsight:    row.ai_insight ?? null,
    banksReady:   row.banks_ready ?? 0,
    loanRoute:    GOAL_TYPE_ROUTE[row.type as GoalType] ?? "/requests/new",
    createdAt:    row.created_at,
  }));
}

// ── Create goal ───────────────────────────────────────────────
export async function createGoal(input: CreateGoalInput): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("client_goals").insert({
    client_id:     user.id,
    type:          input.type,
    title:         input.title,
    target_amount: input.targetAmount,
    saved_amount:  input.savedAmount,
    target_date:   input.targetDate ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Update saved amount ───────────────────────────────────────
export async function updateGoalSaved(id: string, savedAmount: number): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("client_goals")
    .update({ saved_amount: savedAmount })
    .eq("id", id);
  return { ok: !error };
}
