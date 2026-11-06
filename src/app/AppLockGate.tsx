/**
 * App lock for the iOS/Android app (bank-grade session protection).
 *
 * The rules live in shared/platform/lockPolicy; this component enforces them:
 * it covers the app with an opaque lock screen, makes the content underneath
 * inert, and unlocks only after the device owner is verified (biometrics or
 * device passcode). A device with no screen lock cannot be verified, so it is
 * signed out instead and the user signs in again with their password.
 *
 * Renders children untouched on the web.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";
import { Button } from "@/shared/ui";
import {
  isDeviceAuthPromptOpen,
  isIdleExpired,
  isNativeApp,
  onAppStateChange,
  shouldLockOnResume,
  verifyDeviceOwner,
} from "@/shared/platform";

const IDLE_CHECK_MS = 15_000;

export function AppLockGate({ children }: { children: ReactNode }) {
  const native = isNativeApp();
  if (!native) return <>{children}</>;
  return <NativeAppLock>{children}</NativeAppLock>;
}

function NativeAppLock({ children }: { children: ReactNode }) {
  const { session, isLoading, signOut } = useAuth();

  // Locked from the first frame until we know whether a saved session exists,
  // so a restored session never flashes on screen unverified.
  const [locked, setLocked] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [failed, setFailed] = useState(false);

  const hadSession = useRef<boolean | null>(null); // null = auth not resolved yet
  const backgroundedAt = useRef<number | null>(null);
  const lastActivity = useRef(0);          // set on mount by the idle effect
  const autoPrompted = useRef(false);

  const lock = useCallback(() => {
    if (hadSession.current) setLocked(true);
  }, []);

  // Session transitions: cold start, fresh sign-in, sign-out.
  useEffect(() => {
    if (isLoading) return;
    const has = session !== null;
    if (hadSession.current === null) {
      setLocked(has);                       // cold start: lock only a restored session
    } else if (!hadSession.current && has) {
      lastActivity.current = Date.now();    // fresh password sign-in: identity just proved
      setLocked(false);
    } else if (!has) {
      setLocked(false);                     // signed out: nothing left to protect
    }
    hadSession.current = has;
  }, [isLoading, session]);

  // Background / foreground.
  useEffect(() => onAppStateChange((active) => {
    if (isDeviceAuthPromptOpen()) return;   // our own verification sheet, not the user leaving
    const now = Date.now();
    if (!active) {
      backgroundedAt.current = now;
      return;
    }
    if (shouldLockOnResume(backgroundedAt.current, now)) lock();
    backgroundedAt.current = null;
    lastActivity.current = now;
  }), [lock]);

  // Inactivity while the app is open.
  useEffect(() => {
    const mark = () => { lastActivity.current = Date.now(); };
    mark();
    const opts = { passive: true, capture: true } as const;
    window.addEventListener("pointerdown", mark, opts);
    window.addEventListener("keydown", mark, opts);
    const timer = window.setInterval(() => {
      if (!document.hidden && isIdleExpired(lastActivity.current, Date.now())) lock();
    }, IDLE_CHECK_MS);
    return () => {
      window.removeEventListener("pointerdown", mark, opts);
      window.removeEventListener("keydown", mark, opts);
      window.clearInterval(timer);
    };
  }, [lock]);

  const unlock = useCallback(async () => {
    setVerifying(true);
    setFailed(false);
    const result = await verifyDeviceOwner("Unlock Ficium");
    setVerifying(false);
    if (result === "verified") {
      lastActivity.current = Date.now();
      setLocked(false);
    } else if (result === "unavailable") {
      await signOut();
    } else {
      setFailed(true);
    }
  }, [signOut]);

  // Offer verification straight away each time the lock screen appears.
  const canUnlock = locked && !isLoading && session !== null;
  useEffect(() => {
    if (!locked) {
      autoPrompted.current = false;
      return;
    }
    if (canUnlock && !autoPrompted.current) {
      autoPrompted.current = true;
      void unlock();
    }
  }, [locked, canUnlock, unlock]);

  return (
    <>
      <div inert={locked} aria-hidden={locked || undefined}>{children}</div>
      {locked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-lock-title"
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-10 bg-paper px-8 text-center"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <FiciumLogo size={96} />
          {canUnlock && (
            <>
              <div className="space-y-2">
                <h1 id="app-lock-title" className="font-display text-xl font-semibold text-ink">
                  Ficium is locked
                </h1>
                <p className="text-sm text-muted" aria-live="polite">
                  {failed
                    ? "Verification didn't go through. Try again, or sign out and sign in with your password."
                    : "Verify it's you to continue."}
                </p>
              </div>
              <div className="w-full max-w-xs space-y-3">
                <Button fullWidth loading={verifying} onClick={() => void unlock()}>
                  Unlock
                </Button>
                <Button fullWidth variant="ghost" disabled={verifying} onClick={() => void signOut()}>
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
