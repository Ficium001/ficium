/**
 * api/kyc-notify.ts
 * POST /api/kyc-notify
 * Sends KYC approval or rejection email via Resend.
 * Intentionally self-contained — no _lib imports to avoid ESM bundling issues.
 */


/* ---------- Env (inlined — no _lib import) ---------- */
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

/* ---------- Email templates ---------- */

function approvedHtml(name: string, note?: string) {
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
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#0A0A1A;">Identity verified ✓</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#6B6B85;line-height:1.6;">
            Hi ${name}, your identity has been verified. You can now submit financial requests and receive bids from banks on Ficium.
          </p>
          ${note ? `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:16px;margin-bottom:20px;font-size:13px;color:#166534;">${note}</div>` : ""}
          <a href="https://ficium.vercel.app/requests/new" style="display:inline-block;background:#2A1FE6;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">Post your first request →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function rejectedHtml(name: string, reason: string) {
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
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#0A0A1A;">Verification unsuccessful</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#6B6B85;line-height:1.6;">Hi ${name}, we were unable to verify your identity at this time.</p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;margin-bottom:6px;">Reason</div>
            <div style="font-size:14px;color:#7F1D1D;">${reason}</div>
          </div>
          <a href="https://ficium.vercel.app/onboarding/kyc" style="display:inline-block;background:#2A1FE6;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">Resubmit documents →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* ---------- Handler ---------- */
export async function notifyHandler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const resendKey   = getEnv("RESEND_API_KEY");
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceKey  = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!resendKey)   return res.status(503).json({ error: "RESEND_API_KEY not set" });
  if (!supabaseUrl) return res.status(503).json({ error: "SUPABASE_URL not set" });
  if (!serviceKey)  return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" });

  const { userId, decision, note } = req.body as {
    userId: string; decision: "approved" | "rejected"; note?: string;
  };

  if (!userId || !decision) return res.status(400).json({ error: "userId and decision required" });

  // Fetch user via Supabase REST
  const userRes = await fetch(
    `${supabaseUrl}/rest/v1/clients?id=eq.${userId}&select=email,full_name&limit=1`,
    { headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` } }
  );

  if (!userRes.ok) return res.status(502).json({ error: "DB fetch failed" });

  const users = await userRes.json() as Array<{ email: string; full_name: string | null }>;
  if (!users.length) return res.status(404).json({ error: "User not found" });

  const { email, full_name } = users[0];
  const name       = full_name ?? email.split("@")[0];
  const isApproved = decision === "approved";

  const sendRes = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    "Ficium <onboarding@resend.dev>",
      to:      [email],
      subject: isApproved ? "✓ Your identity has been verified — Ficium" : "Your identity verification — action required",
      html:    isApproved ? approvedHtml(name, note) : rejectedHtml(name, note ?? "Documents could not be verified. Please resubmit with clearer photos."),
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("[kyc-notify] Resend error:", err);
    return res.status(502).json({ error: "Email failed", detail: err });
  }

  const result = await sendRes.json() as { id?: string };
  return res.status(200).json({ ok: true, emailId: result.id });
}
