/**
 * api/integration.ts — integration contract v1, borrower side.
 *
 *   POST /api/integration?op=events    inbound events from the institution app
 *                                      (I2B signature, validated, institution-only)
 *   POST /api/integration?op=dispatch  send pending outbox rows (B2I signed).
 *                                      Triggered every minute by pg_cron.
 *                                      Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Inert until INTEGRATION_* env vars are set. Never uses APP_SERVICE_SECRET.
 */
import { timingSafeEqual } from "node:crypto";
import { getServiceDb } from "./_lib/db.js";
import { Env } from "./_lib/env.js";
import { dispatchOnce, receive } from "./_lib/integration/core.js";
import { appliers, outboxStore } from "./_lib/integration/supabase.js";

export const config = { runtime: "nodejs" };

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

export default async function handler(req: any, res: any): Promise<void> {
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
