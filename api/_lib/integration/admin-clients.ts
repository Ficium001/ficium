/**
 * Borrower lookup for the app admin site, borrower side: POST /api/internal?op=admin-clients
 *
 * Same channel and keys as admin-kyc (HMAC-signed with ADMIN_SYNC keys, 300 s window). The admin
 * site never connects to this database: reads go through two service_role-only functions that
 * return only what support needs (no date of birth, address, NIC, income or documents).
 * Suspending or reinstating comes back through admin-sync (topic client.access_changed), never here.
 *
 *   { "action": "search", "q": "jane@" }          -> { clients: [...] }   (3 to 100 characters)
 *   { "action": "client", "client_id": uuid }      -> { client: {...} }
 */
import { ContractError, verify } from "@ficium/contract";
import type { Result } from "./core.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 2_048;

export type AdminClientsDeps = {
  search: (q: string) => Promise<unknown[]>;
  get: (clientId: string) => Promise<Record<string, unknown> | null>;
};

const err = (status: number, error: string): Result => ({ status, body: { error } });

export async function receiveAdminClients(
  raw: Buffer, signatureHeader: string, verifyKeys: string[], deps: AdminClientsDeps, now?: number,
): Promise<Result> {
  if (verifyKeys.length === 0) return err(503, "admin_sync_disabled");
  if (raw.length > MAX_BODY) return err(413, "body_too_large");
  try {
    verify(signatureHeader, raw, verifyKeys, now);
  } catch (e) {
    if (e instanceof ContractError) return err(401, "bad_signature");
    throw e;
  }
  let b: { action?: unknown; q?: unknown; client_id?: unknown };
  try { b = JSON.parse(raw.toString("utf8")); } catch { return err(422, "invalid_json"); }

  if (b?.action === "search") {
    const q = typeof b.q === "string" ? b.q.trim() : "";
    if (q.length < 3 || q.length > 100) return err(422, "invalid_query");
    return { status: 200, body: { clients: await deps.search(q) } };
  }
  if (b?.action === "client") {
    if (!UUID.test(String(b.client_id))) return err(422, "invalid_client_id");
    const c = await deps.get(String(b.client_id));
    if (!c) return err(404, "not_found");
    return { status: 200, body: { client: c } };
  }
  return err(422, "unknown_action");
}
