/**
 * api/couple.ts
 * GET /api/couple
 *
 * Returns the caller's couple_link (if any), certificate verification
 * status, partner's basic profile, and joint requests — the data source
 * for the Couple page. Symmetric: whichever partner calls this, the query
 * matches on (client_a_id = me OR client_b_id = me), so both profiles see
 * the identical record. Also returns pending invitations the caller sent
 * or received, so the page works before a couple_link exists yet.
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
    console.error("[couple] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
    return Response.error(res, `Unexpected error: ${msg}`, 500, "UNEXPECTED");
  }
}

async function _handler(req: any, res: any): Promise<void> {
  if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);

  let userId: string;
  try {
    const user = await requireUser(req);
    userId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

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
    // No couple yet — surface any pending invitations so the page still has
    // something to render (invite sent / invite received).
    const [{ data: sent }, { data: received }] = await Promise.all([
      (db as any)
        .from("request_invitation")
        .select("id, request_id, invited_email, status, expires_at")
        .eq("inviter_client_id", userId)
        .eq("status", "pending"),
      (db as any).from("clients").select("email").eq("id", userId).single()
        .then(async ({ data: me }: any) => {
          if (!me?.email) return { data: [] };
          return (db as any)
            .from("request_invitation")
            .select("id, request_id, inviter_client_id, status, expires_at")
            .eq("invited_email", me.email.toLowerCase())
            .eq("status", "pending");
        }),
    ]);

    return Response.ok(res, { couple: null, pendingInvitationsSent: sent ?? [], pendingInvitationsReceived: received ?? [] });
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

  // Joint requests = requests where BOTH partners are participants
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
