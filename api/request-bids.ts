/**
 * api/request-bids.ts
 * GET /api/request-bids?requestId=...
 *
 * App backend (Vercel serverless). The browser is NOT allowed to read bids
 * directly anymore (RLS hides institution_bids). This function:
 *   1. verifies the consumer's Supabase session (requireUser)
 *   2. confirms the consumer owns the request (IDOR guard)
 *   3. calls portal-api server-to-server with the shared secret
 *   4. returns the bids to the browser
 *
 * The browser never sees APP_SERVICE_SECRET — it lives only here, server-side.
 *
 * Env needed (App project — Vercel + local .env):
 *   PORTAL_API_URL            = https://ficium-portal-api-production.up.railway.app
 *   APP_SERVICE_SECRET        = (same value set in portal-api)
 *   VITE_SUPABASE_URL / SUPABASE_URL   = the App project URL
 *   SUPABASE_SERVICE_ROLE_KEY = App project service role (to check request ownership)
 */
import { Env } from "./_lib/env.js";
import { Response } from "./_lib/response.js";
import { requireUser, requireOwnership, sendAuthError } from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);

  const requestId = String(req.query?.requestId ?? "");
  if (!requestId) return Response.error(res, "Missing requestId", 400, "INVALID_QUERY");

  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  // Confirm this consumer owns the request (App-side ownership check via PostgREST).
  const supabaseUrl = Env.supabaseUrl();
  const serviceKey  = Env.supabaseServiceKey();
  if (!supabaseUrl || !serviceKey) {
    return Response.error(res, "Auth not configured", 503, "AUTH_NOT_CONFIGURED");
  }

  try {
    const ownerRes = await fetch(
      `${supabaseUrl}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}&select=client_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!ownerRes.ok) return Response.error(res, "Request lookup failed", 502, "LOOKUP_FAILED");
    const rows = (await ownerRes.json()) as Array<{ client_id: string }>;
    if (!rows.length) return Response.error(res, "Request not found", 404, "NOT_FOUND");
    requireOwnership({ id: consumerId, email: null, role: null }, rows[0].client_id);
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Ownership check failed", 500, "OWNERSHIP_CHECK_FAILED");
  }

  // Server-to-server call to portal-api with the shared secret.
  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "PORTAL_NOT_CONFIGURED");
  }

  try {
    const url = `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/bids`
      + `?consumer_id=${encodeURIComponent(consumerId)}`;
    const portalRes = await fetch(url, {
      headers: { "X-Service-Secret": secret },
    });
    if (!portalRes.ok) return Response.error(res, "Portal unavailable", 502, "PORTAL_UNAVAILABLE");
    const bids = await portalRes.json();
    return Response.ok(res, bids);
  } catch {
    return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
  }
}
