/**
 * Integration contract v1, borrower side. Mounted on api/internal.ts (the
 * project is at Vercel Hobby's 12-function limit, so no new function file):
 *
 *   POST /api/internal?op=events    inbound events from the institution app
 *                                   (I2B signature, validated, institution-only)
 *   POST /api/internal?op=admin-sync  change from the app admin site (ADMIN_SYNC signed)
 *   POST /api/internal?op=admin-kyc   KYC review queue reads for the app admin site (ADMIN_SYNC signed)
 *   POST /api/internal?op=dispatch  send pending outbox rows (B2I signed).
 *                                      Triggered every minute by pg_cron.
 *                                      Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Inert until INTEGRATION_* env vars are set. Never uses APP_SERVICE_SECRET.
 */
import { timingSafeEqual } from "node:crypto";
import { getServiceDb } from "../db.js";
import { Env } from "../env.js";
import { dispatchOnce, receive } from "./core.js";
import { appliers, outboxStore } from "./supabase.js";
import { receiveAdminSync } from "./admin-sync.js";
import { LINK_TTL_S, receiveAdminKyc } from "./admin-kyc.js";

/** True when this request is for the integration channel, not a legacy action. */
export function isIntegrationRequest(req: { url?: string }): boolean {
  const op = new URL(req.url ?? "", "http://localhost").searchParams.get("op");
  return op === "events" || op === "dispatch" || op === "admin-sync" || op === "admin-kyc";
}

async function readRaw(req: AsyncIterable<Buffer | string>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

function bearerOk(header: string | undefined, secret: string): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleIntegration(req: any, res: any): Promise<void> {
  const op = new URL(req.url ?? "", "http://localhost").searchParams.get("op");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (op === "events") {
    const raw = await readRaw(req);
    const result = await receive(
      raw,
      String(req.headers["ficium-signature"] ?? ""),
      Env.integrationI2bVerifyKeys(),
      appliers(getServiceDb()),
    );
    return res.status(result.status).json(result.body);
  }

  if (op === "admin-sync") {
    const raw = await readRaw(req);
    const db = getServiceDb();
    const result = await receiveAdminSync(raw, String(req.headers["ficium-signature"] ?? ""), Env.adminSyncVerifyKeys(),
      async (e) => {
        const { data, error } = await db.rpc("admin_sync_apply", {
          p_event_id: e.event_id, p_topic: e.topic, p_aggregate_type: e.aggregate_type,
          p_aggregate_id: e.aggregate_id, p_version: e.aggregate_version, p_payload: e.payload,
        });
        if (error) throw new Error(`admin_sync_apply: ${error.message}`);
        return String(data);
      });
    return res.status(result.status).json(result.body);
  }

  if (op === "admin-kyc") {
    const raw = await readRaw(req);
    const db = getServiceDb();
    const result = await receiveAdminKyc(raw, String(req.headers["ficium-signature"] ?? ""), Env.adminSyncVerifyKeys(), {
      list: async () => {
        const { data, error } = await db.rpc("admin_kyc_cases", { p_limit: 200 });
        if (error) throw new Error(`admin_kyc_cases: ${error.message}`);
        return (data ?? []) as unknown[];
      },
      getCase: async (id) => {
        const { data, error } = await db.rpc("admin_kyc_case", { p_submission: id });
        if (error) throw new Error(`admin_kyc_case: ${error.message}`);
        return (data ?? null) as Record<string, unknown> | null;
      },
      signLink: async (path) => {
        const { data, error } = await db.storage.from("kyc-documents").createSignedUrl(path, LINK_TTL_S);
        if (error) { console.error("[admin-kyc] sign failed", error.message); return null; }
        return data?.signedUrl ?? null;
      },
    });
    res.setHeader?.("Cache-Control", "no-store");
    return res.status(result.status).json(result.body);
  }

  if (op === "dispatch") {
    if (!bearerOk(req.headers.authorization, Env.cronSecret())) return res.status(401).json({ error: "Unauthorized" });
    const url = Env.integrationPeerUrl();
    const key = Env.integrationB2iSigningKey();
    if (!url || !key) return res.status(503).json({ error: "integration_disabled" });
    const counts = await dispatchOnce(outboxStore(getServiceDb()), fetch, url, key);
    return res.status(200).json(counts);
  }

  return res.status(404).json({ error: "Unknown op" });
}
