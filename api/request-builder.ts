/**
 * api/request-builder.ts
 * ─────────────────────────────────────────────────────────────
 * POST /api/request-builder
 * Streaming SSE endpoint powering the conversational request builder.
 * Intelligence injected from cache — zero extra DB queries per stream.
 */
import Anthropic          from "@anthropic-ai/sdk";
import { Env }            from "./_lib/env.js";
import { IntelligenceService } from "./_lib/intelligence-service.js";
import { Response }       from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

// ── Types ────────────────────────────────────────────────────
type Message    = { role: "user" | "assistant"; content: string };
type ClientProfile = {
  healthScore?:   number | null;
  monthlyIncome?: number | null;
  netWorth?:      number | null;
  employment?:    string | null;
};
type RequestBody = { messages: Message[]; profile?: ClientProfile };

// ── System prompt ────────────────────────────────────────────
const BASE_SYSTEM = `\
You are Ficium's Request Builder — a conversational AI that helps clients in \
Mauritius post financial requests to the Ficium marketplace, where banks and \
fintechs compete with bids.

Collect these fields through natural conversation (one question at a time):
- productType: personal_loan | sme_loan | mortgage | fixed_deposit | \
savings_account | credit_card | business_account | investment_account | \
leasing | overdraft | business_loan
- amount: MUR (minimum 1,000)
- purpose: short description (3–500 chars) — banks see this, not the client's name
- preferredTermMonths: integer 1–360
- maxRate (optional): max acceptable APR %
- decisionDeadline (optional): ISO date string YYYY-MM-DD

Rules:
- One question at a time. Be warm and conversational. Under 80 words per response.
- Use live market data (injected below) to give rate guidance as you collect info.
- When all REQUIRED fields collected, summarise and ask "Shall I post this now?"
- Only after the user confirms (yes/post/go/submit), output EXACTLY on its own line:
  READY:{"productType":"...","amount":0,"purpose":"...","preferredTermMonths":0,"maxRate":null,"decisionDeadline":null}
- Never output READY until user explicitly confirms.
- Never ask for personal identity. Never guarantee approval.`;

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  try { await requireUser(req); }
  catch (e) { if (sendAuthError(res, e)) return; throw e; }

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return Response.error(res, "AI service not configured", 503, "NO_API_KEY");

  const body = req.body as RequestBody;
  if (!body?.messages?.length) {
    return Response.error(res, "messages array required", 400, "INVALID_BODY");
  }

  const messages = body.messages.slice(-30).map((m) => ({
    role:    (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: String(m.content ?? "").slice(0, 3_000),
  }));

  // Build system prompt — intelligence from cache
  let system = BASE_SYSTEM;
  try {
    const summary = await IntelligenceService.getSummary();
    if (summary) system += `\n\n${summary}`;
  } catch { /* degrade gracefully */ }

  // Inject client profile context (never revealed back to client)
  if (body.profile) {
    const p = body.profile;
    system += `\n\nClient context (private):
Health score: ${p.healthScore ?? "unknown"}/100
Monthly income: ${p.monthlyIncome ? `MUR ${p.monthlyIncome.toLocaleString()}` : "unknown"}
Employment: ${p.employment ?? "unknown"}
Use this to suggest suitable products and realistic amounts only.`;
  }

  // Stream response
  Response.sseStart(res);

  try {
    const anthropic = new Anthropic({ apiKey });
    const stream    = await anthropic.messages.stream({
      model:      "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        Response.sseWrite(res, { text: event.delta.text });
      }
    }

    Response.sseDone(res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI temporarily unavailable";
    Response.sseError(res, msg);
  }
}
