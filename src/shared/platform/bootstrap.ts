/**
 * @module shared/platform/bootstrap
 * Native-only wiring, run once at startup. A no-op in the browser, and the
 * plugins it needs are loaded lazily so the web bundle does not grow.
 */
import { isNativeApp } from "./runtime";
import { handleDeepLink, type AppRouter } from "./deepLinks";

export async function bootstrapNative(router: AppRouter): Promise<void> {
  if (!isNativeApp()) return;
  const { App } = await import("@capacitor/app");

  // Cold start from a link.
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handleDeepLink(launch.url, router);

  // Warm start from a link.
  await App.addListener("appUrlOpen", ({ url }) => { void handleDeepLink(url, router); });

  // Android hardware back: go back in-app, or leave the app at the root.
  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}
