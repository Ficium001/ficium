/**
 * api/request-actions.ts
 * Merged serverless function to stay within Vercel Hobby 12-function limit.
 *
 * Routes (via ?action= query param):
 *   GET  /api/request-actions?action=tracker&requestId=  → loan pipeline tracker
 *   POST /api/request-actions?action=relist              → relist expired request
 */
import { Env }                        from "./_lib/env.js";
import { Response }                   from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  // ── Auth (all actions require a valid session) ─────────────────────────────
  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const action = (req.query?.action as string | undefined) ?? "";
  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "NOT_CONFIGURED");
  }

  // ── GET ?action=tracker ────────────────────────────────────────────────────
  if (action === "tracker") {
    if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);

    const requestId = req.query?.requestId as string | undefined;
    if (!requestId) return Response.error(res, "Missing requestId", 400, "MISSING_PARAM");

    try {
      const portalRes = await fetch(
        `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/pipeline`
          + `?consumer_id=${encodeURIComponent(consumerId)}`,
        { headers: { "X-Service-Secret": secret } },
      );
      if (!portalRes.ok) {
        return Response.error(res, await portalRes.text(), portalRes.status, "PORTAL_ERROR");
      }
      return Response.ok(res, await portalRes.json());
    } catch (e) {
      return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
    }
  }

  // ── POST ?action=relist ────────────────────────────────────────────────────
  if (action === "relist") {
    if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

    const { requestId } = (req.body ?? {}) as { requestId?: string };
    if (!requestId) return Response.error(res, "Missing requestId", 400, "MISSING_PARAM");

    try {
      const portalRes = await fetch(
        `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/relist`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", "X-Service-Secret": secret },
          body: JSON.stringify({ consumer_id: consumerId }),
        },
      );
      if (!portalRes.ok) {
        return Response.error(res, await portalRes.text(), portalRes.status, "PORTAL_ERROR");
      }
      return Response.ok(res, await portalRes.json());
    } catch (e) {
      return Response.error(res, "Portal request failed", 502, "REQUEST_FAILED");
    }
  }

  return Response.error(res, `Unknown action: ${action}`, 400, "UNKNOWN_ACTION");
}
