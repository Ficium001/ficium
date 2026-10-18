/**
 * api/request-bids-bulk.ts
 * POST { requestIds: string[] } → { [requestId]: Bid[] } for the caller's requests (one round trip).
 *
 * Reads the borrower side's own copy of the bid events. No direct link to the portal: this used to call
 * portal-api with the shared secret and the borrower's account id.
 */
import { Response } from "./_lib/response.js";
import { requireUser, sendAuthError } from "./_lib/auth.js";
import { getServiceDb } from "./_lib/db.js";
import { bidsFor } from "./_lib/handlers/bids-read.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);
  let consumerId: string;
  try {
    consumerId = (await requireUser(req)).id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }
  const body = req.body as { requestIds?: unknown };
  const requestIds = Array.isArray(body?.requestIds) ? body.requestIds : [];
  try {
    return Response.ok(res, await bidsFor(getServiceDb(), consumerId, requestIds));
  } catch {
    return Response.error(res, "Couldn't load bids", 500, "BIDS_ERROR");
  }
}
