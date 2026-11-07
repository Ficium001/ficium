/**
 * api/account.ts — the signed-in borrower's own account.
 *
 *   GET  /api/account   → { closureAvailable, retentionYears }
 *   POST /api/account   { action: "close" }  → closes the account
 *
 * Closing is irreversible, so it needs a password entered in the last 5 minutes
 * (checked from the token's `amr` claim) on top of a valid session. Steps:
 *   1. public.close_account (atomic, idempotent): closes open requests, deletes
 *      non-regulated personal data, records the closure + audit event.
 *   2. Signs out every device, then blocks sign-in (ban).
 * A retry after a partial failure is safe: step 1 reports already_closed and
 * step 2 runs again.
 *
 * OFF unless ACCOUNT_CLOSURE_RETENTION_YEARS is set (≥ 7): see _lib/env.ts.
 */
import { Env }                                    from "./_lib/env.js";
import { Response }                               from "./_lib/response.js";
import { requireUser, sendAuthError, bearerToken } from "./_lib/auth.js";
import { getServiceDb }                           from "./_lib/db.js";
import { handleCors }                             from "./_lib/cors.js";
import { passwordEnteredRecently }                from "./_lib/recent-auth.js";

export const config = { runtime: "nodejs" };

// Supabase has no "forever" ban; 100 years is the conventional stand-in.
const BAN_DURATION = "876000h";

export default async function handler(req: any, res: any): Promise<void> {
  if (handleCors(req, res)) return;
  try {
    if (req.method === "GET")  return await status(req, res);
    if (req.method === "POST") return await close(req, res);
    return Response.methodNotAllowed(res, ["GET", "POST"]);
  } catch (e: unknown) {
    if (sendAuthError(res, e)) return;
    console.error("[account] UNCAUGHT:", e instanceof Error ? e.message : String(e));
    return Response.error(res, "Something went wrong. Please try again.", 500, "UNEXPECTED");
  }
}

async function status(req: any, res: any): Promise<void> {
  await requireUser(req);
  const years = Env.accountClosureRetentionYears();
  return Response.ok(res, { closureAvailable: years !== null, retentionYears: years });
}

async function close(req: any, res: any): Promise<void> {
  const user = await requireUser(req);

  if ((req.body ?? {}).action !== "close") {
    return Response.error(res, "Unknown action", 400, "BAD_ACTION");
  }
  const years = Env.accountClosureRetentionYears();
  if (years === null) {
    return Response.error(res, "Account closure is not available yet.", 503, "CLOSURE_DISABLED");
  }
  const token = bearerToken(req) ?? "";
  if (!passwordEnteredRecently(token)) {
    return Response.error(res, "Please enter your password again to close your account.", 401, "REAUTH_REQUIRED");
  }

  const { data, error } = await (getServiceDb() as any).rpc("close_account", {
    p_client_id:    user.id,
    p_retain_years: years,
  });
  if (error) {
    console.error("[account] close_account failed:", error.message);
    return Response.error(res, "We couldn't close your account. Please try again.", 500, "CLOSE_FAILED");
  }
  const result = data as { status: string; retain_until?: string; open_requests_closed?: number };
  if (result.status === "acceptance_in_progress") {
    return Response.error(
      res,
      "You're in the middle of accepting an offer. Try again once that's finished.",
      409,
      "ACCEPTANCE_IN_PROGRESS",
    );
  }

  const signedOut = await blockAndSignOut(user.id, token);
  if (!signedOut) {
    return Response.error(
      res,
      "Your account is closed, but we couldn't sign you out everywhere. Please try again.",
      502,
      "SIGNOUT_INCOMPLETE",
    );
  }

  return Response.ok(res, {
    status: "closed",
    retainUntil: result.retain_until ?? null,
    openRequestsClosed: result.open_requests_closed ?? 0,
  });
}

/**
 * Revoke every session, then ban (no new sign-ins, no token refresh).
 * Sign-out goes first: it needs the user's own token, which the ban would reject.
 * Access tokens already issued stay valid until they expire (at most 1 hour);
 * that is inherent to JWTs, and the ban stops them being refreshed.
 */
async function blockAndSignOut(userId: string, token: string): Promise<boolean> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  try {
    const logout = await fetch(`${url}/auth/v1/logout?scope=global`, {
      method:  "POST",
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    // 401/403: the session is already gone (e.g. a retry after a partial failure).
    if (!logout.ok && logout.status !== 401 && logout.status !== 403) {
      console.error("[account] global sign-out failed:", logout.status);
      return false;
    }
    const ban = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method:  "PUT",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ ban_duration: BAN_DURATION }),
    });
    if (!ban.ok) {
      console.error("[account] ban failed:", ban.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[account] auth admin unreachable:", e instanceof Error ? e.message : String(e));
    return false;
  }
}
