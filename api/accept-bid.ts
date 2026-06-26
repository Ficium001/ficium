/**
 * api/accept-bid.ts
 * POST /api/accept-bid
 *
 * Phase 2 identity reveal — orchestration layer.
 */
import { Env }                                    from "./_lib/env.js";
import { Response }                               from "./_lib/response.js";
import { requireUser, requireOwnership, sendAuthError } from "./_lib/auth.js";
import { writeBidAcceptedNotification }           from "./_lib/handlers/bid-accepted.js";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  // Top-level catch-all so we always get a structured error, never a raw 500
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[accept-bid] UNCAUGHT:", msg, stack);
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
    console.info("[accept-bid] authed user:", consumerId);
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const { requestId, bidId } = (req.body ?? {}) as {
    requestId?: string;
    bidId?: string;
  };
  console.info("[accept-bid] body:", { requestId, bidId });

  if (!requestId || !bidId) {
    return Response.error(res, "Missing requestId or bidId", 400, "INVALID_BODY");
  }

  // ── 2. Ownership guard (App DB) ────────────────────────────────────────────
  const supabaseUrl = Env.supabaseUrl();
  const serviceKey  = Env.supabaseServiceKey();
  console.info("[accept-bid] env check — supabaseUrl:", !!supabaseUrl, "serviceKey:", !!serviceKey);

  if (!supabaseUrl || !serviceKey) {
    return Response.error(res, "Auth not configured", 503, "AUTH_NOT_CONFIGURED");
  }

  const ownerRes = await fetch(
    `${supabaseUrl}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}&select=client_id,status`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  console.info("[accept-bid] ownership fetch status:", ownerRes.status);
  if (!ownerRes.ok) {
    const body = await ownerRes.text();
    console.error("[accept-bid] ownership fetch failed:", body);
    return Response.error(res, "Request lookup failed", 502, "LOOKUP_FAILED");
  }

  const rows = (await ownerRes.json()) as Array<{ client_id: string; status: string }>;
  console.info("[accept-bid] rows count:", rows.length, "first:", rows[0]);

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
  console.info("[accept-bid] portalUrl:", portalUrl, "secret set:", !!secret);

  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "PORTAL_NOT_CONFIGURED");
  }

  let reveal: Record<string, unknown>;
  try {
    const portalEndpoint = `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/accept-bid`;
    console.info("[accept-bid] calling portal:", portalEndpoint);
    const portalRes = await fetch(portalEndpoint, {
      method: "POST",
      headers: {
        "Content-Type":     "application/json",
        "X-Service-Secret": secret,
      },
      body: JSON.stringify({ bid_id: bidId, consumer_id: consumerId }),
    });
    console.info("[accept-bid] portal response status:", portalRes.status);
    if (!portalRes.ok) {
      const errBody = await portalRes.text();
      console.error("[accept-bid] portal error body:", errBody);
      return Response.error(res, `Portal error: ${errBody}`, portalRes.status, "PORTAL_ERROR");
    }
    reveal = await portalRes.json() as Record<string, unknown>;
    console.info("[accept-bid] reveal keys:", Object.keys(reveal));
  } catch (e) {
    console.error("[accept-bid] portal fetch threw:", e);
    return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
  }

  // ── 4. App DB — write bid_acceptance + close request ──────────────────────
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  const [acceptRes, patchRes] = await Promise.allSettled([
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
  console.info("[accept-bid] bid_acceptance insert:", acceptRes.status,
    acceptRes.status === "fulfilled" ? (acceptRes as PromiseFulfilledResult<Response>).value?.status : (acceptRes as PromiseRejectedResult).reason);
  console.info("[accept-bid] request patch:", patchRes.status,
    patchRes.status === "fulfilled" ? (patchRes as PromiseFulfilledResult<Response>).value?.status : (patchRes as PromiseRejectedResult).reason);

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
