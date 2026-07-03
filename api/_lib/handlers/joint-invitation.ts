/**
 * api/_lib/handlers/joint-invitation.ts
 *
 * Shared helpers for the joint-request invitation flow:
 *   - secure token generation / hashing (SHA-256, same pattern as
 *     _kyc/setup.ts's hashHex — raw token never touches the DB)
 *   - invitation email (Resend, same template shell as _kyc/notify.ts)
 *
 * Used by: invitation-create.ts, invitation-respond.ts, invitation-revoke.ts
 */
import { randomBytes, createHash } from "crypto";
import { Env } from "../env.js";

export const APP_URL = "https://ficium.vercel.app";

/** 32 random bytes, base64url-encoded — goes in the emailed link, never stored. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 of the raw token, as a Postgres bytea hex literal ("\xdeadbeef..."). */
export function hashToken(rawToken: string): string {
  const hex = createHash("sha256").update(rawToken).digest("hex");
  return `\\x${hex}`;
}

function shell(title: string, bodyHtml: string, ctaHref: string, ctaLabel: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAF7F0;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:#2A1FE6;padding:32px 40px;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Ficium</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6);">Reverse banking marketplace</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#0A0A1A;">${title}</h1>
          <div style="margin:0 0 24px;font-size:15px;color:#6B6B85;line-height:1.6;">${bodyHtml}</div>
          <a href="${ctaHref}" style="display:inline-block;background:#2A1FE6;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">${ctaLabel}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function fmtMUR(n: number): string {
  return `MUR ${Number(n).toLocaleString()}`;
}

interface InvitationEmailParams {
  toEmail: string;
  inviterName: string;
  productType: string;
  amount: number;
  rawToken: string;
}

/** Sends the "you've been invited to a joint request" email via Resend. */
export async function sendInvitationEmail(p: InvitationEmailParams): Promise<void> {
  const resendKey = Env.resendApiKey();
  if (!resendKey) {
    console.error("[joint-invitation] RESEND_API_KEY not set — skipping email send");
    return;
  }

  const link = `${APP_URL}/invite/${encodeURIComponent(p.rawToken)}`;
  const body = `${p.inviterName} has invited you to join a ${p.productType.replace(/_/g, " ")} request for ${fmtMUR(p.amount)} on Ficium. Accepting means you'll be jointly responsible for this request. This link expires in 7 days.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ficium <onboarding@resend.dev>",
      to: [p.toEmail],
      subject: `${p.inviterName} invited you to a joint request on Ficium`,
      html: shell("You've been invited", body, link, "Review and respond"),
    }),
  });

  if (!res.ok) {
    console.error("[joint-invitation] Resend error:", await res.text());
  }
}
