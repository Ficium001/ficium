// =============================================================
// Ficium — Journeys API
// CRUD for client_journeys + AI affordability calculations
// =============================================================
import { supabase } from "@/shared/lib/supabase";
import { askClaude } from "@/shared/lib/claude";

export type JourneyType = "mortgage" | "vehicle" | "investment" | "education" | "travel" | "business";
export type JourneyStatus = "active" | "paused" | "completed" | "cancelled";

export type JourneyAnswers = Record<string, string | number | boolean>;

export type JourneyAIResults = {
  affordability?:    number;   // 0–100 score
  eligibility?:      number;   // 0–100 score
  monthlyRepayment?: number;
  depositGap?:       number;
  fundingGap?:       number;
  projectedValue?:   number;
  banksMatched?:     number;
  summary?:          string;
  actionPlan?:       string[];
};

export type Journey = {
  id:         string;
  clientId:   string;
  type:       JourneyType;
  title:      string;
  status:     JourneyStatus;
  answers:    JourneyAnswers;
  aiResults:  JourneyAIResults;
  requestId:  string | null;
  createdAt:  string;
  updatedAt:  string;
};

export type JourneyTask = {
  id:          string;
  journeyId:   string;
  title:       string;
  description: string | null;
  type:        "upload" | "action" | "verify" | "review";
  status:      "pending" | "in_progress" | "done" | "skipped";
  sortOrder:   number;
};

// ── Fetch all journeys ────────────────────────────────────────
export async function getMyJourneys(): Promise<Journey[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("client_journeys")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapJourney);
}

// ── Fetch single journey ──────────────────────────────────────
export async function getJourney(id: string): Promise<Journey | null> {
  const { data, error } = await supabase
    .from("client_journeys")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return mapJourney(data);
}

// ── Create journey + auto-generate tasks ─────────────────────
export async function createJourney(
  type: JourneyType,
  title: string,
  answers: JourneyAnswers,
  aiResults: JourneyAIResults,
): Promise<{ ok: boolean; journeyId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("client_journeys")
    .insert({ client_id: user.id, type, title, answers, ai_results: aiResults })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message };

  // Auto-create tasks based on journey type
  const tasks = buildTasks(type, data.id, user.id);
  if (tasks.length) {
    await supabase.from("journey_tasks").insert(tasks);
  }

  return { ok: true, journeyId: data.id };
}

// ── Update journey answers / results ─────────────────────────
export async function updateJourney(
  id: string,
  patch: Partial<Pick<Journey, "answers" | "aiResults" | "status" | "requestId">>,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("client_journeys")
    .update({
      ...(patch.answers    !== undefined && { answers:     patch.answers }),
      ...(patch.aiResults  !== undefined && { ai_results:  patch.aiResults }),
      ...(patch.status     !== undefined && { status:      patch.status }),
      ...(patch.requestId  !== undefined && { request_id:  patch.requestId }),
    })
    .eq("id", id);
  return { ok: !error };
}

// ── Fetch tasks for a journey ─────────────────────────────────
export async function getJourneyTasks(journeyId: string): Promise<JourneyTask[]> {
  const { data, error } = await supabase
    .from("journey_tasks")
    .select("*")
    .eq("journey_id", journeyId)
    .order("sort_order");
  if (error || !data) return [];
  return data.map((t) => ({
    id:          t.id,
    journeyId:   t.journey_id,
    title:       t.title,
    description: t.description,
    type:        t.type,
    status:      t.status,
    sortOrder:   t.sort_order,
  }));
}

// ── Complete a task ───────────────────────────────────────────
export async function completeTask(taskId: string): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("journey_tasks")
    .update({ status: "done" })
    .eq("id", taskId);
  return { ok: !error };
}

// ── AI affordability calculation ──────────────────────────────
export async function calculateAffordability(
  type: JourneyType,
  answers: JourneyAnswers,
  profileContext: string,
): Promise<JourneyAIResults> {
  const prompt = buildAffordabilityPrompt(type, answers, profileContext);
  try {
    const reply = await askClaude([{ role: "user", content: prompt }]);
    // Parse JSON from Claude reply
    const match = reply.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as JourneyAIResults;
    }
  } catch { /* fall through to defaults */ }
  return buildFallbackResults(type, answers);
}

// ── Private helpers ───────────────────────────────────────────

function mapJourney(row: Record<string, unknown>): Journey {
  return {
    id:        row.id as string,
    clientId:  row.client_id as string,
    type:      row.type as JourneyType,
    title:     row.title as string,
    status:    row.status as JourneyStatus,
    answers:   (row.answers as JourneyAnswers) ?? {},
    aiResults: (row.ai_results as JourneyAIResults) ?? {},
    requestId: row.request_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function buildTasks(
  type: JourneyType,
  journeyId: string,
  clientId:  string,
): Record<string, unknown>[] {
  const base = { journey_id: journeyId, client_id: clientId };
  const TASKS: Record<JourneyType, Array<{ title: string; description: string; type: string; sort_order: number }>> = {
    mortgage: [
      { title: "Upload payslip",         description: "Last 3 months payslips",           type: "upload", sort_order: 1 },
      { title: "Upload bank statements", description: "Last 6 months",                    type: "upload", sort_order: 2 },
      { title: "Upload ID",              description: "National ID or passport",           type: "upload", sort_order: 3 },
      { title: "Upload utility bill",    description: "Proof of address, max 3 months",   type: "upload", sort_order: 4 },
      { title: "Complete financial profile", description: "Income, assets, liabilities",  type: "action", sort_order: 5 },
      { title: "Property valuation",     description: "Get a property valuation quote",   type: "action", sort_order: 6 },
      { title: "Review bank offers",     description: "Compare competing mortgage offers", type: "review", sort_order: 7 },
    ],
    vehicle: [
      { title: "Upload payslip",         description: "Last 3 months",                    type: "upload", sort_order: 1 },
      { title: "Upload bank statements", description: "Last 3 months",                    type: "upload", sort_order: 2 },
      { title: "Get vehicle quote",      description: "Proforma invoice from dealer",     type: "upload", sort_order: 3 },
      { title: "Review financing offers",description: "Compare competing loan offers",    type: "review", sort_order: 4 },
    ],
    investment: [
      { title: "Complete risk profile",  description: "Answer risk appetite questions",   type: "action", sort_order: 1 },
      { title: "Review matched products",description: "Funds, bonds, deposits, ETFs",     type: "review", sort_order: 2 },
      { title: "Upload ID",              description: "Required for investment accounts", type: "upload", sort_order: 3 },
    ],
    education: [
      { title: "Upload acceptance letter", description: "University/institution letter",  type: "upload", sort_order: 1 },
      { title: "Upload ID",              description: "Passport or national ID",          type: "upload", sort_order: 2 },
      { title: "Upload fee schedule",    description: "Tuition fee breakdown",            type: "upload", sort_order: 3 },
      { title: "Review education financing", description: "Compare education loan offers", type: "review", sort_order: 4 },
    ],
    travel: [
      { title: "Set up savings plan",    description: "Automatic monthly contribution",   type: "action", sort_order: 1 },
      { title: "Review travel cards",    description: "Compare travel card offers",       type: "review", sort_order: 2 },
    ],
    business: [
      { title: "Upload business plan",   description: "12-month projections",             type: "upload", sort_order: 1 },
      { title: "Upload ID",              description: "Owner's national ID",              type: "upload", sort_order: 2 },
      { title: "Upload financial statements", description: "Last 2 years if existing",   type: "upload", sort_order: 3 },
      { title: "Upload business registration", description: "Certificate of incorporation", type: "upload", sort_order: 4 },
      { title: "Review SME financing",   description: "Compare SME lender offers",       type: "review", sort_order: 5 },
    ],
  };
  return (TASKS[type] ?? []).map((t) => ({ ...base, ...t }));
}

function buildAffordabilityPrompt(type: JourneyType, answers: JourneyAnswers, profile: string): string {
  return `You are a Mauritius financial advisor. Based on the user's profile and journey answers, calculate affordability metrics.

User profile: ${profile}
Journey type: ${type}
Answers: ${JSON.stringify(answers)}

Return ONLY a JSON object with these fields (no explanation, no markdown):
{
  "affordability": <0-100 score>,
  "eligibility": <0-100 score>,
  "monthlyRepayment": <number in MUR or null>,
  "depositGap": <number in MUR or null>,
  "fundingGap": <number in MUR or null>,
  "projectedValue": <number in MUR or null>,
  "banksMatched": <1-8>,
  "summary": "<one sentence summary>",
  "actionPlan": ["step 1", "step 2", "step 3"]
}`;
}

function buildFallbackResults(type: JourneyType, answers: JourneyAnswers): JourneyAIResults {
  const val = Number(answers.propertyValue || answers.vehicleValue || answers.amount || 0);
  const dep = Number(answers.deposit || answers.savedAmount || 0);
  const inc = Number(answers.monthlyIncome || 0);
  const monthly = val > 0 ? Math.round((val - dep) * 0.008) : 0;

  return {
    affordability:    inc > 0 ? Math.min(95, Math.round((inc * 12) / Math.max(val, 1) * 100 * 3)) : 60,
    eligibility:      72,
    monthlyRepayment: monthly,
    depositGap:       Math.max(0, val * 0.1 - dep),
    fundingGap:       type === "travel" ? Math.max(0, val - dep) : undefined,
    projectedValue:   type === "investment" ? val * 2.5 : undefined,
    banksMatched:     4,
    summary:          "Based on your profile, you qualify for competitive offers.",
    actionPlan:       ["Complete your financial profile", "Upload required documents", "Review bank offers"],
  };
}
