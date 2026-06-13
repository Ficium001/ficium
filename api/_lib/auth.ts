/**
 * api/_lib/auth.ts
 * ─────────────────────────────────────────────────────────────
 * Caller-identity verification for serverless API routes.
 *
 * Two gates:
 *   requireUser(req)    — validates the Supabase access token in the
 *                         Authorization header and returns the user.
 *                         Use for any browser-facing endpoint.
 *   requireService(req) — validates a shared secret header.
 *                         Use for server-to-server / cron endpoints
 *                         that no browser should ever call directly.
 *
 * Both THROW an AuthError on failure. Handlers catch it and map to 401/403.
 * This is intentionally "fail closed": no token / bad token => rejected.
 */

import { Env } from "./env";

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export interface AuthedUser {
  id: string;
  email: string | null;
  role: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Req = any;

function bearer(req: Req): string | null {
  const raw =
    req.headers?.authorization ?? req.headers?.Authorization ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return m ? m[1] : null;
}

/**
 * Validate the caller's Supabase access token against the Auth API.
 * Returns the authenticated user, or throws AuthError(401).
 */
export async function requireUser(req: Req): Promise<AuthedUser> {
  const token = bearer(req);
  if (!token) throw new AuthError("Missing bearer token", 401, "NO_TOKEN");

  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) {
    throw new AuthError("Auth not configured", 503, "AUTH_NOT_CONFIGURED");
  }

  let res: globalThis.Response;
  try {
    res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AuthError("Auth provider unreachable", 503, "AUTH_UNAVAILABLE");
  }

  if (!res.ok) throw new AuthError("Invalid or expired token", 401, "BAD_TOKEN");

  const u = (await res.json()) as {
    id?: string;
    email?: string;
    role?: string;
    user_metadata?: Record<string, unknown>;
  };
  if (!u?.id) throw new AuthError("Invalid token payload", 401, "BAD_TOKEN");

  return {
    id: u.id,
    email: u.email ?? null,
    role: (u.user_metadata?.role as string) ?? u.role ?? null,
  };
}

/**
 * Enforce that the authenticated user owns `targetId` (IDOR guard).
 * Pass the user from requireUser(). Throws AuthError(403) on mismatch.
 */
export function requireOwnership(user: AuthedUser, targetId: string): void {
  if (!targetId || user.id !== targetId) {
    throw new AuthError("Forbidden — not the resource owner", 403, "FORBIDDEN");
  }
}

/**
 * Validate a shared-secret header for internal/cron endpoints.
 * Expects `x-internal-secret: <INTERNAL_API_SECRET>`.
 * Constant-time compare to avoid leaking the secret via timing.
 */
export function requireService(req: Req): void {
  const expected = Env.internalApiSecret();
  if (!expected) {
    throw new AuthError("Internal secret not configured", 503, "NO_INTERNAL_SECRET");
  }
  const got = String(
    req.headers?.["x-internal-secret"] ?? req.headers?.["X-Internal-Secret"] ?? "",
  );
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    throw new AuthError("Invalid internal secret", 403, "FORBIDDEN");
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Enforce that the authenticated user is an ACTIVE admin.
 *
 * Authoritative source is admin.admin_users (same as the get_my_role RPC) —
 * NOT user_metadata, which a user could influence. Queried with the service
 * key over the Supabase REST API. Throws AuthError(403) if not an admin.
 */
export async function requireAdmin(user: AuthedUser): Promise<void> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) {
    throw new AuthError("Auth not configured", 503, "AUTH_NOT_CONFIGURED");
  }

  let res: globalThis.Response;
  try {
    // PostgREST against the admin schema; service key bypasses RLS but the
    // filter still scopes to this user id + active flag.
    res = await fetch(
      `${url}/rest/v1/admin_users?id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=id`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Accept-Profile": "admin",
        },
      },
    );
  } catch {
    throw new AuthError("Auth provider unreachable", 503, "AUTH_UNAVAILABLE");
  }

  if (!res.ok) throw new AuthError("Admin check failed", 403, "FORBIDDEN");
  const rows = (await res.json()) as Array<{ id: string }>;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AuthError("Forbidden — admin access required", 403, "FORBIDDEN");
  }
}

/** Map an unknown error to an AuthError-shaped response, or null if not auth. */
export function asAuthError(e: unknown): AuthError | null {
  return e instanceof AuthError ? e : null;
}

/**
 * If `e` is an AuthError, write the matching status+JSON and return true.
 * Handlers use: `if (sendAuthError(res, e)) return;` then rethrow/handle rest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sendAuthError(res: any, e: unknown): boolean {
  const ae = asAuthError(e);
  if (!ae) return false;
  res.status(ae.status).json({ error: ae.message, code: ae.code });
  return true;
}
