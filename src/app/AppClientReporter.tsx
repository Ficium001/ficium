/**
 * Tells the server which version of the phone app a signed-in borrower is
 * using, so Ficium staff can see how many people are on each version before
 * raising the minimum (admin site → App releases).
 *
 * Sends the platform, version and build number: nothing about the device. At
 * most once a day per phone; the server also ignores repeats within 6 hours.
 * Monitoring only: a failed report is dropped and never affects the user.
 * Renders nothing, and does nothing in a browser.
 */
import { useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { getAppInfo, isNativeApp, type AppInfo } from "@/shared/platform";

const STORAGE_KEY = "ficium.appClientReported";

/** One report per day and per installed build. */
export function reportMarker(app: AppInfo, now: Date): string {
  return `${now.toISOString().slice(0, 10)}|${app.platform}|${app.version}|${app.build}`;
}

async function report(): Promise<void> {
  const app = await getAppInfo();
  if (!app) return;
  const marker = reportMarker(app, new Date());
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === marker) return;
    const { error } = await supabase.rpc("report_app_client", {
      p_platform: app.platform, p_version: app.version, p_build: app.build,
    });
    if (!error) window.localStorage.setItem(STORAGE_KEY, marker);
  } catch {
    /* offline or storage unavailable: try again on the next launch */
  }
}

export function AppClientReporter() {
  const { user } = useAuth();
  const userId = user?.id;
  useEffect(() => {
    if (userId && isNativeApp()) void report();
  }, [userId]);
  return null;
}
