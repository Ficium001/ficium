import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
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
});
