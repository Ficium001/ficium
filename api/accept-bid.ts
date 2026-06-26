/**
 * api/accept-bid.ts
 * POST /api/accept-bid
 *
 * Phase 2 identity reveal — orchestration layer.
 *
 * Responsibilities:
 *   1. Verify the caller's Supabase session.
 *   2. Confirm they own the request (IDOR guard — App DB).
 *   3. Call portal-api /public/requests/{id}/accept-bid (server-to-server).
 *      Portal-api handles: ownership (anon UUID), PII fetch, atomic DB writes.
 *   4. Write bid_acceptances row in App DB.
 *   5. Update requests.status = 'accepted' in App DB.
 *   6. Return Phase 2 institution contact to the browser.
 *
 * Env required (Vercel + .env):
 *   PORTAL_API_URL, APP_SERVICE_SECRET,
 *   SUPABASE_URL / VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { Env }                                    from "./_lib/env.js";
import { Response }                               from "./_lib/response.js";
import { requireUser, requireOwnership, sendAuthError } from "./_lib/auth.js";
import { writeBidAcceptedNotification }           from "./_lib/handlers/bid-accepted.js";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[accept-bid] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
    return Response.error(res, `Unexpected error: ${msg}`, 500, "UNEXPECTED");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const { requestId, bidId } = (req.body ?? {}) as {
    requestId?: string;
    bidId?: string;
  };

  if (!requestId || !bidId) {
    return Response.error(res, "Missing requestId or bidId", 400, "INVALID_BODY");
  }

  // ── 2. Ownership guard (App DB) ────────────────────────────────────────────
  const supabaseUrl = Env.supabaseUrl();
  const serviceKey  = Env.supabaseServiceKey();
  if (!supabaseUrl || !serviceKey) {
    return Response.error(res, "Auth not configured", 503, "AUTH_NOT_CONFIGURED");
  }

  const ownerRes = await fetch(
    `${supabaseUrl}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}&select=client_id,status`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!ownerRes.ok) return Response.error(res, "Request lookup failed", 502, "LOOKUP_FAILED");

  const rows = (await ownerRes.json()) as Array<{ client_id: string; status: string }>;
  if (!rows.length) return Response.error(res, "Request not found", 404, "NOT_FOUND");

  try {
    requireOwnership({ id: consumerId, email: null, role: null }, rows[0].client_id);
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Ownership check failed", 403, "FORBIDDEN");
  }

  if (rows[0].status === "accepted") {
    return Response.error(res, "Request already accepted", 409, "ALREADY_ACCEPTED");
  }

  // ── 3. Portal-api — atomic Phase 2 reveal ─────────────────────────────────
  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "PORTAL_NOT_CONFIGURED");
  }

  let reveal: Record<string, unknown>;
  try {
    const portalRes = await fetch(
      `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/accept-bid`,
      {
        method: "POST",
        headers: {
          "Content-Type":     "application/json",
          "X-Service-Secret": secret,
        },
        body: JSON.stringify({ bid_id: bidId, consumer_id: consumerId }),
      },
    );
    if (!portalRes.ok) {
      const errBody = await portalRes.text();
      console.error("[accept-bid] portal error:", portalRes.status, errBody);
      return Response.error(res, `Portal error: ${errBody}`, portalRes.status, "PORTAL_ERROR");
    }
    reveal = await portalRes.json() as Record<string, unknown>;
  } catch (e) {
    console.error("[accept-bid] portal fetch threw:", e);
    return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
  }

  // ── 4. App DB — write bid_acceptance + close request ──────────────────────
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  await Promise.allSettled([
    fetch(`${supabaseUrl}/rest/v1/bid_acceptances`, {
      method:  "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        bid_id:         bidId,
        request_id:     requestId,
        client_id:      consumerId,
        institution_id: reveal.institution_id ?? null,
        accepted_at:    new Date().toISOString(),
      }),
    }),
    fetch(`${supabaseUrl}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}`, {
      method:  "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "accepted" }),
    }),
  ]);

  // ── 5. Notification (fire-and-forget) ─────────────────────────────────────
  writeBidAcceptedNotification({
    client_id:        consumerId,
    request_id:       requestId,
    bid_id:           bidId,
    institution_name: (reveal.institution_name as string) ?? "your lender",
    rate:             Number(reveal.rate)           || 0,
    rate_type:        (reveal.rate_type as string)  ?? "fixed",
    amount_offered:   Number(reveal.amount_offered) || 0,
    term_months:      reveal.term_months ? Number(reveal.term_months) : null,
  }).catch((e) => console.error("[accept-bid] notification error:", e));

  return Response.ok(res, reveal);
}
