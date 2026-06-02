/**
 * src/main.tsx
 * ─────────────────────────────────────────────────────────────
 * Application entry point.
 * Sentry initialised FIRST — captures errors during startup.
 */
import { StrictMode }          from "react";
import { createRoot }          from "react-dom/client";
import { RouterProvider }      from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router }              from "./app/routes";
import { AuthProvider }        from "./features/auth/context/AuthContext";
import { queryClient }         from "./core/query-client";
import { initSentry }          from "./core/sentry";
import "./index.css";

// 1. Init Sentry before anything else
initSentry();

// 2. Mount React
const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found in index.html");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
