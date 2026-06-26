/**
 * api/bid-notify.ts
 * POST /api/bid-notify
 *
 * Triggered by bid_notify.dispatch() via pg_net immediately after a
 * marketplace.bid INSERT on the Portal DB.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  FLOW                                                           │
 * │  Portal DB bid INSERT → pg_net trigger → this endpoint         │
 * │    1. Receive enriched payload (bid + request + product data)  │
 * │    2. Resolve consumer from App DB via request_id              │
 * │    3. Write in-app notification (idempotent)                   │
 * │    4. Send Resend email                                        │
 * │                                                                 │
 * │  Double-blind preserved: institution name NEVER in payload      │
 * │  Zero round-trips to portal-api — all data in pg_net body      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Auth:    X-Service-Secret header
 * Idempotent: metadata->>'bid_id' checked before insert
 *
 * Env: APP_SERVICE_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      RESEND_API_KEY
 */

import { Env }                          from "./_lib/env.js";
import { getServiceDb, type ServiceDb } from "./_lib/db.js";

export const config = { runtime: "nodejs" };

// ── Payload from pg_net (built inline in dispatch()) ──────────────────────

interface BidPayload {
  bid_id:         string;
  request_id:     string;
  rate:           number;
  rate_type:      string;   // 'fixed' | 'variable'
  amount_offered: number;
  term_months:    number | null;
  submitted_at:   string;
  product_label:  string;   // e.g. "Credit Card"
  product_code:   string;   // e.g. "credit_card"
  request_amount: number;
  currency:       string;
  consumer_ref:   string;
}

interface AppClient {
  id:        string;
  email:     string;
  full_name: string | null;
}

// ── Formatters ─────────────────────────────────────────────────────────────

function fmtMUR(n: number): string {
  if (n >= 1_000_000) return `MUR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `MUR ${Math.round(n / 1_000)}K`;
  return `MUR ${n.toLocaleString()}`;
}

function fmtRate(rate: number, rateType: string): string {
  return rateType === "variable" ? `${rate}% variable p.a.` : `${rate}% p.a.`;
}

// ── In-app notification ────────────────────────────────────────────────────

async function writeInApp(
  db:       ServiceDb,
  clientId: string,
  p:        BidPayload,
): Promise<boolean> {
  // Idempotency: already notified for this bid?
  const { data: existing } = await (db as any)
    .from("notifications")
    .select("id")
    .eq("user_id", clientId)
    .eq("kind", "bid_received")
    .filter("metadata->>bid_id", "eq", p.bid_id)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) return false;

  const termStr = p.term_months ? ` over ${p.term_months} months` : "";
  const title   = `New offer on your ${p.product_label} request`;
  const body    = `${fmtMUR(p.amount_offered)} at ${fmtRate(p.rate, p.rate_type)}${termStr}. Tap to review.`;

  const { error } = await (db as any).from("notifications").insert({
    user_id:  clientId,
    kind:     "bid_received",
    title,
    body,
    link:     `/requests/${p.request_id}`,
    metadata: {
      bid_id:     p.bid_id,
      request_id: p.request_id,
      rate:       p.rate,
    },
  });

  if (error) console.error("[bid-notify] notification insert error:", error);
  return !error;
}

// ── Email ──────────────────────────────────────────────────────────────────

function emailHtml(name: string, p: BidPayload): string {
  const termRow = p.term_months
    ? `<tr><td colspan="2" style="padding-top:16px;">
         <div style="font-size:10px;font-weight:700;color:#6B6B85;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Term</div>
         <div style="font-size:16px;font-weight:700;color:#0B0B1E;">${p.term_months} months</div>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAFC;font-family:-apple-system,BlinkMacSystemFont,'Inter Tight',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0"
    style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(11,11,30,0.06);">

    <tr><td style="background:linear-gradient(135deg,#356EF4,#8231EC);padding:32px 40px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.03em;">Ficium</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:2px;">Reverse banking marketplace</div>
    </td></tr>

    <tr><td style="padding:40px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6B6B85;text-transform:uppercase;letter-spacing:0.08em;">
        New offer received
      </p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0B0B1E;letter-spacing:-0.03em;line-height:1.2;">
        A lender has bid on your ${p.product_label} request
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6B6B85;line-height:1.6;">
        Hi ${name}, you have a new offer waiting. Review it before the bid window closes.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F6F5FA;border-radius:16px;margin-bottom:28px;">
        <tr><td style="padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%">
                <div style="font-size:10px;font-weight:700;color:#6B6B85;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Amount offered</div>
                <div style="font-size:22px;font-weight:800;color:#0B0B1E;">${fmtMUR(p.amount_offered)}</div>
              </td>
              <td width="50%">
                <div style="font-size:10px;font-weight:700;color:#6B6B85;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Interest rate</div>
                <div style="font-size:22px;font-weight:800;color:#2A1FE6;">${fmtRate(p.rate, p.rate_type)}</div>
              </td>
            </tr>
            ${termRow}
          </table>
        </td></tr>
      </table>

      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;font-size:12px;color:#1E40AF;line-height:1.5;">
          🔒 Your identity stays private until you accept. The lender doesn't know who you are.
        </p>
      </div>

      <a href="https://ficium.vercel.app/requests/${p.request_id}"
        style="display:inline-block;background:linear-gradient(135deg,#356EF4,#8231EC);color:#fff;font-weight:700;font-size:15px;padding:15px 32px;border-radius:12px;text-decoration:none;">
        Review offer →
      </a>

      <p style="margin:24px 0 0;font-size:12px;color:#6B6B85;line-height:1.6;">
        Compare all offers and accept the best one before your bid window closes.
      </p>
    </td></tr>

    <tr><td style="background:#F6F5FA;padding:20px 40px;border-top:1px solid rgba(11,11,30,0.05);">
      <p style="margin:0;font-size:11px;color:#6B6B85;line-height:1.6;">
        You're receiving this because you have an active request on Ficium.<br>
        Ficium · Mauritius ·
        <a href="https://ficium.vercel.app" style="color:#2A1FE6;text-decoration:none;">ficium.vercel.app</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendEmail(client: AppClient, p: BidPayload): Promise<void> {
  const resendKey = Env.resendApiKey();
  if (!resendKey) {
    console.warn("[bid-notify] RESEND_API_KEY not set — skipping email");
    return;
  }

  const name    = client.full_name ?? client.email.split("@")[0];
  const termStr = p.term_months ? ` over ${p.term_months} months` : "";
  const subject = `New offer: ${fmtMUR(p.amount_offered)} at ${fmtRate(p.rate, p.rate_type)}${termStr} — Ficium`;

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    "Ficium <notifications@ficium.mu>",
      to:      [client.email],
      subject,
      html:    emailHtml(name, p),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[bid-notify] Resend error:", err);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = (req.headers["x-service-secret"] as string) ?? "";
  if (!secret || secret !== Env.appServiceSecret()) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const p = req.body as Partial<BidPayload>;
  if (!p.bid_id || !p.request_id) {
    return res.status(400).json({ error: "bid_id and request_id required" });
  }

  const db = getServiceDb();

  // ── 1. Resolve consumer from App DB ─────────────────────────────────────
  const { data: appReq } = await (db as any)
    .from("requests")
    .select("client_id")
    .eq("id", p.request_id)
    .single() as { data: { client_id: string } | null };

  if (!appReq) {
    // Request may not be synced to App DB yet (edge case) — log and 200
    console.warn("[bid-notify] request not found on App DB:", p.request_id);
    return res.status(200).json({ ok: false, reason: "request_not_found" });
  }

  const { data: client } = await (db as any)
    .from("clients")
    .select("id, email, full_name")
    .eq("id", appReq.client_id)
    .single() as { data: AppClient | null };

  if (!client) {
    console.warn("[bid-notify] client not found:", appReq.client_id);
    return res.status(200).json({ ok: false, reason: "client_not_found" });
  }

  // ── 2. Write in-app notification ─────────────────────────────────────────
  const written = await writeInApp(db, client.id, p as BidPayload);

  // ── 3. Send email (fire-and-forget) ──────────────────────────────────────
  if (written) {
    sendEmail(client, p as BidPayload).catch((e) =>
      console.error("[bid-notify] email error:", e),
    );
  }

  return res.status(200).json({ ok: true, written, clientId: client.id });
}
