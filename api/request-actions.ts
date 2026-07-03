/**
 * api/request-actions.ts
 * Merged serverless function to stay within Vercel Hobby 12-function limit.
 *
 * Routes (via ?action= query param, or { action } in POST body):
 *   GET  ?action=tracker&requestId=            → loan pipeline tracker
 *   POST ?action=relist                        → relist expired request
 *   GET  ?action=invitation-preview&token=     → public invite preview (no auth)
 *   GET  ?action=couple                        → caller's couple + joint requests
 *   POST { action: "invitation-create", ... }  → invite a co-applicant
 *   POST { action: "invitation-respond", ... } → accept/decline an invitation
 *   POST { action: "invitation-revoke", ... }  → cancel a pending invitation
 *
 * invitation-preview is the one public (unauthenticated) route — it's shown
 * on /invite/:token before the invitee has logged in — so the auth gate
 * below is skipped specifically for that action, not globally.
 */
import { Env }                        from "./_lib/env.js";
import { Response }                   from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";
import { getServiceDb }               from "./_lib/db.js";
import { generateToken, hashToken, sendInvitationEmail } from "./_lib/handlers/joint-invitation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await route(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[request-actions] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
    return Response.error(res, `Unexpected error: ${msg}`, 500, "UNEXPECTED");
  }
}

async function route(req: any, res: any): Promise<void> {
  const action = (req.method === "GET"
    ? req.query?.action
    : (req.body ?? {}).action) as string | undefined;

  // ── Public route — no auth, invitee may not have an account yet ──────────
  if (action === "invitation-preview") {
    if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);
    return invitationPreview(req, res);
  }

  // ── Every other action requires a valid session ───────────────────────────
  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();

  // ── GET ?action=tracker ────────────────────────────────────────────────────
  if (action === "tracker") {
    if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);
    if (!portalUrl || !secret) return Response.error(res, "Portal not configured", 503, "NOT_CONFIGURED");

    const requestId = req.query?.requestId as string | undefined;
    if (!requestId) return Response.error(res, "Missing requestId", 400, "MISSING_PARAM");

    try {
      const portalRes = await fetch(
        `${portalUrl}/public/requests/${encodeURIComponent(requestId)}/pipeline`
          + `?consumer_id=${encodeURIComponent(consumerId)}`,
        { headers: { "X-Service-Secret": secret } },
      );
      if (!portalRes.ok) return Response.error(res, await portalRes.text(), portalRes.status, "PORTAL_ERROR");
      return Response.ok(res, await portalRes.json());
    } catch (_e) {
      return Response.error(res, "Portal request failed", 502, "PORTAL_REQUEST_FAILED");
    }
  }

  // ── POST action=relist ─────────────────────────────────────────────────────
  if (action === "relist") {
    if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);
    if (!portalUrl || !secret) return Response.error(res, "Portal not configured", 503, "NOT_CONFIGURED");

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
      if (!portalRes.ok) return Response.error(res, await portalRes.text(), portalRes.status, "PORTAL_ERROR");
      return Response.ok(res, await portalRes.json());
    } catch (_e) {
      return Response.error(res, "Portal request failed", 502, "REQUEST_FAILED");
    }
  }

  // ── GET action=couple ───────────────────────────────────────────────────
  if (action === "couple") {
    if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);
    return getCouple(consumerId, res);
  }

  // ── POST action=invitation-create ───────────────────────────────────────
  if (action === "invitation-create") {
    if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);
    return invitationCreate(req.body ?? {}, consumerId, res);
  }

  // ── POST action=invitation-respond ──────────────────────────────────────
  if (action === "invitation-respond") {
    if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);
    return invitationRespond(req.body ?? {}, consumerId, res);
  }

  // ── POST action=invitation-revoke ───────────────────────────────────────
  if (action === "invitation-revoke") {
    if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);
    return invitationRevoke(req.body ?? {}, consumerId, res);
  }

  return Response.error(res, `Unknown action: ${action ?? ""}`, 400, "UNKNOWN_ACTION");
}

// ── invitation-preview (public) ─────────────────────────────────────────────

async function invitationPreview(req: any, res: any): Promise<void> {
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

// ── couple ───────────────────────────────────────────────────────────────
// Symmetric for either partner: the query matches on client_a_id OR
// client_b_id = caller, so both partners' sessions get the identical row.

async function getCouple(userId: string, res: any): Promise<void> {
  const db = getServiceDb();

  const { data: couple } = await (db as any)
    .from("couple_link")
    .select("id, client_a_id, client_b_id, status, verified_at, created_at")
    .or(`client_a_id.eq.${userId},client_b_id.eq.${userId}`)
    .neq("status", "dissolved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!couple) {
    const { data: me } = await (db as any).from("clients").select("email").eq("id", userId).single();

    const [{ data: sent }, { data: received }] = await Promise.all([
      (db as any)
        .from("request_invitation")
        .select("id, request_id, invited_email, status, expires_at")
        .eq("inviter_client_id", userId)
        .eq("status", "pending"),
      me?.email
        ? (db as any)
            .from("request_invitation")
            .select("id, request_id, inviter_client_id, status, expires_at")
            .eq("invited_email", me.email.toLowerCase())
            .eq("status", "pending")
        : { data: [] },
    ]);

    return Response.ok(res, {
      couple: null,
      pendingInvitationsSent: sent ?? [],
      pendingInvitationsReceived: received ?? [],
    });
  }

  const partnerId = couple.client_a_id === userId ? couple.client_b_id : couple.client_a_id;

  const [{ data: partner }, { data: relDoc }, { data: participantRows }] = await Promise.all([
    (db as any).from("clients").select("id, full_name, first_name").eq("id", partnerId).single(),
    (db as any)
      .from("couple_relationship_document")
      .select("verification_status, reject_reason, created_at")
      .eq("couple_link_id", couple.id)
      .maybeSingle(),
    (db as any)
      .from("request_participant")
      .select("request_id")
      .in("client_id", [couple.client_a_id, couple.client_b_id]),
  ]);

  const requestCounts = new Map<string, number>();
  for (const row of participantRows ?? []) {
    requestCounts.set(row.request_id, (requestCounts.get(row.request_id) ?? 0) + 1);
  }
  const jointRequestIds = [...requestCounts.entries()].filter(([, n]) => n === 2).map(([id]) => id);

  let jointRequests: unknown[] = [];
  if (jointRequestIds.length) {
    const { data } = await (db as any)
      .from("requests")
      .select("id, product_type, amount, status, created_at")
      .in("id", jointRequestIds)
      .order("created_at", { ascending: false });
    jointRequests = data ?? [];
  }

  return Response.ok(res, {
    couple: {
      id: couple.id,
      status: couple.status,
      verifiedAt: couple.verified_at,
      partner: partner ? { id: partner.id, name: partner.full_name ?? partner.first_name ?? "Partner" } : null,
      relationshipDocument: relDoc ?? null,
    },
    jointRequests,
  });
}

// ── invitation-create ────────────────────────────────────────────────────

async function invitationCreate(body: Record<string, unknown>, userId: string, res: any): Promise<void> {
  const {
    requestId,
    invitedEmail,
    invitedPhone,
    proposedRole,
    proposedLiability,
    proposedOwnershipBps,
  } = body as {
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

  const { data: inviter } = await (db as any).from("clients").select("full_name").eq("id", userId).single();

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
    console.error("[request-actions:invitation-create] rpc error:", rpcErr);
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

// ── invitation-respond ───────────────────────────────────────────────────

async function invitationRespond(body: Record<string, unknown>, userId: string, res: any): Promise<void> {
  const { token, respondAction } = body as { token?: string; respondAction?: "accept" | "decline" };
  if (!token || (respondAction !== "accept" && respondAction !== "decline")) {
    return Response.error(res, "Missing token or invalid respondAction", 400, "INVALID_BODY");
  }

  const db = getServiceDb();
  const tokenHash = hashToken(token);

  if (respondAction === "decline") {
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

// ── invitation-revoke ────────────────────────────────────────────────────

async function invitationRevoke(body: Record<string, unknown>, userId: string, res: any): Promise<void> {
  const { invitationId } = body as { invitationId?: string };
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
