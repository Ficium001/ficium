/**
 * @module shared/platform/runtime
 * Which shell the app is running in. The single source of truth for any
 * web-vs-native branch: never sniff user agents or check `window.Capacitor`.
 */
import { Capacitor } from "@capacitor/core";

export type RuntimePlatform = "web" | "ios" | "android";

/** True inside the iOS/Android app shell, false in a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function runtimePlatform(): RuntimePlatform {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}
