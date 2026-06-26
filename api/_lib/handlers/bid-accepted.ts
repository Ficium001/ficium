/**
 * _lib/handlers/bid-accepted.ts
 *
 * Writes a bid_accepted notification after a consumer accepts a bid.
 * Called from accept-bid.ts after portal-api returns successfully.
 */
import { getServiceDb } from "../db.js";

interface AcceptedPayload {
  client_id:        string;
  request_id:       string;
  bid_id:           string;
  institution_name: string;
  rate:             number;   // decimal e.g. 0.02 = 2%
  rate_type:        string;
  amount_offered:   number;
  term_months:      number | null;
}

function fmtMUR(n: number): string {
  if (n >= 1_000_000) return `MUR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `MUR ${Math.round(n / 1_000)}K`;
  return `MUR ${n.toLocaleString()}`;
}

export async function writeBidAcceptedNotification(p: AcceptedPayload): Promise<void> {
  const db      = getServiceDb();
  const termStr = p.term_months ? ` over ${p.term_months} months` : "";
  // rate comes as decimal (0.02) from portal-api — convert to percentage for display
  const rateDisplay = (p.rate * 100).toFixed(2);

  try {
    // Idempotent check — use count instead of maybeSingle to avoid throw on no rows
    const { count } = await (db as any)
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", p.client_id)
      .eq("kind", "bid_accepted")
      .eq("metadata->>bid_id", p.bid_id);

    if (count && count > 0) return;

    const { error } = await (db as any).from("notifications").insert({
      user_id:  p.client_id,
      kind:     "bid_accepted",
      title:    `Offer accepted — ${p.institution_name} will be in touch`,
      body:     `You accepted ${fmtMUR(p.amount_offered)} at ${rateDisplay}% p.a.${termStr}. Expect contact within 2 business days.`,
      link:     `/requests/${p.request_id}`,
      metadata: { bid_id: p.bid_id, request_id: p.request_id },
    });

    if (error) console.error("[bid-accepted] notification insert error:", error);
  } catch (e) {
    console.error("[bid-accepted] notification failed:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handle(body: unknown, res: any): Promise<void> {
  const p = body as Partial<AcceptedPayload>;
  if (!p.client_id || !p.request_id || !p.bid_id) {
    return res.status(400).json({ error: "client_id, request_id, bid_id required" });
  }
  await writeBidAcceptedNotification(p as AcceptedPayload);
  return res.status(200).json({ ok: true });
}
