/**
 * api/kyc.ts — consolidated KYC endpoint.
 *
 * One serverless function fronting every KYC handler, dispatched by
 * `?action=`. Each handler still lives in its own module under
 * api/_kyc/ (underscore-prefixed → not counted as a function by Vercel),
 * so logic stays isolated and easy to change.
 *
 * Routes (was 7 separate functions, now 1):
 *   ?action=verify        → full KYC verification pipeline   (POST)   [was /api/kyc-verify]
 *   ?action=scan           → OCR/vision NIC scan, pre-auth capable (POST)
 *   ?action=faces         → face collection (create/search/index) (POST) [was /api/kyc-faces]
 *   ?action=liveness      → liveness session/result          (POST)   [was /api/kyc-liveness]
 *   ?action=setup         → one-time collection setup         (POST)   [was /api/kyc-setup]
 */

import { verifyHandler }     from "./_kyc/verify.js";
import { scanHandler }       from "./_kyc/scan.js";
import { facesHandler }      from "./_kyc/faces.js";
import { livenessHandler }   from "./_kyc/liveness.js";
import { setupHandler }      from "./_kyc/setup.js";
import {
  requireUser, requireService, sendAuthError,
} from "./_lib/auth.js";
import { handleCors }                 from "./_lib/cors.js";

export const config = { runtime: "nodejs" };
type Handler = (req: any, res: any) => unknown | Promise<unknown>;

/** Auth level required per action. */
type Gate = "user" | "service" | "none";

const ROUTES: Record<string, { handler: Handler; gate: Gate }> = {
  // A logged-in user verifying their own identity.
  "verify":      { handler: verifyHandler,     gate: "user"    },
  // Optional auth — handler checks for a token itself (signup has none yet).
  "scan":        { handler: scanHandler,       gate: "none"    },
  // No staff operations here: staff work happens on the admin site (ficium-admin), which reaches this
  // app only through its signed API. The old in-app "notify" and "admin-faces" routes were removed
  // on 2026-11-14 (unused; admin-faces took its secret in the query string).
  // Internal / server-to-server utilities — never called from a browser.
  "faces":       { handler: facesHandler,      gate: "service" },
  "liveness":    { handler: livenessHandler,   gate: "service" },
  "setup":       { handler: setupHandler,      gate: "service" },
};
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  const action = String(req.query?.action ?? req.body?.action ?? "");
  const route  = ROUTES[action];

  if (!route) {
    return res.status(400).json({
      error: "Unknown or missing KYC action",
      action,
      available: Object.keys(ROUTES),
    });
  }

  // Fail-closed auth gate before any handler logic runs.
  try {
    if (route.gate === "none") {
      // no auth required — handler is self-contained with service-role key
    } else if (route.gate === "service") {
      requireService(req);
    } else {
      const user = await requireUser(req);
      // Handlers act for THIS user only; never for an id the browser sends.
      req.authUserId = user.id;
    }
  } catch (e) {
    if (sendAuthError(res, e)) return;
    throw e;
  }

  return route.handler(req, res);
}

