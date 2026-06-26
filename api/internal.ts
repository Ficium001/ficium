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
 * Actions:
 *   bid-notify     → notify consumer of a new bid (Portal DB trigger)
 *   vault-extract  → extract structured data from an uploaded document
 *
 * Auth: X-Service-Secret header on every request (same shared secret).
 * All handlers are idempotent and non-fatal on downstream errors.
 */

import { Env }  from "./_lib/env.js";

// ── Import handler logic from co-located modules ───────────────────────────
// Each module exports a named `handle` function that receives (body, res).
// They never look at headers — auth is checked once here at the router level.

import { handle as handleBidNotify }       from "./_lib/handlers/bid-notify.js";
import { handle as handleVaultExtract }    from "./_lib/handlers/vault-extract.js";
import { handle as handleRequestExpiring } from "./_lib/handlers/request-expiring.js";
import { handle as handleRequestExpired }  from "./_lib/handlers/request-expired.js";

export const config = { runtime: "nodejs" };

type Action = "bid-notify" | "vault-extract" | "request-expiring" | "request-expired";

const HANDLERS: Record<Action, (body: unknown, res: any) => Promise<void>> = {
  "bid-notify":        handleBidNotify,
  "vault-extract":     handleVaultExtract,
  "request-expiring":  handleRequestExpiring,
  "request-expired":   handleRequestExpired,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const secret = (req.headers["x-service-secret"] as string) ?? "";
  if (!secret || secret !== Env.appServiceSecret()) {
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
