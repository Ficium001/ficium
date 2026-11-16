/**
 * @module shared/platform/appInfo
 * Which build of the native app is running: the version and build number
 * stamped into the binary at release (see docs/mobile/RELEASE.md).
 * Null in a browser, which has no installed version.
 */
import { isNativeApp, runtimePlatform } from "./runtime";

export interface AppInfo {
  platform: "ios" | "android";
  /** Store version, e.g. "1.2.0". */
  version: string;
  /** Build number, e.g. "42". */
  build: string;
}

let cached: Promise<AppInfo | null> | null = null;

export function getAppInfo(): Promise<AppInfo | null> {
  cached ??= (async () => {
    const platform = runtimePlatform();
    if (!isNativeApp() || platform === "web") return null;
    try {
      const { App } = await import("@capacitor/app");
      const { version, build } = await App.getInfo();
      return { platform, version, build };
    } catch {
      cached = null; // let the next call retry
      return null;
    }
  })();
  return cached;
}
