/**
 * api/request-bids.ts
 * GET ?requestId= → Bid[] for one of the caller's requests.
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
  if (req.method !== "GET") return Response.methodNotAllowed(res, ["GET"]);
  let consumerId: string;
  try {
    consumerId = (await requireUser(req)).id;
  } catch (e) {
    if (sendAuthError(res, e)) return;
    return Response.error(res, "Auth check failed", 500, "AUTH_ERROR");
  }
  const requestId = req.query?.requestId as string | undefined;
  if (!requestId) return Response.error(res, "Missing requestId", 400, "MISSING_PARAM");
  try {
    const byRequest = await bidsFor(getServiceDb(), consumerId, [requestId]);
    if (!(requestId in byRequest)) return Response.error(res, "Request not found", 404, "NOT_FOUND");
    return Response.ok(res, byRequest[requestId]);
  } catch {
    return Response.error(res, "Couldn't load bids", 500, "BIDS_ERROR");
  }
}
