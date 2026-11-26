/**
 * Sign-in OTP routes, served from api/account.ts (no extra Vercel function):
 *
 *   GET  /api/account?op=otp                                   → status + channels for this session
 *   POST /api/account?op=otp { action: "send",   channel }     → sends a code
 *   POST /api/account?op=otp { action: "verify", challengeId, code }
 *
 * The caller is a signed-in but not yet verified session: requireUser(allowUnverifiedOtp).
 * Destinations come from the account (auth email, clients.phone), never from the request,
 * so a stolen password cannot redirect a code to an attacker's phone.
 */
import { randomUUID } from "crypto";
import { Env } from "../env.js";
import { Response } from "../response.js";
import { requireUser, bearerToken } from "../auth.js";
import { getServiceDb } from "../db.js";
import {
  OTP_CHANNELS, type OtpChannel, isChannel, isWellFormedCode, generateCode, hashCode,
  toE164, maskEmail, maskPhone, sessionIdFromToken, clientIp,
} from "../otp/codes.js";
import { channelConfigured, sendCode } from "../otp/senders.js";

type Status = { enforced: boolean; verified: boolean; preferred: OtpChannel | null; ttl_s: number; cooldown_s: number };

type Ctx = { userId: string; sessionId: string; email: string | null; phone: string | null };

async function context(req: any): Promise<Ctx | null> {
  const user = await requireUser(req, { allowUnverifiedOtp: true });
  const sessionId = sessionIdFromToken(bearerToken(req) ?? "");
  if (!sessionId) return null;
  const { data } = await (getServiceDb() as any)
    .from("clients").select("phone").eq("id", user.id).maybeSingle();
  return { userId: user.id, sessionId, email: user.email, phone: toE164(data?.phone ?? null) };
}

function destination(ctx: Ctx, channel: OtpChannel): string | null {
  return channel === "email" ? ctx.email : ctx.phone;
}

function channelList(ctx: Ctx) {
  return OTP_CHANNELS.map((channel) => {
    const to = destination(ctx, channel);
    return {
      channel,
      available: !!to && channelConfigured(channel),
      destination: to ? (channel === "email" ? maskEmail(to) : maskPhone(to)) : null,
      reason: !to ? (channel === "email" ? "no_email" : "no_phone") : channelConfigured(channel) ? null : "not_configured",
    };
  });
}

async function status(ctx: Ctx): Promise<Status> {
  const { data, error } = await (getServiceDb() as any).rpc("otp_status", { p_user: ctx.userId, p_session: ctx.sessionId });
  if (error || !data) throw new Error(`otp_status: ${error?.message ?? "empty"}`);
  return data as Status;
}

export async function handleOtp(req: any, res: any): Promise<void> {
  const ctx = await context(req);
  if (!ctx) return Response.error(res, "Please sign in again.", 401, "NO_SESSION");

  if (req.method === "GET") {
    const s = await status(ctx);
    return Response.ok(res, {
      enforced: s.enforced, verified: s.verified, preferred: s.preferred,
      codeLength: 6, channels: channelList(ctx),
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.action === "send")   return send(ctx, req, res, body.channel);
  if (body.action === "verify") return verify(ctx, res, body.challengeId, body.code);
  return Response.error(res, "Unknown action", 400, "BAD_ACTION");
}

async function send(ctx: Ctx, req: any, res: any, channel: unknown): Promise<void> {
  if (!isChannel(channel)) return Response.error(res, "Choose email, SMS or WhatsApp.", 400, "BAD_CHANNEL");
  const pepper = Env.otpPepper();
  if (pepper.length < 32) {
    console.error("[otp] OTP_PEPPER missing or shorter than 32 chars");
    return Response.error(res, "Sign-in codes are unavailable right now.", 503, "OTP_NOT_CONFIGURED");
  }
  const to = destination(ctx, channel);
  if (!to || !channelConfigured(channel)) {
    return Response.error(res, "That option isn't available for your account.", 400, "CHANNEL_UNAVAILABLE");
  }

  const challengeId = randomUUID();
  const code = generateCode();
  const masked = channel === "email" ? maskEmail(to) : maskPhone(to);
  const db = getServiceDb() as any;

  const { data, error } = await db.rpc("otp_issue", {
    p_challenge_id: challengeId, p_user: ctx.userId, p_session: ctx.sessionId, p_channel: channel,
    p_destination: masked, p_code_hash: hashCode(pepper, challengeId, code), p_ip: clientIp(req),
  });
  if (error) throw new Error(`otp_issue: ${error.message}`);
  const r = data as { ok: boolean; error?: string; retry_in?: number; expires_in?: number; resend_in?: number };
  if (!r.ok) {
    if (r.error === "cooldown")
      return Response.error(res, `Wait ${r.retry_in ?? 30} seconds before asking for a new code.`, 429, "OTP_COOLDOWN");
    if (r.error === "rate_limited")
      return Response.error(res, "Too many codes requested. Try again in 15 minutes.", 429, "OTP_RATE_LIMITED");
    return Response.error(res, "Please sign in again.", 401, "NO_SESSION");
  }

  const sent = await sendCode(channel, to, code, Math.round((r.expires_in ?? 300) / 60));
  if (!sent.ok) {
    console.error(`[otp] ${channel} send failed: ${sent.reason}`);
    await db.rpc("otp_send_failed", { p_challenge_id: challengeId, p_user: ctx.userId });
    return Response.error(res, "We couldn't send the code. Try another option.", 502, "OTP_SEND_FAILED");
  }

  return Response.ok(res, {
    challengeId, channel, destination: masked,
    expiresIn: r.expires_in ?? 300, resendIn: r.resend_in ?? 30,
  });
}

async function verify(ctx: Ctx, res: any, challengeId: unknown, code: unknown): Promise<void> {
  const pepper = Env.otpPepper();
  if (pepper.length < 32) return Response.error(res, "Sign-in codes are unavailable right now.", 503, "OTP_NOT_CONFIGURED");
  if (typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId) || !isWellFormedCode(code)) {
    return Response.error(res, "Enter the 6-digit code.", 400, "BAD_CODE");
  }
  const { data, error } = await (getServiceDb() as any).rpc("otp_verify", {
    p_challenge_id: challengeId, p_user: ctx.userId, p_session: ctx.sessionId,
    p_code_hash: hashCode(pepper, challengeId, code),
  });
  if (error) throw new Error(`otp_verify: ${error.message}`);
  const r = data as { ok: boolean; error?: string; attempts_left?: number };
  if (r.ok) return Response.ok(res, { verified: true });

  switch (r.error) {
    case "invalid_code":
      return Response.error(res,
        `That code isn't right. ${r.attempts_left} ${r.attempts_left === 1 ? "try" : "tries"} left.`, 400, "OTP_INVALID");
    case "expired":
      return Response.error(res, "That code has expired. Ask for a new one.", 400, "OTP_EXPIRED");
    case "locked":
      return Response.error(res, "Too many wrong codes. Ask for a new one.", 400, "OTP_LOCKED");
    default:
      return Response.error(res, "Ask for a new code.", 400, "OTP_NO_ACTIVE_CODE");
  }
}
