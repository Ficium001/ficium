/**
 * api/request-bids-bulk.ts
 * POST /api/request-bids-bulk
 *
 * Bulk bid fetch — replaces N parallel calls to /api/request-bids.
 * Body: { requestIds: string[] }
 * Returns: { [requestId]: Bid[] }
 *
 * One Vercel invocation → one portal-api call → one DB query.
 */
import { Env } from "./_lib/env.js";
import { Response } from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const body = req.body as { requestIds?: unknown };
  const requestIds = Array.isArray(body?.requestIds) ? (body.requestIds as string[]) : [];
  if (!requestIds.length) return Response.ok(res, {});

  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "PORTAL_NOT_CONFIGURED");
  }

  try {
    const portalRes = await fetch(`${portalUrl}/public/requests/bids/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Secret": secret,
      },
      body: JSON.stringify({ request_ids: requestIds, consumer_id: consumerId }),
    });
    if (!portalRes.ok) return Response.error(res, "Portal unavailable", 502, "PORTAL_UNAVAILABLE");
    const bids = await portalRes.json();
    return Response.ok(res, bids);
  } catch {
    return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
  }
}
