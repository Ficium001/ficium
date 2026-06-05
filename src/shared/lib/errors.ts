// =============================================================
// Ficium — Typed Error System
//
// Central error taxonomy for the entire application.
// All user-facing errors flow through FiciumError so:
//   - Error codes are searchable across the codebase
//   - Sentry/logging has a consistent shape
//   - UI components get a reliable .message to display
//   - API routes return a consistent { ok: false, code, message }
// =============================================================

export type ErrorCode =
  // Auth
  | "AUTH_NOT_SIGNED_IN"
  | "AUTH_EMAIL_EXISTS"
  | "AUTH_WEAK_PASSWORD"
  | "AUTH_INVALID_EMAIL"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  // Data / validation
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  // Network / infra
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  // Business rules
  | "KYC_REQUIRED"
  | "DOSSIER_REQUIRED"
  | "BID_WINDOW_CLOSED"
  | "REQUEST_ALREADY_CLOSED"
  | "MAKER_CHECKER_REQUIRED"
  // Unknown
  | "UNKNOWN";

export class FiciumError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;

  constructor(code: ErrorCode, userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = "FiciumError";
    this.code = code;
    this.userMessage = userMessage;
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Map a raw Supabase/fetch error to a typed FiciumError */
export function toFiciumError(err: unknown): FiciumError {
  if (err instanceof FiciumError) return err;

  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (msg.includes("not authenticated") || msg.includes("not signed in") || msg.includes("jwt"))
    return new FiciumError("AUTH_SESSION_EXPIRED", "Your session has expired. Please sign in again.", err);

  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
    return new FiciumError("NETWORK_ERROR", "Network error — check your connection and try again.", err);

  if (msg.includes("rate limit"))
    return new FiciumError("RATE_LIMITED", "Too many requests. Please wait a moment and try again.", err);

  if (msg.includes("not found") || msg.includes("no rows"))
    return new FiciumError("NOT_FOUND", "The requested item was not found.", err);

  if (msg.includes("forbidden") || msg.includes("rls") || msg.includes("permission"))
    return new FiciumError("FORBIDDEN", "You don't have permission to do that.", err);

  return new FiciumError("UNKNOWN", "Something went wrong. Please try again.", err);
}

/** Use in catch blocks — returns a display-safe message string */
export function getErrorMessage(err: unknown): string {
  if (err instanceof FiciumError) return err.userMessage;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
