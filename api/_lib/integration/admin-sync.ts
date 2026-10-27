/**
 * Admin sync, borrower side: POST /api/internal?op=admin-sync
 *
 * The app admin site (ficium-admin) is the master for KYC policy, offers and
 * platform settings. Its outbox worker sends each change here over HTTPS,
 * HMAC-signed (Ficium-Signature, same scheme and 300 s window as the
 * integration contract) with ADMIN_SYNC keys. The admin site never connects to
 * this database. admin.sync_apply makes each event idempotent and versioned:
 * a redelivery answers 'duplicate', an older version 'stale'.
 */
import { ContractError, verify } from "@ficium/contract";
import type { Result } from "./core.js";

export type SyncEvent = {
  event_id: string; topic: string; aggregate_type: string; aggregate_id: string;
  aggregate_version: number; payload: Record<string, unknown>;
};
export type ApplySync = (e: SyncEvent) => Promise<string>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME = /^[a-z][a-z0-9_.]{0,63}$/;
const MAX_BODY = 256_000;
const OUTCOMES = new Set(["applied", "stale", "duplicate"]);

const err = (status: number, error: string): Result => ({ status, body: { error } });

export async function receiveAdminSync(
  raw: Buffer, signatureHeader: string, verifyKeys: string[], apply: ApplySync, now?: number,
): Promise<Result> {
  if (verifyKeys.length === 0) return err(503, "admin_sync_disabled");
  if (raw.length > MAX_BODY) return err(413, "body_too_large");
  try {
    verify(signatureHeader, raw, verifyKeys, now);
  } catch (e) {
    if (e instanceof ContractError) return err(401, "bad_signature");
    throw e;
  }
  let e: SyncEvent;
  try { e = JSON.parse(raw.toString("utf8")); } catch { return err(422, "invalid_json"); }
  const ok = e && typeof e === "object"
    && UUID.test(String(e.event_id))
    && NAME.test(String(e.topic)) && NAME.test(String(e.aggregate_type))
    && typeof e.aggregate_id === "string" && e.aggregate_id.length > 0 && e.aggregate_id.length <= 200
    && Number.isSafeInteger(e.aggregate_version) && e.aggregate_version > 0
    && e.payload !== null && typeof e.payload === "object" && !Array.isArray(e.payload);
  if (!ok) return err(422, "invalid_event");

  const outcome = await apply(e);
  if (!OUTCOMES.has(outcome)) return err(500, "unexpected_outcome");
  return { status: 200, body: { outcome } };
}
