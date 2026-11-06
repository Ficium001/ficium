/**
 * api/_lib/cors.ts
 * ─────────────────────────────────────────────────────────────
 * Cross-origin access for the native app shell.
 *
 * The web app calls these functions same-origin and needs nothing here. The
 * iOS/Android app runs from capacitor://localhost / https://localhost, so the
 * browser engine in the WebView enforces CORS on every call.
 *
 * Policy (deliberately narrow):
 *  - Exact-match allowlist, never "*", never a reflected arbitrary Origin.
 *  - No credentials mode: auth is a Bearer token in the Authorization header,
 *    so cookies are never sent cross-origin and CSRF does not apply.
 *  - CORS is not authentication. Every route still runs its own auth gate.
 *
 * Allowlist = the two app-shell origins, overridable with
 * CORS_ALLOWED_ORIGINS (comma-separated) for staging builds.
 */
import { Env } from "./env.js";

const APP_SHELL_ORIGINS = ["capacitor://localhost", "https://localhost"];

function allowedOrigins(): Set<string> {
  const configured = Env.corsAllowedOrigins();
  return new Set(configured.length ? configured : APP_SHELL_ORIGINS);
}

/**
 * Sets CORS headers for an allowlisted Origin and answers preflight.
 * Returns true when the request was a preflight and has been fully handled,
 * so the caller must return immediately.
 */
export function handleCors(req: any, res: any): boolean {
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin : "";
  res.setHeader("Vary", "Origin");

  const allowed = origin !== "" && allowedOrigins().has(origin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }

  if (req.method === "OPTIONS") {
    // Disallowed origins get a bare 204 without CORS headers: the browser blocks them.
    res.status(204).end();
    return true;
  }
  return false;
}
