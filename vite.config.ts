/**
 * vite.config.ts
 * ─────────────────────────────────────────────────────────────
 * Vite build config with Sentry source map upload.
 * Source maps uploaded to Sentry and stripped from the bundle.
 *
 * ENV VARS (Vercel, build-time only):
 *   SENTRY_AUTH_TOKEN   — sentry.io → Settings → Auth Tokens
 *   SENTRY_ORG          — your org slug
 *   SENTRY_PROJECT      — your project slug
 */
import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const IS_PROD     = process.env.NODE_ENV === "production";
const SENTRY_TOKEN = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig({
  plugins: [
    react(),

    // Upload source maps only on production builds with token present
    ...(IS_PROD && SENTRY_TOKEN
      ? [
          sentryVitePlugin({
            org:       process.env.SENTRY_ORG     ?? "ficium",
            project:   process.env.SENTRY_PROJECT ?? "ficium-web",
            authToken: SENTRY_TOKEN,
            sourcemaps: {
              assets: "./dist/**",
              // Fix 5: correct property name (was deleteAfterUpload)
              filesToDeleteAfterUpload: "./dist/**/*.map",
            },
            release: {
              name: process.env.VERCEL_GIT_COMMIT_SHA,
            },
            telemetry: false,
          }),
        ]
      : []),
  ],

  build: {
    // hidden = source maps generated but not served publicly
    // Sentry plugin uploads then deletes them
    sourcemap: IS_PROD ? "hidden" : true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router")) return "vendor-react";
            if (id.includes("@tanstack"))                                  return "vendor-query";
            if (id.includes("@supabase"))                                  return "vendor-supabase";
            if (id.includes("@sentry"))                                    return "vendor-sentry";
            if (id.includes("lucide") || id.includes("react-hook-form") || id.includes("zod")) return "vendor-ui";
          }
          if (id.includes("src/institution")) return "institution";
        },
      },
    },
  },
});
