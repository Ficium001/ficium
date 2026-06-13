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
 *   ?action=settings      → read/write KYC settings          (GET|POST) [was /api/kyc-settings]
 *   ?action=notify        → send applicant notification      (POST)   [was /api/kyc-notify]
 *   ?action=admin-faces   → list/delete a client's faces     (GET|DELETE) [was /api/kyc-admin-faces]
 *   ?action=faces         → face collection (create/search/index) (POST) [was /api/kyc-faces]
 *   ?action=liveness      → liveness session/result          (POST)   [was /api/kyc-liveness]
 *   ?action=setup         → one-time collection setup         (POST)   [was /api/kyc-setup]
 */

import { verifyHandler }     from "./_kyc/verify";
import { settingsHandler }   from "./_kyc/settings";
import { notifyHandler }     from "./_kyc/notify";
import { adminFacesHandler } from "./_kyc/adminFaces";
import { facesHandler }      from "./_kyc/faces";
import { livenessHandler }   from "./_kyc/liveness";
import { setupHandler }      from "./_kyc/setup";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => unknown | Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  "verify":      verifyHandler,
  "settings":    settingsHandler,
  "notify":      notifyHandler,
  "admin-faces": adminFacesHandler,
  "faces":       facesHandler,
  "liveness":    livenessHandler,
  "setup":       setupHandler,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return route(req, res);
}
