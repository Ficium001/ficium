import { StrictMode }          from "react";
import { createRoot }          from "react-dom/client";
import { RouterProvider }      from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router }              from "./app/routes";
import { AuthProvider }        from "./features/auth/context/AuthContext";
import { queryClient }         from "./core/query-client";
import { bootstrapNative }     from "./shared/platform";
import { AppLockGate }         from "./app/AppLockGate";
import { ConnectionBanner }    from "./app/ConnectionBanner";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found in index.html");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLockGate>
          <RouterProvider router={router} />
          <ConnectionBanner />
        </AppLockGate>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);

// iOS/Android only: deep links + hardware back. No-op in the browser.
void bootstrapNative(router);
