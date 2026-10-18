/**
 * Bid lists from the borrower side's own copy of the bid events (integration.bid_shadow, contract v1), never
 * from the portal. Same shape as the portal endpoint these replace: per request the caller owns, its live bids,
 * cheapest first. Ownership is enforced in the RPC by the caller's id; other ids are simply absent.
 */
import type { ServiceDb } from "../db.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function bidsFor(
  db: ServiceDb, clientId: string, requestIds: unknown[],
): Promise<Record<string, unknown[]>> {
  const ids = [...new Set(requestIds.filter((x): x is string => typeof x === "string" && UUID.test(x)))].slice(0, 100);
  if (!ids.length) return {};
  const { data, error } = await (db as any).rpc("integration_bids_for", { p_client_id: clientId, p_request_ids: ids });
  if (error) throw new Error(`bids_for: ${error.message}`);
  return (data ?? {}) as Record<string, unknown[]>;
}
