/**
 * api/market.ts
 * ─────────────────────────────────────────────────────────────
 * Single serverless function handling all Markets AI endpoints.
 * Merged from market-ask.ts + market-summary.ts to stay within
 * Vercel Hobby plan's 12-function limit.
 *
 * Routes (via ?action= query param):
 *   POST /api/market?action=summary  → streaming one-line market summary
 *   POST /api/market?action=ask      → streaming Q&A grounded in live data
 */
import Anthropic          from "@anthropic-ai/sdk";
import { Env }            from "./_lib/env.js";
import { Response as R }  from "./_lib/response.js";

export const config = { runtime: "nodejs" };

// ── Shared system prompts ────────────────────────────────────────────────────

const SUMMARY_SYSTEM = `\
You are Ficium AI — a concise financial commentator for Mauritius.
Given today's market snapshot, write ONE sentence (max 25 words) that summarises
the most important thing for an ordinary Mauritian to know right now.
Plain English. No jargon. No bullet points. No preamble. Just the one sentence.
Examples:
- "Rates are stable — a good week to lock in a home loan before the next BOM review."
- "The rupee weakened today — imported goods cost more, but your USD savings are worth more rupees."
- "Markets rose strongly — if you have a pension or unit trust, your balance likely grew today."`;

const ASK_SYSTEM = `\
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

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "POST") return R.methodNotAllowed(res, ["POST"]);

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return R.error(res, "AI not configured", 503, "NO_API_KEY");

  const action = (req.query?.action as string) ?? "";

  // ── Summary ────────────────────────────────────────────────────────────────
  if (action === "summary") {
    const snap = req.body;
    if (!snap?.repoRate) return R.error(res, "market snapshot required", 400, "MISSING_DATA");

    const userPrompt = `Today's Mauritius market snapshot:
- Repo rate: ${snap.repoRate}
- USD/MUR: ${snap.usdMur} (${snap.usdChange > 0 ? "+" : ""}${snap.usdChange}%)
- EUR/MUR: ${snap.eurMur}
- GBP/MUR: ${snap.gbpMur}
- SEMDEX: ${snap.semdex} (${snap.semdexChange > 0 ? "+" : ""}${snap.semdexChange}%)
- Inflation (YoY): ${snap.inflation} (${snap.inflationChange > 0 ? "+" : ""}${snap.inflationChange}%)

Write the one-sentence summary now.`;

    R.sseStart(res);
    try {
      const anthropic = new Anthropic({ apiKey });
      const stream = anthropic.messages.stream({
        model: "claude-haiku-4-5-20251001", max_tokens: 80,
        system: SUMMARY_SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta")
          R.sseWrite(res, { text: event.delta.text });
      }
      R.sseDone(res);
    } catch (e: unknown) {
      R.sseError(res, e instanceof Error ? e.message : "AI error");
    }
    return;
  }

  // ── Ask ────────────────────────────────────────────────────────────────────
  if (action === "ask") {
    const body = req.body;
    if (!body?.question?.trim()) return R.error(res, "question required", 400, "MISSING_QUESTION");

    const snapLines = Object.entries(body.snapshot ?? {})
      .map(([k, v]) => `- ${k}: ${v}`).join("\n");
    const userContent = `Live market data right now:\n${snapLines}\n\nMy question: ${body.question.trim()}`;
    const history = (body.history ?? []).slice(-6)
      .map((m: { role: string; content: unknown }) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

    R.sseStart(res);
    try {
      const anthropic = new Anthropic({ apiKey });
      const stream = anthropic.messages.stream({
        model: "claude-haiku-4-5-20251001", max_tokens: 300,
        system: ASK_SYSTEM,
        messages: [...history, { role: "user" as const, content: userContent }],
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta")
          R.sseWrite(res, { text: event.delta.text });
      }
      R.sseDone(res);
    } catch (e: unknown) {
      R.sseError(res, e instanceof Error ? e.message : "AI error");
    }
    return;
  }

  return R.error(res, "unknown action — use ?action=summary or ?action=ask", 400, "BAD_ACTION");
}
