import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor — large stable deps in their own chunk
          "vendor-react":   ["react", "react-dom", "react-router-dom"],
          "vendor-query":   ["@tanstack/react-query"],
          "vendor-supabase":["@supabase/supabase-js"],
          "vendor-ui":      ["lucide-react", "react-hook-form", "@hookform/resolvers", "zod"],
          // Institution portal — separate chunk, only loaded for bank users
          "institution":    [
            "./src/institution/dashboard/pages/InstitutionDashboard.tsx",
            "./src/institution/marketplace/pages/InstitutionMarketplace.tsx",
            "./src/institution/approvals/pages/InstitutionApprovals.tsx",
            "./src/institution/bids/pages/InstitutionBids.tsx",
            "./src/institution/audit/pages/InstitutionAudit.tsx",
            "./src/institution/webhooks/pages/InstitutionWebhooks.tsx",
          ],
        },
      },
    },
  },
});
