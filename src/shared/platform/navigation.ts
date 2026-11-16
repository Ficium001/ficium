/**
 * @module shared/platform/navigation
 * Leaving the app. On web this is a normal navigation; in the native shell the
 * WebView must never load a foreign origin, so external sites open in the
 * system browser (Safari View Controller / Chrome Custom Tabs).
 */
import { isNativeApp } from "./runtime";

export async function openExternal(url: string, { replace = false } = {}): Promise<void> {
  if (!url.startsWith("https://")) throw new Error("openExternal only opens https URLs");
  if (isNativeApp()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return;
  }
  if (replace) window.location.replace(url);
  else window.location.href = url;
}

const STORE_HOSTS = new Set(["apps.apple.com", "play.google.com"]);

/**
 * Opens the app's own store page so the user can update.
 *
 * In the native shell this is a top-level navigation to a foreign origin,
 * which Capacitor never loads in the WebView: it hands the URL to the OS, and
 * the OS opens the App Store / Play Store app directly. (openExternal would
 * show the store's web page inside an in-app browser instead.)
 */
export function openStoreListing(url: string): void {
  const target = new URL(url);
  if (target.protocol !== "https:" || !STORE_HOSTS.has(target.hostname)) {
    throw new Error("openStoreListing only opens App Store / Google Play pages");
  }
  window.location.assign(target.href);
}
