/**
 * Delivery of sign-in codes: email (Resend), SMS and WhatsApp (Twilio).
 *
 * Twilio env:
 *   TWILIO_ACCOUNT_SID            AC…
 *   TWILIO_API_KEY_SID / _SECRET  SK… + secret (an API key, not the account auth token)
 *   TWILIO_SMS_FROM               MG… messaging service (preferred) or +E.164 / alphanumeric sender
 *   TWILIO_WHATSAPP_FROM          +E.164 of the approved WhatsApp sender
 *   TWILIO_WHATSAPP_CONTENT_SID   HX… approved "authentication" template, variable {{1}} = code
 * Email env: RESEND_API_KEY, OTP_EMAIL_FROM (a verified Resend domain, e.g. "Ficium <security@ficium.net>")
 *
 * A channel whose settings are missing is reported unavailable and never offered to the user.
 * Codes are never logged.
 */
import { Env } from "../env.js";
import type { OtpChannel } from "./codes.js";

export type SendResult = { ok: true } | { ok: false; reason: string };

export function channelConfigured(channel: OtpChannel): boolean {
  switch (channel) {
    case "email":    return !!Env.resendApiKey();
    case "sms":      return twilioReady() && !!Env.twilioSmsFrom();
    case "whatsapp": return twilioReady() && !!Env.twilioWhatsappFrom() && !!Env.twilioWhatsappContentSid();
  }
}

function twilioReady(): boolean {
  return !!(Env.twilioAccountSid() && Env.twilioApiKeySid() && Env.twilioApiKeySecret());
}

export async function sendCode(channel: OtpChannel, to: string, code: string, ttlMin: number): Promise<SendResult> {
  try {
    switch (channel) {
      case "email":    return await sendEmail(to, code, ttlMin);
      case "sms":      return await sendSms(to, code, ttlMin);
      case "whatsapp": return await sendWhatsapp(to, code);
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send_error" };
  }
}

/* ── Email ──────────────────────────────────────────────────────────────── */

async function sendEmail(to: string, code: string, ttlMin: number): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Env.resendApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Env.otpEmailFrom(),
      to: [to],
      subject: `${code} is your Ficium sign-in code`,
      text: `Your Ficium sign-in code is ${code}.\n\nIt expires in ${ttlMin} minutes. If you did not try to sign in, change your password now. Ficium will never ask you for this code.`,
      html: emailHtml(code, ttlMin),
    }),
  });
  return res.ok ? { ok: true } : { ok: false, reason: `resend_${res.status}` };
}

function emailHtml(code: string, ttlMin: number): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:'Inter Tight',-apple-system,Segoe UI,sans-serif;color:#0A0A1A">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="100%" style="max-width:480px;background:#fff;border:1px solid #E7E3DA;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px">
<div style="font-weight:700;font-size:18px;color:#3536DC;margin-bottom:24px">Ficium</div>
<div style="font-size:16px;margin-bottom:16px">Your sign-in code:</div>
<div style="font-size:34px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,monospace;margin-bottom:24px">${code}</div>
<div style="font-size:14px;color:#5B5B6E;line-height:1.5">It expires in ${ttlMin} minutes. If you did not try to sign in, change your password now. Ficium will never ask you for this code.</div>
</td></tr></table></td></tr></table></body></html>`;
}

/* ── Twilio ─────────────────────────────────────────────────────────────── */

async function twilioMessage(params: Record<string, string>): Promise<SendResult> {
  const sid = Env.twilioAccountSid();
  const auth = Buffer.from(`${Env.twilioApiKeySid()}:${Env.twilioApiKeySecret()}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({})) as { code?: number };
  return { ok: false, reason: `twilio_${res.status}_${body.code ?? "?"}` };
}

function fromParam(from: string): Record<string, string> {
  return from.startsWith("MG") ? { MessagingServiceSid: from } : { From: from };
}

async function sendSms(to: string, code: string, ttlMin: number): Promise<SendResult> {
  return twilioMessage({
    ...fromParam(Env.twilioSmsFrom()),
    To: to,
    Body: `${code} is your Ficium sign-in code. It expires in ${ttlMin} min. Never share it: Ficium will never ask for it.`,
  });
}

async function sendWhatsapp(to: string, code: string): Promise<SendResult> {
  // Business-initiated WhatsApp messages must use a Meta-approved template.
  return twilioMessage({
    From: `whatsapp:${Env.twilioWhatsappFrom()}`,
    To: `whatsapp:${to}`,
    ContentSid: Env.twilioWhatsappContentSid(),
    ContentVariables: JSON.stringify({ 1: code }),
  });
}
