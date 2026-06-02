/**
 * src/core/sentry.ts
 * ─────────────────────────────────────────────────────────────
 * Sentry initialisation — single source of truth.
 *
 * Call init() once at app startup (main.tsx), before React renders.
 *
 * UPGRADE PATH:
 *   - Add integrations here (Replay, Profiling, BrowserTracing)
 *   - Adjust sampleRates per environment
 *   - Add beforeSend hooks for PII scrubbing
 *   Nothing outside this file needs to change.
 *
 * ENV VARS REQUIRED (Vercel):
 *   VITE_SENTRY_DSN — your Sentry DSN (public, safe in browser)
 */
import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE ?? "development";        // "production" | "development"
const IS_PROD = ENV === "production";

export function initSentry(): void {
  if (!DSN) {
    // No DSN = dev or misconfigured — log once and skip
    if (IS_PROD) console.warn("[Sentry] VITE_SENTRY_DSN not set — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,

    // ── Tracing ────────────────────────────────────────────
    // Start low — increase as you understand your traffic patterns
    tracesSampleRate: IS_PROD ? 0.05 : 1.0,   // 5% in prod, 100% in dev

    // ── Session Replay ─────────────────────────────────────
    // Records user sessions for error reproduction — anonymised
    replaysSessionSampleRate:  IS_PROD ? 0.01 : 0,   // 1% of sessions in prod
    replaysOnErrorSampleRate:  IS_PROD ? 0.5  : 1.0, // 50% of errored sessions

    // ── Integrations ───────────────────────────────────────
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Never record sensitive fields
        maskAllText:   false,   // mask only specific selectors below
        blockAllMedia: false,
        mask: [
          "[data-sentry-mask]",    // add this attr to any sensitive element
          "input[type=password]",
          "input[type=number]",    // masks financial amounts
          ".sensitive",
        ],
        block: [
          "[data-sentry-block]",   // add this attr to block recording entirely
        ],
      }),
    ],

    // ── PII scrubbing ──────────────────────────────────────
    // Remove sensitive data before it leaves the browser
    beforeSend(event) {
      // Strip any auth tokens from breadcrumbs
      if (event.breadcrumbs?.values) {
        event.breadcrumbs.values = event.breadcrumbs.values.map((b) => {
          if (b.data?.url) {
            // Remove query params that might contain tokens
            try {
              const url = new URL(b.data.url as string, window.location.origin);
              url.search = "";
              b.data.url = url.toString();
            } catch { /* ignore */ }
          }
          return b;
        });
      }
      return event;
    },

    // ── Release tracking ───────────────────────────────────
    // Set by Vercel automatically via VITE_VERCEL_GIT_COMMIT_SHA
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined,
  });
}

// ── Public helpers ────────────────────────────────────────────

/**
 * Identify the current user in Sentry.
 * Call after login — userId only, no PII.
 */
export function identifyUser(userId: string, role: string): void {
  Sentry.setUser({ id: userId, role });
}

/**
 * Clear user identity on logout.
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Attach business context to all subsequent events.
 * Useful for filtering errors by institution, product type, etc.
 */
export function setContext(key: string, data: Record<string, unknown>): void {
  Sentry.setContext(key, data);
}

/**
 * Manually capture an error with optional context.
 * Use this in catch blocks where you want to report but not crash.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (context) Sentry.setContext("additional", context);
  Sentry.captureException(error);
}

/**
 * Wrap an async operation in a Sentry performance span.
 * Use for DB queries, API calls, or any measurable operation.
 */
export async function withSpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan({ name, op }, fn);
}

// Re-export Sentry core for components that need ErrorBoundary etc.
export { Sentry };
