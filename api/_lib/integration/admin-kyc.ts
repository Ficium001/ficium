/**
 * KYC review queue reads, borrower side: POST /api/internal?op=admin-kyc
 *
 * The app admin site (ficium-admin) owns KYC review decisions; it never
 * connects to this database. To show staff a case it calls here, HMAC-signed
 * with the same ADMIN_SYNC keys and 300 s window as admin-sync. Reads go
 * through service_role-only functions (admin_kyc_cases / admin_kyc_case);
 * document images are returned as storage links that expire in 5 minutes.
 * Decisions come back through admin-sync (topic kyc.case_decided), not here.
 *
 *   { "action": "list" }                          -> { cases: [...] }
 *   { "action": "case", "submission_id": uuid }   -> { case: {..., documents: {id: url, ...}} }
 */
import { ContractError, verify } from "@ficium/contract";
import type { Result } from "./core.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 4_096;
export const LINK_TTL_S = 300;

export type AdminKycDeps = {
  list: () => Promise<unknown[]>;
  getCase: (submissionId: string) => Promise<Record<string, any> | null>;
  signLink: (path: string) => Promise<string | null>;
};

const err = (status: number, error: string): Result => ({ status, body: { error } });

export async function receiveAdminKyc(
  raw: Buffer, signatureHeader: string, verifyKeys: string[], deps: AdminKycDeps, now?: number,
): Promise<Result> {
  if (verifyKeys.length === 0) return err(503, "admin_sync_disabled");
  if (raw.length > MAX_BODY) return err(413, "body_too_large");
  try {
    verify(signatureHeader, raw, verifyKeys, now);
  } catch (e) {
    if (e instanceof ContractError) return err(401, "bad_signature");
    throw e;
  }
  let b: { action?: unknown; submission_id?: unknown };
  try { b = JSON.parse(raw.toString("utf8")); } catch { return err(422, "invalid_json"); }

  if (b?.action === "list") return { status: 200, body: { cases: await deps.list() } };

  if (b?.action === "case") {
    if (!UUID.test(String(b.submission_id))) return err(422, "invalid_submission_id");
    const c = await deps.getCase(String(b.submission_id));
    if (!c) return err(404, "not_found");
    const paths = (c.paths ?? {}) as Record<string, string | null>;
    const documents: Record<string, string | null> = {};
    for (const [k, p] of Object.entries(paths)) {
      // Only files in the borrower's own folder are ever linked.
      documents[k] = p && p.startsWith(`${c.client_id}/`) && !p.includes("..") ? await deps.signLink(p) : null;
    }
    delete c.paths;
    return { status: 200, body: { case: { ...c, documents, links_expire_in_s: LINK_TTL_S } } };
  }
  return err(422, "unknown_action");
}
