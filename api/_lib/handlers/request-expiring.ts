/**
 * _lib/handlers/request-expiring.ts
 *
 * Writes a request_expiring in-app notification + sends email.
 * Fired by pg_cron hourly from App DB (notify_expiring_requests())
 * for requests with decision_deadline 23-25h away.
 * Idempotent: DB function pre-checks before firing, but handler
 * double-checks before insert.
 */
import { getServiceDb } from "../db.js";

interface ExpiringPayload {
  request_id:   string;
  client_id:    string;
  product_type: string;
  amount:       number;
  deadline:     string;
}

function fmtMUR(n: number): string {
  if (n >= 1_000_000) return `MUR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `MUR ${Math.round(n / 1_000)}K`;
  return `MUR ${n.toLocaleString()}`;
}

function fmtProductLabel(code: string): string {
  const labels: Record<string, string> = {
    credit_card:    "Credit Card",
    mortgage:       "Mortgage",
    personal_loan:  "Personal Loan",
    auto:           "Auto Loan",
    business_loan:  "Business Loan",
  };
  return labels[code] ?? code.replace(/_/g, " ");
}
export async function handle(body: unknown, res: any): Promise<void> {
  const p = body as Partial<ExpiringPayload>;
  if (!p.request_id || !p.client_id) {
    return res.status(400).json({ error: "request_id and client_id required" });
  }

  const db     = getServiceDb();
  const label  = fmtProductLabel(p.product_type ?? "");
  const amount = fmtMUR(Number(p.amount) || 0);
  const now    = new Date().toISOString();

  // Idempotency
  const { data: existing } = await (db as any)
    .from("notifications")
    .select("id")
    .eq("user_id", p.client_id)
    .eq("kind", "request_expiring")
    .filter("metadata->>request_id", "eq", p.request_id)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) return res.status(200).json({ ok: true, written: false, reason: "duplicate" });

  const { error } = await (db as any).from("notifications").insert({
    user_id:  p.client_id,
    kind:     "request_expiring",
    title:    `Your ${label} request closes in 24 hours`,
    body:     `${amount} request is closing soon. Review any offers and accept before the window expires.`,
    link:     `/requests/${p.request_id}`,
    metadata: { request_id: p.request_id },
    created_at: now,
  });

  if (error) {
    console.error("[request-expiring] insert error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, written: true });
}
