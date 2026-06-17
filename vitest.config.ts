/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Separate from vite.config so the build stays lean; shares the @ alias.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // @ficium/shared ships extensionless ESM imports in its dist (e.g.
    // `from "./Hero"`). Vite's bundler resolves these fine, but Node's strict
    // ESM resolver (used by vitest by default) does not. Inline the package so
    // it goes through Vite's resolver during tests.
    server: { deps: { inline: [/@ficium\/shared/] } },
    // Dummy values so modules that construct the Supabase client at import
    // time don't throw in DEV during tests. Never used for real requests.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    },
  },
});
