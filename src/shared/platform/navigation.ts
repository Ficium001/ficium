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
