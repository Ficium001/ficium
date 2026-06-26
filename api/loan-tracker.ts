/**
 * api/loan-tracker.ts
 * GET /api/loan-tracker?requestId={id}
 *
 * Returns borrower-facing pipeline stages for a given request.
 * Session-guarded. Ownership verified by portal-api.
 */
import { Env }                           from "./_lib/env.js";
import { Response }                      from "./_lib/response.js";
import { requireUser, sendAuthError }    from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const requestId = req.query?.requestId as string | undefined;
  if (!requestId) {
    return Response.error(res, "Missing requestId", 400, "MISSING_PARAM");
  }

  // ── Forward to portal-api ─────────────────────────────────────────────────
  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "NOT_CONFIGURED");
  }

  try {
    const portalRes = await fetch(
      `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/pipeline`
        + `?consumer_id=${encodeURIComponent(consumerId)}`,
      { headers: { "X-Service-Secret": secret } },
    );

    if (!portalRes.ok) {
      const body = await portalRes.text();
      return Response.error(res, body, portalRes.status, "PORTAL_ERROR");
    }

    const data = await portalRes.json();
    return Response.ok(res, data);
  } catch (e) {
    return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
  }
}
