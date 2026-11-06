/**
 * @module shared/platform/endpoints
 * Every absolute URL the client builds goes through here.
 *
 * Web: the app and its /api functions share an origin, so API paths stay
 * relative and nothing changes.
 * Native: the WebView origin is capacitor://localhost (iOS) or
 * https://localhost (Android), so API calls must target the deployed origin
 * and links we hand out (password reset, share) must use the public app URL.
 * The native build refuses to compile without both (see vite.config.ts), so a
 * missing value fails at build time rather than as a blank screen on a phone.
 */
import { isNativeApp } from "./runtime";

function origin(value: string | undefined): string | null {
  if (!value) return null;
  return new URL(value).origin; // drops any path / trailing slash
}

const API_BASE = origin(import.meta.env.VITE_API_BASE_URL as string | undefined);
const PUBLIC_APP_URL = origin(import.meta.env.VITE_PUBLIC_APP_URL as string | undefined);

/** Absolute or relative URL for one of our serverless routes. `path` must start with /api/. */
export function apiUrl(path: string): string {
  if (!path.startsWith("/api/")) throw new Error(`apiUrl expects an /api/ path, got "${path}"`);
  return API_BASE ? `${API_BASE}${path}` : path;
}

/** Public, shareable URL for an in-app path (email links, share sheet). */
export function publicUrl(path: string): string {
  const base = PUBLIC_APP_URL ?? (isNativeApp() ? null : window.location.origin);
  if (!base) throw new Error("VITE_PUBLIC_APP_URL is not set for the native build");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Origin that universal/app links must come from. Null on web. */
export function trustedLinkOrigin(): string | null {
  return PUBLIC_APP_URL;
}
