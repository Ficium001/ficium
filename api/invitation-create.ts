/**
 * api/invitation-create.ts
 * POST /api/invitation-create
 *
 * Inviter creates an invitation for a co-applicant on a joint request.
 * Generates a single-use token (only the SHA-256 hash is stored — the raw
 * token exists only in the emailed link), calls the SECURITY DEFINER
 * create_request_invitation RPC, and sends the invite email.
 *
 * Body: { requestId, invitedEmail, invitedPhone?, proposedRole?,
 *         proposedLiability?, proposedOwnershipBps? }
 *
 * Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */
import { Response } from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";
import { getServiceDb } from "./_lib/db.js";
import { generateToken, hashToken, sendInvitationEmail } from "./_lib/handlers/joint-invitation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[invitation-create] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
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

  const {
    requestId,
    invitedEmail,
    invitedPhone,
    proposedRole,
    proposedLiability,
    proposedOwnershipBps,
  } = (req.body ?? {}) as {
    requestId?: string;
    invitedEmail?: string;
    invitedPhone?: string;
    proposedRole?: string;
    proposedLiability?: string;
    proposedOwnershipBps?: number;
  };

  if (!requestId || !invitedEmail) {
    return Response.error(res, "Missing requestId or invitedEmail", 400, "INVALID_BODY");
  }

  const db = getServiceDb();

  // Ownership guard — only the request's own client can invite a co-applicant.
  const { data: requestRow, error: reqErr } = await (db as any)
    .from("requests")
    .select("id, client_id, product_type, amount, status")
    .eq("id", requestId)
    .single();

  if (reqErr || !requestRow) return Response.error(res, "Request not found", 404, "NOT_FOUND");
  if (requestRow.client_id !== userId) {
    return Response.error(res, "Forbidden — not the request owner", 403, "FORBIDDEN");
  }
  if (requestRow.status !== "open" && requestRow.status !== "awaiting_consent") {
    return Response.error(res, "Request is no longer open for invitations", 409, "REQUEST_CLOSED");
  }

  const { data: inviter } = await (db as any)
    .from("clients")
    .select("full_name")
    .eq("id", userId)
    .single();

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  const { data: invitationId, error: rpcErr } = await (db as any).rpc("create_request_invitation", {
    p_request_id: requestId,
    p_inviter_client_id: userId,
    p_invited_email: invitedEmail,
    p_token_hash: tokenHash,
    p_invited_phone: invitedPhone ?? null,
    p_channel: "email",
    p_proposed_role: proposedRole ?? "co_applicant",
    p_proposed_liability: proposedLiability ?? null,
    p_proposed_ownership_bps: proposedOwnershipBps ?? null,
    p_ttl_days: 7,
  });

  if (rpcErr) {
    console.error("[invitation-create] rpc error:", rpcErr);
    return Response.error(res, rpcErr.message ?? "Could not create invitation", 500, "RPC_ERROR");
  }

  await sendInvitationEmail({
    toEmail: invitedEmail,
    inviterName: inviter?.full_name ?? "Your partner",
    productType: requestRow.product_type,
    amount: Number(requestRow.amount),
    rawToken,
  });

  return Response.ok(res, { invitationId }, 201);
}
