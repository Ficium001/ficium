/**
 * Capacitor: wraps the web build (dist/, built with `--mode native`) in the
 * iOS and Android app shells. Native behaviour lives in src/shared/platform.
 */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "net.ficium.app",
  appName: "Ficium",
  webDir: "dist",
  // Never log plugin calls (which can include tokens) in release builds.
  loggingBehavior: "debug",
  server: {
    // Android serves the bundle from https://localhost (secure context, no cleartext).
    androidScheme: "https",
    hostname: "localhost",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    // WebView remote debugging stays at Capacitor's default: on for debug builds, off for release.
  },
  ios: {
    contentInset: "automatic",
  },
  // Matches the app's paper background, so the area behind the status bar,
  // the bounce overscroll and the first frame never flash white or black.
  backgroundColor: "#FAFAFC",
  plugins: {
    SystemBars: {
      // Webview stays inside the safe area (no viewport-fit=cover), so no
      // page needs notch padding; insets are still exposed as CSS variables.
      insetsHandling: "css",
      // Dark icons on the light app, even when the phone is in dark mode.
      style: "LIGHT",
    },
  },
};

export default config;
