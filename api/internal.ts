/**
 * api/internal.ts
 * POST /api/internal
 *
 * Single entry point for all service-to-service (pg_net → Vercel) calls.
 * Routes by the `action` field in the request body.
 *
 * This consolidation keeps us within Vercel Hobby's 12-function limit.
 * When upgrading to Pro, each action can be split back into its own file
 * with zero logic changes — handlers are imported as pure functions.
 *
 * Actions (callers are this app's own database, via pg_net; never the portal):
 *   vault-extract     → extract structured data from an uploaded document
 *   request-expiring  → warn a borrower that a request's deadline is near
 *
 * bid-notify and bid-accepted were removed (2026-11-14): they were the portal's old direct line
 * into this app. Bids and acceptances now arrive only as signed contract events (?op=events),
 * which write the borrower's notifications in the same transaction.
 *
 * Auth: X-Service-Secret header on every request (same shared secret).
 * All handlers are idempotent and non-fatal on downstream errors.
 */

import { timingSafeEqual } from "node:crypto";
import { Env }  from "./_lib/env.js";
import { handleIntegration, isIntegrationRequest } from "./_lib/integration/handler.js";

// ── Import handler logic from co-located modules ───────────────────────────
// Each module exports a named `handle` function that receives (body, res).
// They never look at headers — auth is checked once here at the router level.

import { handle as handleVaultExtract }    from "./_lib/handlers/vault-extract.js";
import { handle as handleRequestExpiring } from "./_lib/handlers/request-expiring.js";

export const config = { runtime: "nodejs" };

type Action = "vault-extract" | "request-expiring";

const HANDLERS: Record<Action, (body: unknown, res: any) => Promise<void>> = {
  "vault-extract":     handleVaultExtract,
  "request-expiring":  handleRequestExpiring,
};
export default async function handler(req: any, res: any): Promise<void> {
  // Integration contract v1 (?op=events|dispatch). Checked BEFORE the legacy
  // X-Service-Secret gate: it has its own auth (HMAC signature / CRON_SECRET)
  // and must read the raw body before anything parses it.
  if (isIntegrationRequest(req)) return handleIntegration(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const secret = String(req.headers["x-service-secret"] ?? "");
  const expected = Env.appServiceSecret() ?? "";
  // Constant-time compare: a plain !== leaks how many leading characters matched.
  const a = Buffer.from(secret), b = Buffer.from(expected);
  if (!secret || !expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // ── Route ─────────────────────────────────────────────────────────────────
  const { action, ...body } = (req.body ?? {}) as { action?: string } & Record<string, unknown>;

  if (!action || !(action in HANDLERS)) {
    return res.status(400).json({
      error:   "Unknown or missing action",
      valid:   Object.keys(HANDLERS),
    });
  }

  return HANDLERS[action as Action](body, res);
}
