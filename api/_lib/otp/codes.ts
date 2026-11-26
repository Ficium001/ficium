/**
 * Sign-in OTP primitives: code generation, hashing, destinations.
 * Pure functions — no I/O — so every rule here is unit-tested.
 */
import { createHmac, randomInt } from "crypto";

export type OtpChannel = "email" | "sms" | "whatsapp";
export const OTP_CHANNELS: readonly OtpChannel[] = ["email", "sms", "whatsapp"];
export const OTP_LENGTH = 6;

export function isChannel(v: unknown): v is OtpChannel {
  return typeof v === "string" && (OTP_CHANNELS as readonly string[]).includes(v);
}

/** Uniform 6-digit code from the CSPRNG (randomInt has no modulo bias). */
export function generateCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export function isWellFormedCode(v: unknown): v is string {
  return typeof v === "string" && /^\d{6}$/.test(v);
}

/**
 * HMAC-SHA256(pepper, "<challengeId>:<code>") as a Postgres bytea hex literal.
 * Binding the challenge id means a hash is useless for any other challenge, and the pepper
 * (a server secret, never in the DB) means a DB leak does not let anyone brute-force 10^6 codes.
 */
export function hashCode(pepper: string, challengeId: string, code: string): string {
  return "\\x" + createHmac("sha256", pepper).update(`${challengeId}:${code}`).digest("hex");
}

/**
 * Normalises a borrower's phone to E.164, or null if it cannot be one.
 * Mauritian numbers are commonly stored without the country code (8 digits, mobiles start with 5).
 */
export function toE164(raw: string | null | undefined, defaultCountry = "230"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  if (!plus) {
    if (digits.length === 8) digits = defaultCountry + digits;
    else if (!(digits.startsWith(defaultCountry) && digits.length === defaultCountry.length + 8)) return null;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

/** "kishan.jeebun@ficium.net" → "k•••••••••••@ficium.net" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  return `${local[0]}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

/** "+23057123456" → "+230 •••• 3456" */
export function maskPhone(e164: string): string {
  const last = e164.slice(-4);
  const cc = e164.startsWith("+230") ? "+230" : e164.slice(0, 3);
  return `${cc} •••• ${last}`;
}

/** Supabase access tokens carry the auth session id. Only read it after requireUser() accepted the token. */
export function sessionIdFromToken(token: string): string | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { session_id?: unknown };
    const sid = payload?.session_id;
    return typeof sid === "string" && /^[0-9a-f-]{36}$/i.test(sid) ? sid : null;
  } catch {
    return null;
  }
}

/** First hop of x-forwarded-for (Vercel sets it), else null. Used only for rate limiting. */
export function clientIp(req: any): string | null {
  const xff = String(req.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim();
  const ip = xff || String(req.headers?.["x-real-ip"] ?? "").trim();
  return /^[0-9a-f.:]{3,45}$/i.test(ip) ? ip : null;
}
