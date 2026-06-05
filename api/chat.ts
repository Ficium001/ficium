/**
 * api/chat.ts
 * POST /api/chat
 * Ficium AI Financial Coach — now with full user profile context.
 * Claude knows exactly who the user is, their finances, and their journeys.
 */
import Anthropic              from "@anthropic-ai/sdk";
import { Env }                from "./_lib/env.js";
import { IntelligenceService } from "./_lib/intelligence-service.js";
import { Response }           from "./_lib/response.js";
import { getServiceDb }       from "./_lib/db.js";

export const config = { runtime: "nodejs" };

type ChatMessage = { role: "user" | "assistant"; content: string };
type RequestBody = {
  messages?:   ChatMessage[];
  userId?:     string;   // optional — injected by client when available
  journeyCtx?: string;  // optional — journey-specific context
};

// ── Build user-aware system prompt ───────────────────────────
async function buildSystemPrompt(userId?: string, journeyCtx?: string): Promise<string> {
  const BASE = `\
You are Ficium AI — an intelligent personal financial coach for clients in Mauritius \
using the Ficium reverse-banking marketplace, where banks compete with bids for \
each client's financial request.

You help users:
- Understand their personal financial situation with real numbers
- Plan and achieve specific financial goals (home, vehicle, investment, education, travel, business)
- Compare financial products and bank offers
- Improve their financial health score and bank eligibility
- Make smart decisions about borrowing, saving, and investing
- Understand Mauritian banking products and current market rates

Tone: warm, direct, practical, specific. Use the user's real numbers — never guess.
Keep responses under 200 words unless the user asks for detail.
Always be specific: "Your debt-to-income ratio is 45% — above the 40% threshold banks prefer" \
is better than "Your debt ratio is high."
Do not: guarantee approvals, recommend a specific bank by name unless comparing bids received, \
give advice that requires a licensed financial advisor.`;

  const parts: string[] = [BASE];

  // ── Inject live market intelligence ──────────────────────
  try {
    const marketSummary = await IntelligenceService.getSummary();
    if (marketSummary) parts.push(`\n${marketSummary}`);
  } catch { /* degrade gracefully */ }

  // ── Inject user financial profile ────────────────────────
  if (userId) {
    try {
      const db = getServiceDb();
      const { data: profile } = await db
        .from("client_profile_view")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const fmt = (n: number | null) => n ? `MUR ${Number(n).toLocaleString()}` : "not provided";
        const pct  = (n: number | null) => n != null ? `${n}%` : "not calculated";

        const profileSection = [
          "\n=== THIS USER'S FINANCIAL PROFILE ===",
          `Name: ${profile.full_name ?? "Unknown"}`,
          `Employment: ${profile.employment_status ?? "not provided"}`,
          `Monthly income: ${fmt(profile.monthly_income)}`,
          `Monthly expenses: ${fmt(profile.monthly_expenses)}`,
          `Monthly loan payments: ${fmt(profile.monthly_loan_payments)}`,
          `Monthly savings: ${fmt(profile.monthly_savings)}`,
          "",
          `Total assets: ${fmt(profile.total_assets)}`,
          `  - Cash & savings: ${fmt(profile.cash_savings)}`,
          `  - Fixed deposits: ${fmt(profile.fixed_deposits)}`,
          `  - Investments: ${fmt(profile.investments_value)}`,
          `  - Property: ${fmt(profile.property_value)}`,
          `  - Vehicles: ${fmt(profile.vehicle_value)}`,
          "",
          `Total liabilities: ${fmt(profile.total_liabilities)}`,
          `  - Mortgage: ${fmt(profile.mortgage_balance)}`,
          `  - Personal loans: ${fmt(profile.personal_loan_balance)}`,
          `  - Credit cards: ${fmt(profile.credit_card_balance)}`,
          `  - Vehicle loans: ${fmt(profile.vehicle_loan_balance)}`,
          "",
          `Net worth: ${fmt(profile.net_worth ?? profile.total_net_worth)}`,
          `Debt-to-income ratio: ${profile.debt_to_income_ratio != null ? `${profile.debt_to_income_ratio}%` : "not calculated"}`,
          "",
          `Financial health score: ${pct(profile.health_score)} ${profile.health_score != null ? (profile.health_score >= 70 ? "(Good)" : profile.health_score >= 50 ? "(Fair)" : "(Needs improvement)") : ""}`,
          `Bank readiness score: ${pct(profile.affordability_score)}`,
          `KYC status: ${profile.kyc_status ?? "pending"}`,
          `Has existing loans: ${profile.has_existing_loans ? "Yes" : "No"}`,
          `Profile completion: ${profile.completion_percent ?? 20}%`,
          "=== END OF USER PROFILE ===",
          "Use these exact numbers in your responses. Be specific and personal.",
        ];
        parts.push(profileSection.join("\n"));
      }
    } catch { /* degrade gracefully — answer without profile */ }
  }

  // ── Inject journey context if provided ───────────────────
  if (journeyCtx) {
    parts.push(`\n=== CURRENT JOURNEY CONTEXT ===\n${journeyCtx}\n=== END ===`);
  }

  return parts.join("\n");
}

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return Response.error(res, "AI service not configured", 503, "NO_API_KEY");

  const body = req.body as RequestBody;
  if (!body?.messages?.length) {
    return Response.error(res, "messages array required", 400, "INVALID_BODY");
  }

  const totalChars = body.messages.reduce((s, m) => s + (m.content?.length ?? 0), 0);
  if (totalChars > 20_000) {
    return Response.error(res, "Conversation too large", 413, "PAYLOAD_TOO_LARGE");
  }

  const messages = body.messages.slice(-20).map((m) => ({
    role:    (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: String(m.content ?? "").slice(0, 4_000),
  }));

  const system = await buildSystemPrompt(body.userId, body.journeyCtx);

  try {
    const anthropic  = new Anthropic({ apiKey });
    const completion = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      messages,
    });

    const reply = completion.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    return Response.ok(res, {
      reply,
      usage: {
        input_tokens:  completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI temporarily unavailable";
    return Response.error(res, msg, 503, "AI_ERROR");
  }
}
