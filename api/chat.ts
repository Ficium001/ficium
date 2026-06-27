/**
 * api/chat.ts
 * POST /api/chat                          → AI Financial Coach (advisor)
 * POST /api/chat?action=journey-calculate → Journey affordability calculator
 *
 * Merged to stay within Vercel Hobby plan 12-function limit.
 * Routes via ?action= query param.
 */
import Anthropic              from "@anthropic-ai/sdk";
import { Env }                from "./_lib/env.js";
import { IntelligenceService } from "./_lib/intelligence-service.js";
import { Response }           from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatBody = {
  messages?:   ChatMessage[];
  userId?:     string;
  journeyCtx?: string;
};
type JourneyBody = {
  userId:  string;
  type:    string;
  answers: Record<string, unknown>;
};

// ── Shared: fetch user profile via Supabase REST ──────────────
async function fetchProfile(userId: string): Promise<Record<string, unknown> | null> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key || !userId) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/client_profile_view?user_id=eq.${userId}&limit=1`,
      { headers: { "apikey": key, "Authorization": `Bearer ${key}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json() as Record<string, unknown>[];
    return rows[0] ?? null;
  } catch { return null; }
}

function fmtProfile(p: Record<string, unknown>): string {
  const fmt = (n: unknown) => n ? `MUR ${Number(n).toLocaleString()}` : "not provided";
  return [
    `Name: ${p.full_name ?? "Unknown"}`,
    `Employment: ${p.employment_status ?? "not provided"}`,
    `Monthly income: ${fmt(p.monthly_income)}`,
    `Monthly expenses: ${fmt(p.monthly_expenses)}`,
    `Monthly loan payments: ${fmt(p.monthly_loan_payments)}`,
    `Monthly savings: ${fmt(p.monthly_savings)}`,
    `Total assets: ${fmt(p.total_assets)} (cash: ${fmt(p.cash_savings)}, deposits: ${fmt(p.fixed_deposits)}, investments: ${fmt(p.investments_value)}, property: ${fmt(p.property_value)})`,
    `Total liabilities: ${fmt(p.total_liabilities)} (mortgage: ${fmt(p.mortgage_balance)}, personal loans: ${fmt(p.personal_loan_balance)}, credit cards: ${fmt(p.credit_card_balance)})`,
    `Net worth: ${fmt(p.net_worth ?? p.total_net_worth)}`,
    `Debt-to-income ratio: ${p.debt_to_income_ratio != null ? `${p.debt_to_income_ratio}%` : "not calculated"}`,
    `Health score: ${p.health_score != null ? `${p.health_score}/100` : "not calculated"}`,
    `Bank readiness: ${p.affordability_score != null ? `${p.affordability_score}%` : "not calculated"}`,
    `KYC: ${p.kyc_status ?? "pending"} | Existing loans: ${p.has_existing_loans ? "Yes" : "No"}`,
  ].join("\n");
}

// ── Route 1: AI Coach ─────────────────────────────────────────
async function handleChat(body: ChatBody, apiKey: string, res: any): Promise<void> {
  if (!body?.messages?.length) {
    return Response.error(res, "messages array required", 400, "INVALID_BODY");
  }

  const totalChars = body.messages.reduce((s, m) => s + (m.content?.length ?? 0), 0);
  if (totalChars > 20_000) return Response.error(res, "Conversation too large", 413, "PAYLOAD_TOO_LARGE");

  const messages = body.messages.slice(-20).map((m) => ({
    role:    (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: String(m.content ?? "").slice(0, 4_000),
  }));

  // Build system prompt
  const parts: string[] = [`\
You are Ficium AI — an intelligent personal financial coach for clients in Mauritius \
using the Ficium reverse-banking marketplace, where banks compete with bids for each \
client's financial request. You help users understand their finances, plan goals, compare \
products, and improve their eligibility. Be specific — use their real numbers. \
Keep responses under 200 words unless asked for detail. Tone: warm, direct, practical.`];

  try {
    const mkt = await IntelligenceService.getSummary();
    if (mkt) parts.push(`\n${mkt}`);
  } catch { /* degrade */ }

  if (body.userId) {
    const p = await fetchProfile(body.userId);
    if (p) parts.push(`\n=== USER FINANCIAL PROFILE ===\n${fmtProfile(p)}\n=== END ===\nUse these exact numbers. Be personal and specific.`);
  }

  if (body.journeyCtx) parts.push(`\n=== JOURNEY CONTEXT ===\n${body.journeyCtx}\n=== END ===`);

  const anthropic  = new Anthropic({ apiKey });
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 800,
    system: parts.join("\n"), messages,
  });

  const reply = completion.content.map((c) => c.type === "text" ? c.text : "").join("").trim();
  // Flat shape — client reads data.reply / data.usage directly (not nested under data.data)
  res.status(200).json({ reply, usage: { input_tokens: completion.usage.input_tokens, output_tokens: completion.usage.output_tokens } });
}

// ── Route 2: Journey affordability calculator ─────────────────
async function handleJourneyCalculate(body: JourneyBody, apiKey: string, res: any): Promise<void> {
  const { userId, type, answers } = body;
  if (!userId || !type || !answers) return Response.error(res, "userId, type, answers required", 400, "INVALID_BODY");

  const p = await fetchProfile(userId);
  const profileCtx = p ? fmtProfile(p) : "Profile: not available.";

  const prompt = `You are a Mauritius financial analyst. Calculate precise affordability metrics.

User profile: ${profileCtx}

Journey type: ${type}
User answers: ${JSON.stringify(answers)}

Mauritius context: Mortgage 4.5-7% APR 25yr max 80% LTV. Vehicle 7-10% APR 7yr. Personal 8-14% APR 7yr.
Banks prefer DTI < 40%. Monthly repayments should not exceed 40% of net income.
Deposit typically 10-20% for mortgage/vehicle.

Return ONLY valid JSON (no markdown):
{"affordability":<0-100>,"eligibility":<0-100>,"monthlyRepayment":<number|null>,"depositGap":<number|null>,"fundingGap":<number|null>,"projectedValue":<number|null>,"banksMatched":<1-6>,"summary":"<one sentence with real numbers>","actionPlan":["<step 1>","<step 2>","<step 3>"],"warnings":[]}`;

  const anthropic  = new Anthropic({ apiKey });
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text  = completion.content.map((c) => c.type === "text" ? c.text : "").join("").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return Response.error(res, "Invalid AI response", 500, "AI_PARSE_ERROR");

  return Response.ok(res, JSON.parse(match[0]));
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  try { await requireUser(req); }
  catch (e) { if (sendAuthError(res, e)) return; throw e; }

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return Response.error(res, "AI service not configured", 503, "NO_API_KEY");

  const action = (req.query?.action as string) ?? "";

  try {
    if (action === "journey-calculate") {
      return await handleJourneyCalculate(req.body as JourneyBody, apiKey, res);
    }
    return await handleChat(req.body as ChatBody, apiKey, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI temporarily unavailable";
    return Response.error(res, msg, 503, "AI_ERROR");
  }
}
