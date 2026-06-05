/**
 * api/market-ask.ts
 * ─────────────────────────────────────────────────────────────
 * POST /api/market-ask
 * Streams an AI answer to a user question about the markets,
 * grounded in live Mauritius market data injected at call time.
 *
 * Used by: AiMarketChat component (Markets page)
 * Model: claude-haiku-4-5-20251001 (fast responses, low cost)
 * Cost: ~$0.002 per Q&A exchange.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Env }   from "./_lib/env";
import { Response as R } from "./_lib/response";

export const config = { runtime: "nodejs" };

interface RequestBody {
  question:   string;
  snapshot:   Record<string, string | number>;
  history?:   { role: "user" | "assistant"; content: string }[];
}

const SYSTEM = `\
You are Ficium AI — a friendly, knowledgeable financial assistant for everyday
Mauritians using the Ficium reverse-banking marketplace.

Your job on the Markets page is to answer questions about:
- What market moves mean in plain English ("What does it mean if USD/MUR goes up?")
- Whether now is a good time to borrow, save, or exchange currency
- How Mauritius market data compares to historical norms
- How any market number affects someone's loan, savings, or pension

Rules:
- Max 80 words per answer unless the user asks for more detail.
- Plain English first. If the user seems financially literate, match their level.
- Always ground your answer in the live snapshot data provided.
- Never recommend a specific bank. Never guarantee returns or approvals.
- If a question is outside markets (e.g. account issues), gently redirect.
- Mauritius context always: MUR, BOM, SEM, FSC, local cost of living.

Live market data is injected in the user message.`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return R.methodNotAllowed(res, ["POST"]);

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return R.error(res, "AI not configured", 503, "NO_API_KEY");

  const body = req.body as RequestBody;
  if (!body?.question?.trim()) return R.error(res, "question required", 400, "MISSING_QUESTION");

  // Build context-rich user message
  const snapLines = Object.entries(body.snapshot ?? {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const userContent = `Live market data right now:\n${snapLines}\n\nMy question: ${body.question.trim()}`;

  // Retain last 6 turns of history for context without bloating cost
  const history = (body.history ?? [])
    .slice(-6)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  const messages = [
    ...history,
    { role: "user" as const, content: userContent },
  ];

  R.sseStart(res);

  try {
    const anthropic = new Anthropic({ apiKey });
    const stream = anthropic.messages.stream({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:     SYSTEM,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        R.sseWrite(res, { text: event.delta.text });
      }
    }
    R.sseDone(res);
  } catch (e: unknown) {
    R.sseError(res, e instanceof Error ? e.message : "AI error");
  }
}
