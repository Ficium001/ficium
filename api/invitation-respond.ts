/**
 * api/invitation-respond.ts
 * POST /api/invitation-respond
 *
 * Invitee accepts or declines. Requires an authenticated, KYC-verified
 * session — the KYC gate itself is enforced inside accept_request_invitation
 * (fails closed if not verified). Accepting also auto-links the couple via
 * get_or_create_couple_link (see accept_request_invitation).
 *
 * Body: { token, action: "accept" | "decline" }
 */
import { Response } from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";
import { getServiceDb } from "./_lib/db.js";
import { hashToken } from "./_lib/handlers/joint-invitation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[invitation-respond] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
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

  const { token, action } = (req.body ?? {}) as { token?: string; action?: "accept" | "decline" };
  if (!token || (action !== "accept" && action !== "decline")) {
    return Response.error(res, "Missing token or invalid action", 400, "INVALID_BODY");
  }

  const db = getServiceDb();
  const tokenHash = hashToken(token);

  if (action === "decline") {
    const { error } = await (db as any).rpc("decline_request_invitation", { p_token_hash: tokenHash });
    if (error) {
      const status = error.message?.includes("not_pending") ? 409 : 400;
      return Response.error(res, error.message ?? "Could not decline invitation", status, "RPC_ERROR");
    }
    return Response.ok(res, { status: "declined" });
  }

  const { data: participantId, error } = await (db as any).rpc("accept_request_invitation", {
    p_token_hash: tokenHash,
    p_client_id: userId,
  });

  if (error) {
    const msg = error.message ?? "Could not accept invitation";
    const status = msg.includes("kyc_required")
      ? 403
      : msg.includes("expired")
        ? 410
        : msg.includes("not_found")
          ? 404
          : 409;
    return Response.error(res, msg, status, "RPC_ERROR");
  }

  return Response.ok(res, { status: "accepted", participantId });
}
