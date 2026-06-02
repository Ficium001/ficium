/**
 * api/chat.ts
 * ─────────────────────────────────────────────────────────────
 * POST /api/chat
 * AI Financial Coach — powers the Advisor page.
 * Intelligence injected from cache, not fetched per-request.
 */
import Anthropic          from "@anthropic-ai/sdk";
import { Env }            from "./_lib/env";
import { IntelligenceService } from "./_lib/intelligence-service";
import { Response }       from "./_lib/response";

export const config = { runtime: "nodejs" };

// ── Types ────────────────────────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; content: string };
type RequestBody = { messages?: ChatMessage[] };

// ── System prompt ────────────────────────────────────────────
const BASE_SYSTEM = `\
You are Ficium AI — an intelligent financial coach for clients in Mauritius \
using the Ficium reverse-banking marketplace, where banks and fintechs compete \
with bids for each client's financial request.

You help users:
- Understand and compare financial products (loans, deposits, investments, business funding)
- Make sense of bids they receive
- Improve their financial health score and bank eligibility
- Decide what to post as a request and when
- Understand Mauritian banking products and current rates

Live market data is injected below — always use it for rate benchmarks. \
Cite figures as "current Ficium market data" rather than guessing.

Tone: direct, warm, practical, Mauritius-focused.
Keep responses under 150 words unless the user asks for detail.
Do not: give personalised investment advice, guarantee approvals, \
recommend a specific bank by name unless comparing bids the user has received.`;

// ── Handler ──────────────────────────────────────────────────
export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return Response.error(res, "AI service not configured", 503, "NO_API_KEY");

  const body = req.body as RequestBody;
  if (!body?.messages?.length) {
    return Response.error(res, "messages array required", 400, "INVALID_BODY");
  }

  // Guard: cap payload size
  const totalChars = body.messages.reduce((s, m) => s + (m.content?.length ?? 0), 0);
  if (totalChars > 20_000) {
    return Response.error(res, "Conversation too large", 413, "PAYLOAD_TOO_LARGE");
  }

  // Normalise messages
  const messages = body.messages.slice(-20).map((m) => ({
    role:    (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: String(m.content ?? "").slice(0, 4_000),
  }));

  // Inject live intelligence — from cache, not a fresh DB query
  let system = BASE_SYSTEM;
  try {
    const summary = await IntelligenceService.getSummary();
    if (summary) system += `\n\n${summary}`;
  } catch { /* degrade gracefully — proceed without intelligence */ }

  try {
    const anthropic = new Anthropic({ apiKey });
    const completion = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 700,
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
