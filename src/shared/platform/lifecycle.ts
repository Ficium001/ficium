/**
 * @module shared/platform/lifecycle
 * Foreground / background transitions of the native app. A no-op on the web.
 * Returns an unsubscribe function.
 */
import { isNativeApp } from "./runtime";

export function onAppStateChange(listener: (isActive: boolean) => void): () => void {
  if (!isNativeApp()) return () => {};
  let remove: (() => Promise<void>) | null = null;
  let cancelled = false;
  void import("@capacitor/app").then(async ({ App }) => {
    const handle = await App.addListener("appStateChange", ({ isActive }) => listener(isActive));
    if (cancelled) void handle.remove();
    else remove = () => handle.remove();
  });
  return () => {
    cancelled = true;
    if (remove) void remove();
  };
}
