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
 *   ?action=settings      → read/write KYC settings          (GET|POST) [was /api/kyc-settings]
 *   ?action=notify        → send applicant notification      (POST)   [was /api/kyc-notify]
 *   ?action=admin-faces   → list/delete a clients faces     (GET|DELETE) [was /api/kyc-admin-faces]
 *   ?action=faces         → face collection (create/search/index) (POST) [was /api/kyc-faces]
 *   ?action=liveness      → liveness session/result          (POST)   [was /api/kyc-liveness]
 *   ?action=setup         → one-time collection setup         (POST)   [was /api/kyc-setup]
 */

import { verifyHandler }     from "./_kyc/verify.js";
import { scanHandler }       from "./_kyc/scan.js";
import { settingsHandler }   from "./_kyc/settings.js";
import { notifyHandler }     from "./_kyc/notify.js";
import { adminFacesHandler } from "./_kyc/adminFaces.js";
import { facesHandler }      from "./_kyc/faces.js";
import { livenessHandler }   from "./_kyc/liveness.js";
import { setupHandler }      from "./_kyc/setup.js";
import {
  requireUser, requireAdmin, requireService, sendAuthError,
} from "./_lib/auth.js";

export const config = { runtime: "nodejs" };
type Handler = (req: any, res: any) => unknown | Promise<unknown>;

/** Auth level required per action. */
type Gate = "user" | "admin" | "service" | "none";

const ROUTES: Record<string, { handler: Handler; gate: Gate }> = {
  // A logged-in user verifying their own identity.
  "verify":      { handler: verifyHandler,     gate: "user"    },
  // Optional auth — handler checks for a token itself (signup has none yet).
  "scan":        { handler: scanHandler,       gate: "none"    },
  // Admin console operations.
  "settings":    { handler: settingsHandler,   gate: "none"    }, // handler uses service-role key; no client session needed
  "notify":      { handler: notifyHandler,     gate: "admin"   },
  "admin-faces": { handler: adminFacesHandler, gate: "admin"   },
  // Internal / server-to-server utilities — never called from a browser.
  "faces":       { handler: facesHandler,      gate: "service" },
  "liveness":    { handler: livenessHandler,   gate: "service" },
  "setup":       { handler: setupHandler,      gate: "service" },
};
export default async function handler(req: any, res: any) {
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
      if (route.gate === "admin") await requireAdmin(user);
    }
  } catch (e) {
    if (sendAuthError(res, e)) return;
    throw e;
  }

  return route.handler(req, res);
}

