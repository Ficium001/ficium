/**
 * api/kyc-notify.ts
 * ─────────────────────────────────────────────────────────────
 * POST /api/kyc-notify
 * Sends KYC approval or rejection email to the user via Resend.
 * Called from the admin KYC review dashboard after a decision.
 *
 * Body: { userId, decision: "approved" | "rejected", note?: string }
 */
import { Env }      from "./_lib/env";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

/* ---------- Email templates ---------- */

function approvedHtml(name: string, note?: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAF7F0;font-family:'Inter Tight',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F0;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(10,10,26,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#2A1FE6;padding:32px 40px;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">Ficium</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px;">Reverse banking marketplace</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <div style="width:56px;height:56px;background:#7DF9C5;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
              <span style="font-size:28px;">✓</span>
            </div>
            <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0A0A1A;letter-spacing:-0.03em;">
              Identity verified
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:#6B6B85;line-height:1.6;">
              Hi ${name}, your identity has been successfully verified. You can now submit financial requests and start receiving bids from banks and fintechs on Ficium.
            </p>
            ${note ? `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:16px;margin-bottom:20px;font-size:13px;color:#166534;">${note}</div>` : ""}
            <a href="https://ficium.vercel.app/requests/new"
               style="display:inline-block;background:#2A1FE6;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">
              Post your first request →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid rgba(10,10,26,0.07);">
            <p style="margin:0;font-size:12px;color:#6B6B85;">
              Questions? Reply to this email or visit <a href="https://ficium.vercel.app" style="color:#2A1FE6;">ficium.vercel.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function rejectedHtml(name: string, reason: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAF7F0;font-family:'Inter Tight',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F0;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(10,10,26,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#2A1FE6;padding:32px 40px;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">Ficium</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px;">Reverse banking marketplace</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0A0A1A;letter-spacing:-0.03em;">
              Identity verification unsuccessful
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:#6B6B85;line-height:1.6;">
              Hi ${name}, unfortunately we were unable to verify your identity at this time.
            </p>
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Reason</div>
              <div style="font-size:14px;color:#7F1D1D;">${reason}</div>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#6B6B85;line-height:1.6;">
              You can resubmit your documents with clearer photos. Make sure your ID is fully visible, in good lighting, and your selfie is a live photo (not a printout or screenshot).
            </p>
            <a href="https://ficium.vercel.app/onboarding/kyc"
               style="display:inline-block;background:#2A1FE6;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">
              Resubmit documents →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid rgba(10,10,26,0.07);">
            <p style="margin:0;font-size:12px;color:#6B6B85;">
              Need help? Reply to this email and our team will assist you.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ---------- Handler ---------- */

export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resendKey = Env.resendApiKey();
  if (!resendKey) {
    return res.status(503).json({ error: "Email service not configured" });
  }

  const { userId, decision, note } = req.body as {
    userId:   string;
    decision: "approved" | "rejected";
    note?:    string;
  };

  if (!userId || !decision) {
    return res.status(400).json({ error: "userId and decision required" });
  }

  // Fetch user details from Supabase using service role
  const supabaseUrl = Env.supabaseUrl();
  const serviceKey  = Env.supabaseServiceKey();

  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const db = createClient(supabaseUrl, serviceKey);

  const { data: client, error: dbError } = await db
    .from("clients")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (dbError || !client) {
    return res.status(404).json({ error: "User not found" });
  }

  const name    = client.full_name ?? client.email.split("@")[0];
  const isApproved = decision === "approved";

  const emailPayload = {
    from:    "Ficium <noreply@ficium.net>",
    to:      [client.email],
    subject: isApproved
      ? "✓ Your identity has been verified — Ficium"
      : "Your identity verification — action required",
    html: isApproved
      ? approvedHtml(name, note)
      : rejectedHtml(name, note ?? "Your documents could not be verified. Please resubmit with clearer photos."),
  };

  // Send via Resend
  const sendRes = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("[kyc-notify] Resend error:", err);
    return res.status(502).json({ error: "Email delivery failed" });
  }

  const result = await sendRes.json();
  return res.status(200).json({ ok: true, emailId: result.id });
}
