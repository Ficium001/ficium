/**
 * api/_lib/monitor.ts
 * ─────────────────────────────────────────────────────────────
 * Server-side error monitoring for API routes.
 *
 * Uses @sentry/node on the server — separate from @sentry/react.
 * Initialised lazily (first call) so cold starts aren't penalised.
 *
 * UPGRADE PATH: swap captureApiError() for Datadog, New Relic, etc.
 * Only this file changes.
 */

let _initialised = false;

function ensureInit(): void {
  if (_initialised) return;
  _initialised = true;

  const dsn = (globalThis as any).process?.env?.SENTRY_DSN // eslint-disable-line @typescript-eslint/no-explicit-any
    ?? (globalThis as any).process?.env?.VITE_SENTRY_DSN; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!dsn) return; // no DSN = monitoring disabled (dev / misconfigured)

  // Dynamically import to avoid bundling in environments without it
  import("@sentry/node").then(({ init, httpIntegration }) => {
    init({
      dsn,
      environment:      (globalThis as any).process?.env?.NODE_ENV ?? "development", // eslint-disable-line @typescript-eslint/no-explicit-any
      tracesSampleRate: 0.05, // 5% of API requests traced
      integrations:     [httpIntegration()],
    });
  }).catch(() => { /* Sentry unavailable — fail silently */ });
}

/**
 * Capture a server-side error with route context.
 * Call from catch blocks in API handlers.
 */
export async function captureApiError(
  error: unknown,
  context: { route: string; method?: string; [key: string]: unknown },
): Promise<void> {
  // Always log server-side regardless of Sentry
  console.error(`[API Error] ${context.route}:`, error);

  try {
    ensureInit();
    const { captureException, setContext } = await import("@sentry/node");
    setContext("api", context);
    captureException(error);
  } catch { /* Sentry unavailable — don't mask the original error */ }
}
