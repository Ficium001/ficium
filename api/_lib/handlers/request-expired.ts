/**
 * _lib/handlers/request-expired.ts
 *
 * Writes a bid_expired in-app notification when a request window
 * closes with zero bids. Fired by marketplace.close_expired_windows()
 * on the Portal DB after updating status to 'expired'.
 */
import { getServiceDb } from "../db.js";

interface ExpiredPayload {
  request_id:   string;
  consumer_ref: string;
  bid_count:    number;
}
export async function handle(body: unknown, res: any): Promise<void> {
  const p = body as Partial<ExpiredPayload>;
  if (!p.request_id) {
    return res.status(400).json({ error: "request_id required" });
  }

  const db = getServiceDb();

  // Resolve client_id from App DB
  const { data: appReq } = await (db as any)
    .from("requests")
    .select("client_id")
    .eq("id", p.request_id)
    .single() as { data: { client_id: string } | null };

  if (!appReq) {
    console.warn("[request-expired] request not found on App DB:", p.request_id);
    return res.status(200).json({ ok: false, reason: "request_not_found" });
  }

  // Idempotency
  const { data: existing } = await (db as any)
    .from("notifications")
    .select("id")
    .eq("user_id", appReq.client_id)
    .eq("kind", "bid_expired")
    .filter("metadata->>request_id", "eq", p.request_id)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) return res.status(200).json({ ok: true, written: false, reason: "duplicate" });

  const { error } = await (db as any).from("notifications").insert({
    user_id:  appReq.client_id,
    kind:     "bid_expired",
    title:    "Your request closed with no offers",
    body:     "No lenders placed a bid before your window closed. You can post a new request at any time.",
    link:     `/requests/${p.request_id}`,
    metadata: { request_id: p.request_id },
  });

  if (error) {
    console.error("[request-expired] insert error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, written: true, clientId: appReq.client_id });
}
