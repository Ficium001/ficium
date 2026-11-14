/**
 * Per-user daily cap on paid AI calls. One atomic database call (public.consume_ai_quota,
 * service_role only) both counts and checks, so parallel requests cannot overshoot.
 *
 * Fails CLOSED: if the counter can't be reached, the AI call doesn't happen. An unmetered
 * Claude call is the thing this exists to prevent.
 */
import { Env } from "./env.js";

export type AiKind = "chat" | "market";

/** Calls per user per Mauritius day. Generous for real use, small for abuse. */
export const DAILY_LIMIT: Record<AiKind, number> = { chat: 60, market: 120 };

export type QuotaResult = { allowed: true } | { allowed: false; reason: "limit" | "unavailable" };

export async function consumeAiQuota(
  clientId: string,
  kind: AiKind,
  f: typeof fetch = fetch,
): Promise<QuotaResult> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key || !clientId) return { allowed: false, reason: "unavailable" };
  try {
    const r = await f(`${url}/rest/v1/rpc/consume_ai_quota`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_client_id: clientId, p_kind: kind, p_daily_limit: DAILY_LIMIT[kind] }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) {
      console.error(`[ai-quota] counter answered ${r.status}`);
      return { allowed: false, reason: "unavailable" };
    }
    const out = (await r.json()) as { allowed?: boolean };
    return out.allowed === true ? { allowed: true } : { allowed: false, reason: "limit" };
  } catch (e) {
    console.error("[ai-quota] counter unreachable:", e instanceof Error ? e.message : e);
    return { allowed: false, reason: "unavailable" };
  }
}

/** The HTTP answer for a refused call. */
export function quotaRefusal(q: Exclude<QuotaResult, { allowed: true }>): { status: number; code: string; message: string } {
  return q.reason === "limit"
    ? { status: 429, code: "DAILY_LIMIT", message: "You've reached today's limit for this feature. It resets at midnight." }
    : { status: 503, code: "QUOTA_UNAVAILABLE", message: "This feature is briefly unavailable. Try again shortly." };
}
