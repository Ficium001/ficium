/**
 * Error reporting for the iOS/Android app.
 *
 * An installed app cannot be watched the way a web deploy can, so without this
 * a crash on someone's phone is invisible. Errors the app hits are scrubbed
 * (shared/lib/errorReport), and sent once the borrower is signed in; the admin
 * site shows them per app version (App releases).
 *
 * Limits, so a crash loop cannot become a flood: each distinct error is sent
 * once per app launch, at most 10 per launch, and the database keeps at most
 * 20 distinct errors per borrower per day.
 * Reporting never affects the user: every failure here is swallowed.
 * Does nothing in a browser.
 */
import { useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { describeError, type ErrorKind, type ErrorReport } from "@/shared/lib/errorReport";
import { getAppInfo, isNativeApp } from "@/shared/platform";

const MAX_PER_LAUNCH = 10;

const seen = new Set<string>();
let queue: ErrorReport[] = [];
let signedIn = false;
let sending = false;

async function flush(): Promise<void> {
  if (!signedIn || sending || queue.length === 0) return;
  sending = true;
  try {
    const app = await getAppInfo();
    const batch = queue;
    queue = [];
    if (!app) return;
    for (const r of batch) {
      await supabase.rpc("report_app_error", {
        p_platform: app.platform, p_version: app.version, p_kind: r.kind, p_fingerprint: r.fingerprint,
        p_message: r.message, p_location: r.location, p_route: r.route,
      });
    }
  } catch {
    /* offline or refused: dropped. The next occurrence after a restart is reported again. */
  } finally {
    sending = false;
  }
}

/** Queues one error for reporting. Safe to call from anywhere, any number of times. */
export function captureError(kind: ErrorKind, value: unknown): void {
  try {
    if (!isNativeApp() || seen.size >= MAX_PER_LAUNCH) return;
    const report = describeError(kind, value, window.location.pathname);
    if (!report || seen.has(report.fingerprint)) return;
    seen.add(report.fingerprint);
    queue.push(report);
    void flush();
  } catch {
    /* reporting must never throw into the app */
  }
}

/** For tests: forget everything captured so far. */
export function resetErrorReporter(): void {
  seen.clear();
  queue = [];
  signedIn = false;
  sending = false;
}

export function ErrorReporter() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!isNativeApp()) return;
    const onError = (e: ErrorEvent) => captureError("error", e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => captureError("rejection", e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // Errors from before sign-in wait in the queue and go out once someone is signed in.
  useEffect(() => {
    signedIn = Boolean(userId);
    if (signedIn) void flush();
  }, [userId]);

  return null;
}
