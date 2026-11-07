/**
 * Recent sign-in check for irreversible actions (closing an account).
 *
 * Supabase access tokens carry an `amr` claim: how and when the user
 * authenticated, e.g. [{ method: "password", timestamp: 1730000000 }]. It keeps
 * the original sign-in time across token refreshes, so a long-lived session
 * cannot pass for a fresh password entry.
 *
 * Only call this on a token that requireUser() has already accepted: the
 * signature is checked there, not here.
 */
export const RECENT_PASSWORD_MAX_AGE_S = 5 * 60;

export function passwordEnteredRecently(
  token: string,
  nowSec: number = Math.floor(Date.now() / 1000),
  maxAgeSec: number = RECENT_PASSWORD_MAX_AGE_S,
): boolean {
  const payload = decodePayload(token);
  const amr = payload?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    if (!entry || typeof entry !== "object") return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return method === "password"
      && typeof timestamp === "number"
      && timestamp <= nowSec + 30            // small clock skew allowance
      && nowSec - timestamp <= maxAgeSec;
  });
}

function decodePayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = Buffer.from(part, "base64url").toString("utf8");
    const value: unknown = JSON.parse(json);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
