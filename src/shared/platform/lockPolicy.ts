/**
 * @module shared/platform/lockPolicy
 * When the native app locks itself. Pure functions so the policy is unit-tested
 * and auditable in one place; the UI that enforces it lives in app/AppLockGate.
 *
 * Policy (native app only; the web app is unchanged):
 *  - Cold start with a saved session: locked until the device owner is verified.
 *  - Back from the background after more than BACKGROUND_GRACE_MS: locked.
 *    The grace window covers the camera / file picker, which background the app.
 *  - No touch or key input for IDLE_TIMEOUT_MS while open: locked.
 *  - A fresh password sign-in is never locked (the user just proved identity).
 */
export const LOCK_POLICY = {
  backgroundGraceMs: 60_000,
  idleTimeoutMs:     5 * 60_000,
} as const;

/** True when the app was away long enough that it must lock on return. */
export function shouldLockOnResume(
  backgroundedAt: number | null,
  now: number,
  graceMs: number = LOCK_POLICY.backgroundGraceMs,
): boolean {
  return backgroundedAt !== null && now - backgroundedAt > graceMs;
}

/** True when the user has been inactive long enough that the app must lock. */
export function isIdleExpired(
  lastActivityAt: number,
  now: number,
  idleMs: number = LOCK_POLICY.idleTimeoutMs,
): boolean {
  return now - lastActivityAt >= idleMs;
}
