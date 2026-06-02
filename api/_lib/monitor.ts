/**
 * api/_lib/monitor.ts
 * ─────────────────────────────────────────────────────────────
 * Server-side error monitoring for Vercel API routes.
 * Lazy init — no cold start penalty.
 *
 * UPGRADE PATH: swap captureApiError() implementation for
 * Datadog, New Relic, or self-hosted Glitchtip.
 * Only this file changes — all API routes stay the same.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
let _initialised = false;

function getEnv(key: string): string {
  return (globalThis as any).process?.env?.[key] ?? "";
}

function ensureInit(): void {
  if (_initialised) return;
  _initialised = true;
  const dsn = getEnv("SENTRY_DSN") || getEnv("VITE_SENTRY_DSN");
  if (!dsn) return;
  import("@sentry/node").then(({ init, httpIntegration }) => {
    init({
      dsn,
      environment:      getEnv("NODE_ENV") || "production",
      tracesSampleRate: 0.05,
      integrations:     [httpIntegration()],
    });
  }).catch(() => { /* Sentry unavailable — fail silently */ });
}

/**
 * Capture a server-side error with route context.
 * Always logs to console; reports to Sentry when configured.
 */
export async function captureApiError(
  error: unknown,
  context: { route: string; method?: string; [key: string]: unknown },
): Promise<void> {
  console.error(`[API Error] ${context.route}:`, error);
  try {
    ensureInit();
    const { captureException, setContext } = await import("@sentry/node");
    setContext("api", context);
    captureException(error);
  } catch { /* never mask the original error */ }
}
