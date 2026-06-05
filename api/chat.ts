/**
 * api/chat.ts
 * POST /api/chat
 * Ficium AI Financial Coach — with real user profile context.
 * Uses direct Supabase REST fetch (no getServiceDb import) to stay
 * compatible with Vercel's node16 moduleResolution for api/ routes.
 */
import Anthropic              from "@anthropic-ai/sdk";
import { Env }                from "./_lib/env";
import { IntelligenceService } from "./_lib/intelligence-service";
import { Response }           from "./_lib/response";

export const config = { runtime: "nodejs" };

type ChatMessage = { role: "user" | "assistant"; content: string };
type RequestBody = {
  messages?:   ChatMessage[];
  userId?:     string;
  journeyCtx?: string;
};

// ── Fetch user profile via Supabase REST (no SDK import needed) ──
async function fetchUserProfile(userId: string): Promise<Record<string, unknown> | null> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key || !userId) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/client_profile_view?user_id=eq.${userId}&limit=1`,
      {
        headers: {
          "apikey":        key,
          "Authorization": `Bearer ${key}`,
          "Content-Type":  "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json() as Record<string, unknown>[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Build system prompt with user context ────────────────────
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
Always be specific: cite real figures from their profile when available.
Do not: guarantee approvals, recommend a specific bank by name unless comparing bids received.`;

  const parts: string[] = [BASE];

  // Live market intelligence
  try {
    const summary = await IntelligenceService.getSummary();
    if (summary) parts.push(`\n${summary}`);
  } catch { /* degrade gracefully */ }

  // User financial profile
  if (userId) {
    const p = await fetchUserProfile(userId);
    if (p) {
      const fmt = (n: unknown) => n ? `MUR ${Number(n).toLocaleString()}` : "not provided";
      const pct  = (n: unknown) => n != null ? `${n}%` : "not calculated";
      parts.push([
        "\n=== THIS USER'S FINANCIAL PROFILE ===",
        `Name: ${p.full_name ?? "Unknown"}`,
        `Employment: ${p.employment_status ?? "not provided"}`,
        `Monthly income: ${fmt(p.monthly_income)}`,
        `Monthly expenses: ${fmt(p.monthly_expenses)}`,
        `Monthly loan payments: ${fmt(p.monthly_loan_payments)}`,
        `Monthly savings: ${fmt(p.monthly_savings)}`,
        `Total assets: ${fmt(p.total_assets)}`,
        `  Cash & savings: ${fmt(p.cash_savings)}`,
        `  Fixed deposits: ${fmt(p.fixed_deposits)}`,
        `  Investments: ${fmt(p.investments_value)}`,
        `  Property: ${fmt(p.property_value)}`,
        `  Vehicles: ${fmt(p.vehicle_value)}`,
        `Total liabilities: ${fmt(p.total_liabilities)}`,
        `  Mortgage: ${fmt(p.mortgage_balance)}`,
        `  Personal loans: ${fmt(p.personal_loan_balance)}`,
        `  Credit cards: ${fmt(p.credit_card_balance)}`,
        `Net worth: ${fmt(p.net_worth ?? p.total_net_worth)}`,
        `Debt-to-income ratio: ${p.debt_to_income_ratio != null ? `${p.debt_to_income_ratio}%` : "not calculated"}`,
        `Financial health score: ${pct(p.health_score)}`,
        `Bank readiness: ${pct(p.affordability_score)}`,
        `KYC status: ${p.kyc_status ?? "pending"}`,
        `Has existing loans: ${p.has_existing_loans ? "Yes" : "No"}`,
        "=== END OF USER PROFILE ===",
        "Use these exact numbers. Be specific and personal.",
      ].join("\n"));
    }
  }

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
