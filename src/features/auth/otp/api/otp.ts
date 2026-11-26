/**
 * Sign-in OTP: thin client over /api/account?op=otp. The server picks the destination
 * (account email / phone) and does every check; this only carries the request.
 */
import { apiFetch } from "@/shared/lib/apiClient";

export type OtpChannel = "email" | "sms" | "whatsapp";

export interface OtpChannelOption {
  channel: OtpChannel;
  available: boolean;
  destination: string | null;
  reason: "no_email" | "no_phone" | "not_configured" | null;
}

export interface OtpStatus {
  enforced: boolean;
  verified: boolean;
  preferred: OtpChannel | null;
  codeLength: number;
  channels: OtpChannelOption[];
}

export interface OtpSent {
  challengeId: string;
  channel: OtpChannel;
  destination: string;
  expiresIn: number;
  resendIn: number;
}

export type OtpResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

const PATH = "/api/account?op=otp";

async function call<T>(init?: RequestInit): Promise<OtpResult<T>> {
  try {
    const res = await apiFetch(PATH, init);
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data: T } | { ok: false; error?: string; code?: string } | null;
    if (res.ok && body?.ok) return { ok: true, data: body.data };
    const err = body && !body.ok ? body : null;
    return { ok: false, code: err?.code ?? `HTTP_${res.status}`, message: err?.error ?? "Something went wrong. Please try again." };
  } catch (e) {
    const anyErr = e as { code?: string; message?: string };
    if (anyErr?.code) return { ok: false, code: anyErr.code, message: anyErr.message ?? "Please sign in again." };
    return { ok: false, code: "NETWORK", message: "No connection. Check your internet and try again." };
  }
}

export async function getOtpStatus(): Promise<OtpStatus> {
  const r = await call<OtpStatus>();
  if (!r.ok) throw Object.assign(new Error(r.message), { code: r.code });
  return r.data;
}

export const sendOtp = (channel: OtpChannel) =>
  call<OtpSent>({ method: "POST", body: JSON.stringify({ action: "send", channel }) });

export const verifyOtp = (challengeId: string, code: string) =>
  call<{ verified: true }>({ method: "POST", body: JSON.stringify({ action: "verify", challengeId, code }) });

/** The auth session id from an access token, for keying the status per session. */
export function sessionKey(accessToken: string | undefined): string | null {
  const part = accessToken?.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { session_id?: string }).session_id ?? null;
  } catch {
    return null;
  }
}
