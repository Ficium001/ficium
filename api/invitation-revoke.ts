/**
 * api/invitation-revoke.ts
 * POST /api/invitation-revoke
 *
 * Inviter cancels a pending invitation before the invitee responds.
 * Ownership is enforced inside revoke_request_invitation (checks
 * inviter_client_id matches), but we also fail fast here.
 *
 * Body: { invitationId }
 */
import { Response } from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";
import { getServiceDb } from "./_lib/db.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[invitation-revoke] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
    return Response.error(res, `Unexpected error: ${msg}`, 500, "UNEXPECTED");
  }
}

async function _handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  let userId: string;
  try {
    const user = await requireUser(req);
    userId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const { invitationId } = (req.body ?? {}) as { invitationId?: string };
  if (!invitationId) return Response.error(res, "Missing invitationId", 400, "INVALID_BODY");

  const db = getServiceDb();
  const { error } = await (db as any).rpc("revoke_request_invitation", {
    p_invitation_id: invitationId,
    p_inviter_client_id: userId,
  });

  if (error) {
    const msg = error.message ?? "Could not revoke invitation";
    const status = msg.includes("not_authorized") ? 403 : msg.includes("not_pending") ? 409 : 404;
    return Response.error(res, msg, status, "RPC_ERROR");
  }

  return Response.ok(res, { status: "revoked" });
}
