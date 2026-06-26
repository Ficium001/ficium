/**
 * api/relist-request.ts
 * POST /api/relist-request
 *
 * Relists an expired or closed request by cloning it with a fresh 72h bid window.
 * Calls marketplace.relist_request() on Portal DB via portal-api.
 */
import { Env }                        from "./_lib/env.js";
import { Response }                   from "./_lib/response.js";
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

  const { requestId } = (req.body ?? {}) as { requestId?: string };
  if (!requestId) return Response.error(res, "Missing requestId", 400, "MISSING_PARAM");

  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  if (!portalUrl || !secret) {
    return Response.error(res, "Portal not configured", 503, "NOT_CONFIGURED");
  }

  try {
    const portalRes = await fetch(`${portalUrl}/public/requests/${encodeURIComponent(requestId)}/relist`, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-Service-Secret": secret,
      },
      body: JSON.stringify({ consumer_id: consumerId }),
    });

    if (!portalRes.ok) {
      const body = await portalRes.text();
      return Response.error(res, body, portalRes.status, "PORTAL_ERROR");
    }

    const data = await portalRes.json();
    return Response.ok(res, data);
  } catch (e) {
    return Response.error(res, "Portal request failed", 502, "REQUEST_FAILED");
  }
}
