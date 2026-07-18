/**
 * api/_kyc/claudeVision.ts
 * ─────────────────────────────────────────────────────────────
 * Structured personal-info extraction off an ID photo via Claude
 * Vision. Rekognition DetectText gives flat, unordered lines of
 * text — fine for pattern-matching a document number (see
 * docExtract.ts's extractNic), but unreliable for semantically
 * labelled fields like name/sex/date of birth, since it can't
 * tell "surname" from a random capitalised word on the card.
 *
 * This is a separate, purpose-built call from verify.ts's
 * claudeAnalyzeOcr (which does fraud reasoning, not extraction) —
 * different concern, kept apart on purpose.
 */

import { Env } from "../_lib/env.js";

export interface ClaudeIdFields {
  documentNumber?: string;
  surname?:        string;
  firstName?:      string;
  sex?:             "M" | "F";
  dateOfBirth?:    string; // YYYY-MM-DD
  confidence:      "high" | "medium" | "low";
}

const EMPTY: ClaudeIdFields = { confidence: "low" };

export async function extractIdFields(idB64: string): Promise<ClaudeIdFields> {
  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return EMPTY;

  const prompt = `This is a photo of a government-issued identity document (Mauritius National Identity Card or a passport). Read the printed fields carefully and reply ONLY with JSON, no markdown, no commentary:
{"documentNumber":"...or null","surname":"...or null","firstName":"...or null","sex":"M or F or null","dateOfBirth":"YYYY-MM-DD or null","confidence":"high or medium or low"}
Rules:
- documentNumber: the ID/NIC card number or passport number exactly as printed.
- surname / firstName: exactly as printed, do not guess spelling.
- sex: only M or F if explicitly printed on the card, otherwise null.
- dateOfBirth: convert to YYYY-MM-DD if a date of birth is printed, otherwise null.
- confidence "low" if the photo is blurry, cropped, glare-obscured, or any field is uncertain.
- Use null for any field you cannot read with confidence. Never fabricate a value.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: idB64 } },
            { type: "text",  text: prompt },
          ],
        }],
      }),
    });
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Anthropic API ${r.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await r.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content.find(c => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Record<string, unknown>;

    const sexRaw = typeof parsed.sex === "string" ? parsed.sex.toUpperCase() : null;
    return {
      documentNumber: typeof parsed.documentNumber === "string" ? parsed.documentNumber : undefined,
      surname:        typeof parsed.surname        === "string" ? parsed.surname        : undefined,
      firstName:      typeof parsed.firstName       === "string" ? parsed.firstName       : undefined,
      sex:            sexRaw === "M" || sexRaw === "F" ? sexRaw : undefined,
      dateOfBirth:    typeof parsed.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateOfBirth) ? parsed.dateOfBirth : undefined,
      confidence:     (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low") ? parsed.confidence : "low",
    };
  } catch (err) {
    console.error("[kyc claudeVision] error:", err instanceof Error ? err.message : String(err));
    return EMPTY;
  }
}
