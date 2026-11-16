/**
 * @module shared/lib/errorReport
 * Turns a JavaScript error into a small, scrubbed report the phone app can send
 * (see app/ErrorReporter). Pure functions: no network, no storage.
 *
 * Privacy: a report carries the error text with personal-looking data removed,
 * where in the bundle it happened and the screen's route pattern. Never the
 * URL's ids or query, never the stack beyond one frame, nothing about the
 * device. The database scrubs the text a second time on the way in.
 */
export type ErrorKind = "error" | "rejection" | "render";

export interface ErrorReport {
  kind: ErrorKind;
  /** Same error, same fingerprint: 16 hex characters. */
  fingerprint: string;
  message: string;
  /** Bundle file and position of the top frame, e.g. "assets/Dashboard-B4Et.js:1:2345". */
  location: string;
  /** Route pattern, e.g. "/requests/:id". */
  route: string;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const TOKEN = /eyJ[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)*/g;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const LONG_NUMBER = /\d{6,}/g;

/** Removes anything that looks personal, collapses whitespace and limits the length. */
export function scrub(text: string, max = 300): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(TOKEN, "[token]")
    .replace(UUID, "[id]")
    .replace(LONG_NUMBER, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** "/requests/8c1f…/offers/42" → "/requests/:id/offers/:id". Never the query or hash. */
export function routeOf(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? "";
  return path
    .split("/")
    .map((part) => (/^\d+$/.test(part) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(part) || part.length > 32 ? ":id" : part))
    .join("/")
    .slice(0, 120);
}

/** File and position of the first stack frame, without origin or query. Empty if there is none. */
export function locationOf(stack: unknown): string {
  if (typeof stack !== "string") return "";
  const frame = /([A-Za-z0-9_./@-]+\.(?:js|mjs|ts|tsx))(?:\?[^:\s)]*)?:(\d+):(\d+)/.exec(stack);
  if (!frame) return "";
  const file = (frame[1] ?? "").replace(/^.*?\/(assets\/)/, "$1").replace(/^\/+/, "");
  return `${file}:${frame[2]}:${frame[3]}`.slice(0, 200);
}

/** FNV-1a, 64-bit, as 16 hex characters. Stable across devices; not a security hash. */
export function hash16(text: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

function textOf(value: unknown): { name: string; message: string; stack: unknown } {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (typeof value === "string") return { name: "Error", message: value, stack: undefined };
  if (value && typeof value === "object") {
    const o = value as { name?: unknown; message?: unknown; stack?: unknown };
    if (typeof o.message === "string") return { name: typeof o.name === "string" ? o.name : "Error", message: o.message, stack: o.stack };
  }
  return { name: "Error", message: "Unknown error", stack: undefined };
}

/** Null when there is nothing worth reporting (an empty message). */
export function describeError(kind: ErrorKind, value: unknown, pathname: string): ErrorReport | null {
  const { name, message, stack } = textOf(value);
  const text = scrub(message ? `${name}: ${message}` : name);
  if (!text) return null;
  const location = locationOf(stack);
  // Digits are ignored in the fingerprint so "row 3" and "row 4" count as one error.
  const fingerprint = hash16(`${kind}|${text.replace(/\d+/g, "#")}|${location.replace(/:\d+:\d+$/, "")}`);
  return { kind, fingerprint, message: text, location, route: routeOf(pathname) };
}
