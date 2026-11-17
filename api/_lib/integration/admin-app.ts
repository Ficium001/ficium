/**
 * Mobile app monitoring for the app admin site, borrower side: POST /api/internal?op=admin-app
 *
 * Same channel and keys as admin-kyc and admin-clients (HMAC-signed with ADMIN_SYNC keys, 300 s
 * window). The admin site never connects to this database: it gets one service_role-only read
 * that returns the release policy as applied here and how many borrowers used each app version
 * recently. Totals only: no borrower is identified.
 * Changing the policy comes back through admin-sync (topic app.release_policy_changed), never here.
 *
 *   { "action": "stats" } -> { stats: { generated_at, policy: [...], versions: [...] } }
 *   { "action": "traffic" } -> { traffic: { generated_at, window_hours, channels: [...] } }   (API traffic page)
 * A pause or resume of an API channel comes back through admin-sync (topic api.channel_policy_changed).
 */
import { ContractError, verify } from "@ficium/contract";
import type { Result } from "./core.js";

const MAX_BODY = 256;

export type AdminAppDeps = { stats: () => Promise<Record<string, unknown>>; traffic?: () => Promise<Record<string, unknown>> };

const err = (status: number, error: string): Result => ({ status, body: { error } });

export async function receiveAdminApp(
  raw: Buffer, signatureHeader: string, verifyKeys: string[], deps: AdminAppDeps, now?: number,
): Promise<Result> {
  if (verifyKeys.length === 0) return err(503, "admin_sync_disabled");
  if (raw.length > MAX_BODY) return err(413, "body_too_large");
  try {
    verify(signatureHeader, raw, verifyKeys, now);
  } catch (e) {
    if (e instanceof ContractError) return err(401, "bad_signature");
    throw e;
  }
  let b: { action?: unknown };
  try { b = JSON.parse(raw.toString("utf8")); } catch { return err(422, "invalid_json"); }

  if (b?.action === "stats") return { status: 200, body: { stats: await deps.stats() } };
  if (b?.action === "traffic" && deps.traffic) return { status: 200, body: { traffic: await deps.traffic() } };
  return err(422, "unknown_action");
}
