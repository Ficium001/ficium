/**
 * api/market-summary.ts
 * ─────────────────────────────────────────────────────────────
 * POST /api/market-summary
 * Streams an AI-generated plain-English market summary based on
 * current Mauritius market data passed in the request body.
 *
 * Used by: RatesSummaryBar (Markets page)
 * Model: claude-haiku-4-5-20251001 (fast, cheap — summary is short)
 * Cost: ~$0.0005 per call. Cached client-side for 30 min.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Env }   from "./_lib/env";
import { Response as R } from "./_lib/response";

export const config = { runtime: "nodejs" };

interface MarketSnapshot {
  repoRate:       string;
  usdMur:         string;
  eurMur:         string;
  gbpMur:         string;
  semdex:         string;
  inflation:      string;
  usdChange:      number;
  semdexChange:   number;
  inflationChange:number;
}

const SYSTEM = `\
You are Ficium AI — a concise financial commentator for Mauritius.
Given today's market snapshot, write ONE sentence (max 25 words) that summarises
the most important thing for an ordinary Mauritian to know right now.
Plain English. No jargon. No bullet points. No preamble. Just the one sentence.
Examples:
- "Rates are stable — a good week to lock in a home loan before the next BOM review."
- "The rupee weakened today — imported goods cost more, but your USD savings are worth more rupees."
- "Markets rose strongly — if you have a pension or unit trust, your balance likely grew today."`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return R.methodNotAllowed(res, ["POST"]);

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return R.error(res, "AI not configured", 503, "NO_API_KEY");

  const snap = req.body as MarketSnapshot;
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
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system:     SYSTEM,
      messages:   [{ role: "user", content: userPrompt }],
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
