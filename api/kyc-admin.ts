/**
 * api/kyc-admin.ts
 * ─────────────────────────────────────────────────────────────
 * Admin-only KYC operations, routed by ?action= query param.
 * All routes require an active Ficium admin (requireAdmin).
 *
 * GET  /api/kyc-admin?action=faces&clientId=xxx   — list Rekognition faces
 * DELETE /api/kyc-admin?action=faces&clientId=xxx — delete faces for client
 * GET  /api/kyc-admin?action=settings             — read KYC settings
 * POST /api/kyc-admin?action=settings             — update a KYC setting toggle
 * POST /api/kyc-admin?action=notify               — send KYC decision email
 *
 * Merged from: kyc-admin-faces.ts, kyc-settings.ts, kyc-notify.ts
 */

export const config = { runtime: "nodejs" };

import { requireAdmin, asAuthError } from "./_lib/auth";
import { rekognition }               from "./_lib/aws";
import { Env }                       from "./_lib/env";

const COLLECTION_ID = "ficium-kyc-faces";

// ── Shared Supabase REST helper ───────────────────────────────
async function supabaseRest(
  method: "GET" | "PATCH",
  table: string,
  query = "",
  body?: object,
  schema?: string,
) {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  const headers: Record<string, string> = {
    apikey:          key,
    Authorization:   `Bearer ${key}`,
    "Content-Type":  "application/json",
  };
  if (method === "PATCH") headers["Prefer"] = "return=representation";
  if (schema)             headers["Accept-Profile"] = schema;
  const res  = await fetch(`${url}/rest/v1/${table}${query}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

// ── Email templates ───────────────────────────────────────────
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

// ── Action handlers ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFaces(req: any, res: any): Promise<void> {
  const clientId = req.query?.clientId as string;
  if (!clientId) { res.status(400).json({ error: "clientId required" }); return; }

  const listResult = await rekognition("RekognitionService.ListFaces", {
    CollectionId: COLLECTION_ID, MaxResults: 20,
  }) as { Faces?: Array<{ FaceId: string; ExternalImageId?: string }> };

  const clientFaces = (listResult.Faces ?? [])
    .filter(f => f.ExternalImageId === clientId)
    .map(f => f.FaceId);

  if (req.method === "GET") {
    res.status(200).json({ clientId, faceCount: clientFaces.length, faceIds: clientFaces });
    return;
  }
  if (req.method === "DELETE") {
    if (clientFaces.length === 0) {
      res.status(200).json({ clientId, deleted: 0, message: "No faces found for this client" });
      return;
    }
    await rekognition("RekognitionService.DeleteFaces", {
      CollectionId: COLLECTION_ID, FaceIds: clientFaces,
    });
    res.status(200).json({ clientId, deleted: clientFaces.length, faceIds: clientFaces });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSettings(req: any, res: any): Promise<void> {
  if (req.method === "GET") {
    const r = await supabaseRest("GET", "kyc_settings", "?id=eq.1");
    if (!r.ok) { res.status(500).json({ error: "Failed to load settings", detail: r.data }); return; }
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    res.status(200).json(row ?? null);
    return;
  }
  if (req.method === "POST") {
    const { key, value } = req.body as { key: string; value: boolean };
    if (!key || typeof value !== "boolean") {
      res.status(400).json({ error: "key and value required" }); return;
    }
    const r = await supabaseRest("PATCH", "kyc_settings", "?id=eq.1",
      { [key]: value, updated_at: new Date().toISOString() });
    if (!r.ok) { res.status(500).json({ error: "Failed to update setting" }); return; }
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    res.status(200).json(row ?? { ok: true });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleNotify(req: any, res: any): Promise<void> {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const resendKey = Env.resendApiKey();
  if (!resendKey) { res.status(503).json({ error: "RESEND_API_KEY not set" }); return; }

  const { userId, decision, note } = req.body as {
    userId: string; decision: "approved" | "rejected"; note?: string;
  };
  if (!userId || !decision) { res.status(400).json({ error: "userId and decision required" }); return; }

  const r = await supabaseRest("GET", "clients", `?id=eq.${userId}&select=email,full_name&limit=1`);
  if (!r.ok) { res.status(502).json({ error: "DB fetch failed" }); return; }
  const users = r.data as Array<{ email: string; full_name: string | null }>;
  if (!users?.length) { res.status(404).json({ error: "User not found" }); return; }

  const { email, full_name } = users[0];
  const name       = full_name ?? email.split("@")[0];
  const isApproved = decision === "approved";

  const sendRes = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    "Ficium <onboarding@resend.dev>",
      to:      [email],
      subject: isApproved
        ? "✓ Your identity has been verified — Ficium"
        : "Your identity verification — action required",
      html: isApproved
        ? approvedHtml(name, note)
        : rejectedHtml(name, note ?? "Documents could not be verified. Please resubmit with clearer photos."),
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("[kyc-admin/notify] Resend error:", err);
    res.status(502).json({ error: "Email failed", detail: err });
    return;
  }
  const result = await sendRes.json() as { id?: string };
  res.status(200).json({ ok: true, emailId: result.id });
}

// ── Main handler ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  // All routes: active Ficium admin only.
  try {
    await requireAdmin(req);
  } catch (e) {
    const ae = asAuthError(e);
    if (ae) { res.status(ae.status).json({ error: ae.message, code: ae.code }); return; }
    throw e;
  }

  const action = (req.query?.action as string) ?? "";

  try {
    if (action === "faces")    return void await handleFaces(req, res);
    if (action === "settings") return void await handleSettings(req, res);
    if (action === "notify")   return void await handleNotify(req, res);
    res.status(400).json({ error: "action must be faces | settings | notify" });
  } catch (err) {
    console.error("[kyc-admin]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
