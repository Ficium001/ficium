/**
 * api/accept-bid.ts
 * POST /api/accept-bid
 *
 * Phase 2 identity reveal — orchestration layer.
 *
 * Responsibilities:
 *   1. Verify the caller's Supabase session.
 *   2. Confirm they own the request (IDOR guard — App DB).
 *   3. The contract acceptance call (ficium-integration step 5), the only path: only the fields the
 *      borrower released leave this side, signed, audited in the App DB. The legacy direct call to
 *      portal-api (shared secret + raw account id) was removed: no direct link between the apps.
 *   4. Record the acceptance in the App DB: integration_complete_acceptance writes the audit row,
 *      requests.status/accepted_bid_id and bid_acceptances in ONE transaction. If that fails after
 *      the bank side committed, the borrower is told to tap Accept again: the retry reuses the
 *      same consent_ref, the bank side answers from its idempotency log, and the write is redone.
 *   5. Return Phase 2 institution contact to the browser.
 *
 * Env required (Vercel + .env):
 *   INTEGRATION_ACCEPTANCE_ENABLED, INTEGRATION_ACCEPT_URL, INTEGRATION_ACCEPT_SIGNING_KEY,
 *   SUPABASE_URL / VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { Env }                                    from "./_lib/env.js";
import { Response }                               from "./_lib/response.js";
import { requireUser, requireOwnership, sendAuthError } from "./_lib/auth.js";
import { writeBidAcceptedNotification }           from "./_lib/handlers/bid-accepted.js";
import { getServiceDb }                           from "./_lib/db.js";
import { acceptViaContract, type Prepared }       from "./_lib/integration/acceptance.js";

export const config = { runtime: "nodejs" };
export default async function handler(req: any, res: any): Promise<void> {
  try {
    return await _handler(req, res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[accept-bid] UNCAUGHT:", msg, e instanceof Error ? e.stack : "");
    // Internal detail stays in the logs; the browser gets a generic message.
    return Response.error(res, "Accepting this offer failed. Nothing was changed. Try again shortly.", 500, "UNEXPECTED");
  }
}
async function _handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  let consumerId: string;
  try {
    const user = await requireUser(req);
    consumerId = user.id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }

  const { requestId, bidId } = (req.body ?? {}) as {
    requestId?: string;
    bidId?: string;
  };

  if (!requestId || !bidId) {
    return Response.error(res, "Missing requestId or bidId", 400, "INVALID_BODY");
  }

  // ── 2. Ownership guard (App DB) ────────────────────────────────────────────
  const supabaseUrl = Env.supabaseUrl();
  const serviceKey  = Env.supabaseServiceKey();
  if (!supabaseUrl || !serviceKey) {
    return Response.error(res, "Auth not configured", 503, "AUTH_NOT_CONFIGURED");
  }

  const ownerRes = await fetch(
    `${supabaseUrl}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}&select=client_id,status`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!ownerRes.ok) return Response.error(res, "Request lookup failed", 502, "LOOKUP_FAILED");

  const rows = (await ownerRes.json()) as Array<{ client_id: string; status: string }>;
  if (!rows.length) return Response.error(res, "Request not found", 404, "NOT_FOUND");

  try {
    requireOwnership({ id: consumerId, email: null, role: null }, rows[0].client_id);
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Ownership check failed", 403, "FORBIDDEN");
  }

  if (rows[0].status === "accepted") {
    return Response.error(res, "Request already accepted", 409, "ALREADY_ACCEPTED");
  }

  // ── 3. Contract acceptance call — Phase 2 reveal ──────────────────────────
  // Contract acceptance is the only path (no direct link to the portal).
  if (!Env.integrationAcceptanceEnabled()) {
    return Response.error(res, "Accepting bids is unavailable right now", 503, "ACCEPTANCE_DISABLED");
  }
  let reveal: Record<string, unknown>;
  {
    // Contract path (step 5): only the borrower's released fields leave this side; audited in the App DB.
    const url = Env.integrationAcceptUrl();
    const key = Env.integrationAcceptSigningKey();
    if (!url || !key) {
      return Response.error(res, "Acceptance call not configured", 503, "ACCEPTANCE_NOT_CONFIGURED");
    }
    const db = getServiceDb();
    let notSaved = false;
    const out = await acceptViaContract(
      {
        async prepare(c, r, b) {
          const { data, error } = await (db as any).rpc("integration_prepare_acceptance", { p_client: c, p_request: r, p_bid: b });
          if (error) throw new Error(error.message);
          return data as Prepared;
        },
        async complete(ref, outcome, inst) {
          const { error } = await (db as any).rpc("integration_complete_acceptance", { p_consent_ref: ref, p_outcome: outcome, p_institution: inst });
          if (error) {
            console.error("[accept-bid] completion failed:", outcome, error.message);
            if (outcome === "accepted") notSaved = true;
          }
        },
        fetchFn: fetch,
        url,
        signingKey: key,
      },
      consumerId,
      requestId,
      bidId,
    );
    if (out.status !== 200 || !out.reveal) {
      console.error("[accept-bid] contract acceptance failed:", out.status, out.error);
      // out.error comes from the bank side or the network: log it, never show it.
      const status = out.status >= 400 && out.status < 500 ? out.status : 502;
      return Response.error(res, "The lender couldn't confirm this acceptance. Nothing was changed. Try again shortly.", status, "ACCEPTANCE_FAILED");
    }
    if (notSaved) {
      // The bank has the acceptance; this side didn't record it. Never report success on a state the
      // borrower's own app doesn't show. A retry is safe and finishes the job (see header, step 4).
      return Response.error(res, "Your acceptance reached the lender but wasn't saved here. Tap Accept again to finish. It won't be accepted twice.", 503, "ACCEPTANCE_NOT_SAVED");
    }
    reveal = out.reveal;
  }

  // ── 4. Notification (fire-and-forget) ─────────────────────────────────────
  writeBidAcceptedNotification({
    client_id:        consumerId,
    request_id:       requestId,
    bid_id:           bidId,
    institution_name: (reveal.institution_name as string) ?? "your lender",
    rate:             Number(reveal.rate)           || 0,
    rate_type:        (reveal.rate_type as string)  ?? "fixed",
    amount_offered:   Number(reveal.amount_offered) || 0,
    term_months:      reveal.term_months ? Number(reveal.term_months) : null,
  }).catch((e) => console.error("[accept-bid] notification error:", e));

  return Response.ok(res, reveal);
}
