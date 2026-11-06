import { defineConfig, loadEnv, type Plugin } from "vite";
import react            from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * `vite build --mode native` builds the bundle shipped inside the iOS/Android
 * app (see capacitor.config.ts). It differs from the web build in two ways:
 *  1. Required config is checked at build time, so a misconfigured app can
 *     never be produced (the web build serves same-origin and needs none).
 *  2. A Content-Security-Policy <meta> is injected. On the web Vercel sends
 *     CSP as a header (vercel.json); inside the app nothing does, so without
 *     this the WebView would run with no CSP at all.
 */
const NATIVE_REQUIRED = ["VITE_API_BASE_URL", "VITE_PUBLIC_APP_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

function httpsOrigin(name: string, value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${name} must be https for the native build (got ${value})`);
  return url.origin;
}

function nativeShell(env: Record<string, string>): Plugin {
  const missing = NATIVE_REQUIRED.filter((k) => !env[k]);
  if (missing.length) throw new Error(`Native build is missing: ${missing.join(", ")}`);

  const api = httpsOrigin("VITE_API_BASE_URL", env.VITE_API_BASE_URL);
  httpsOrigin("VITE_PUBLIC_APP_URL", env.VITE_PUBLIC_APP_URL);
  const supabase = httpsOrigin("VITE_SUPABASE_URL", env.VITE_SUPABASE_URL);
  const supabaseWs = supabase.replace(/^https:/, "wss:");

  // Mirrors the web CSP in vercel.json; connect-src adds the API origin
  // because the app shell is not same-origin with it.
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${supabase} https://*.public.blob.vercel-storage.com`,
    `connect-src 'self' ${api} ${supabase} ${supabaseWs}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return {
    name: "ficium-native-shell",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "native" ? [nativeShell(loadEnv(mode, process.cwd(), "VITE_"))] : [])],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 400,
    modulePreload: {
      // Vite/Rolldown preloads every manualChunks vendor bundle unconditionally,
      // since manual chunking bypasses its normal per-chunk reachability
      // analysis. vendor-forms (react-hook-form/zod, ~110 kB) and vendor-icons
      // aren't needed by the eager entry graph — only by lazy-loaded routes —
      // so strip them from the initial preload list. They still load
      // (as a normal async chunk) the moment a route that needs them is reached.
      resolveDependencies: (_url, deps) =>
        deps.filter(d => !d.includes("vendor-forms") && !d.includes("vendor-icons")),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router")) return "vendor-react";
            if (id.includes("@tanstack"))                                  return "vendor-query";
            if (id.includes("@supabase"))                                  return "vendor-supabase";
            if (id.includes("lucide"))                                     return "vendor-icons";
            if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) return "vendor-forms";
          }
        },
      },
    },
  },
}));
