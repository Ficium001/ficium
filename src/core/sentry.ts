/**
 * src/core/sentry.ts
 * ─────────────────────────────────────────────────────────────
 * Sentry initialisation — single source of truth.
 * Call initSentry() once in main.tsx before React renders.
 *
 * UPGRADE PATH:
 *   - Swap DSN to self-hosted GlitchTip/Sentry — zero code change
 *   - Add integrations here only — no consumers change
 *   - Adjust sample rates per environment here only
 *
 * ENV VARS (Vercel):
 *   VITE_SENTRY_DSN              — your Sentry/GlitchTip DSN
 *   VITE_VERCEL_GIT_COMMIT_SHA   — set automatically by Vercel
 */
import * as Sentry from "@sentry/react";
import type { Breadcrumb } from "@sentry/react";

const DSN    = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV    = (import.meta.env.MODE ?? "development") as string;
const IS_PROD = ENV === "production";

export function initSentry(): void {
  if (!DSN) {
    if (IS_PROD) console.warn("[Sentry] VITE_SENTRY_DSN not set — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn:         DSN,
    environment: ENV,
    release:     import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined,

    // Tracing — start low, increase as you understand traffic
    tracesSampleRate: IS_PROD ? 0.05 : 1.0,

    // Session Replay
    replaysSessionSampleRate: IS_PROD ? 0.01 : 0,
    replaysOnErrorSampleRate: IS_PROD ? 0.5  : 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText:   false,
        blockAllMedia: false,
        mask:  ["[data-sentry-mask]", "input[type=password]", "input[type=number]", ".sensitive"],
        block: ["[data-sentry-block]"],
      }),
    ],

    // PII scrubbing — strip query params from URLs in breadcrumbs
    beforeSend(event) {
      if (event.breadcrumbs?.values) {
        event.breadcrumbs.values = (event.breadcrumbs.values as Breadcrumb[]).map((b: Breadcrumb) => {
          if (b.data?.url) {
            try {
              const url = new URL(b.data.url as string, window.location.origin);
              url.search = "";
              b.data.url = url.toString();
            } catch { /* ignore malformed URLs */ }
          }
          return b;
        });
      }
      return event;
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────

/** Call after login — userId + role only, no PII */
export function identifyUser(userId: string, role: string): void {
  Sentry.setUser({ id: userId, role });
}

/** Call before logout */
export function clearUser(): void {
  Sentry.setUser(null);
}

/** Attach business context to all subsequent events */
export function setContext(key: string, data: Record<string, unknown>): void {
  Sentry.setContext(key, data);
}

/**
 * Manually capture an error — use in catch blocks where you
 * want to report but continue execution (not crash).
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (context) Sentry.setContext("additional", context);
  Sentry.captureException(error);
}

/** Wrap an async fn in a Sentry performance span */
export async function withSpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan({ name, op }, fn);
}

export { Sentry };
