/**
 * vite.config.ts
 * ─────────────────────────────────────────────────────────────
 * Vite build config with Sentry source map upload.
 * Source maps are uploaded to Sentry and stripped from the
 * production bundle — errors in Sentry show original source lines.
 *
 * ENV VARS REQUIRED (Vercel, for build time only):
 *   SENTRY_AUTH_TOKEN   — create at sentry.io → Settings → Auth Tokens
 *   SENTRY_ORG          — your Sentry org slug
 *   SENTRY_PROJECT      — your Sentry project slug
 */
import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const IS_PROD = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    react(),

    // Only upload source maps during production builds
    // and only when auth token is present (CI/Vercel)
    ...(IS_PROD && process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org:     process.env.SENTRY_ORG     ?? "ficium",
            project: process.env.SENTRY_PROJECT ?? "ficium-web",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              assets:        "./dist/**",
              deleteAfterUpload: true, // strip maps from final bundle
            },
            release: {
              // Tie release to git commit for 'Resolve in version' feature
              name: process.env.VERCEL_GIT_COMMIT_SHA,
            },
            telemetry: false, // don't send usage data to Sentry
          }),
        ]
      : []),
  ],

  build: {
    // Keep source maps for Sentry upload (deleted after upload by plugin)
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
