/**
 * api/invitation-preview.ts
 * GET /api/invitation-preview?token=...
 *
 * Public (unauthenticated) preview for the /invite/:token landing page —
 * shown before the invitee logs in or signs up. Returns only enough to
 * render the invite screen: no PII beyond the inviter's first name.
 */
import { Response } from "./_lib/response.js";
import { getServiceDb } from "./_lib/db.js";
import { hashToken } from "./_lib/handlers/joint-invitation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[invitation-preview] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
    return Response.error(res, `Unexpected error: ${msg}`, 500, "UNEXPECTED");
  }
}

async function _handler(req: any, res: any): Promise<void> {
  if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);

  const token = (req.query?.token ?? "") as string;
  if (!token) return Response.error(res, "Missing token", 400, "INVALID_QUERY");

  const db = getServiceDb();
  const tokenHash = hashToken(token);

  const { data: invitation, error } = await (db as any)
    .from("request_invitation")
    .select("id, request_id, status, expires_at, proposed_role, inviter_client_id")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !invitation) return Response.error(res, "Invitation not found", 404, "NOT_FOUND");

  const [{ data: request }, { data: inviter }] = await Promise.all([
    (db as any).from("requests").select("product_type, amount, purpose").eq("id", invitation.request_id).single(),
    (db as any).from("clients").select("first_name, full_name").eq("id", invitation.inviter_client_id).single(),
  ]);

  return Response.ok(res, {
    status: invitation.status,
    expiresAt: invitation.expires_at,
    proposedRole: invitation.proposed_role,
    inviterFirstName: inviter?.first_name ?? (inviter?.full_name ?? "Your partner").split(" ")[0],
    request: request
      ? { productType: request.product_type, amount: request.amount, purpose: request.purpose }
      : null,
  });
}
