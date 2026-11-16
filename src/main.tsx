import { StrictMode }          from "react";
import { createRoot }          from "react-dom/client";
import { RouterProvider }      from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router }              from "./app/routes";
import { AuthProvider }        from "./features/auth/context/AuthContext";
import { queryClient }         from "./core/query-client";
import { bootstrapNative }     from "./shared/platform";
import { AppLockGate }         from "./app/AppLockGate";
import { UpdateGate }          from "./app/UpdateGate";
import { AppClientReporter }   from "./app/AppClientReporter";
import { ErrorReporter, captureError } from "./app/ErrorReporter";
import { ConnectionBanner }    from "./app/ConnectionBanner";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found in index.html");

createRoot(root, {
  // Errors caught by an error boundary never reach window.onerror, so report them from here.
  // React's own console message is kept.
  onCaughtError: (error, info) => {
    console.error(error, info.componentStack);
    captureError("render", error);
  },
}).render(
  <StrictMode>
    <UpdateGate>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppClientReporter />
          <ErrorReporter />
          <AppLockGate>
            <RouterProvider router={router} />
            <ConnectionBanner />
          </AppLockGate>
        </AuthProvider>
      </QueryClientProvider>
    </UpdateGate>
  </StrictMode>
);

// iOS/Android only: deep links + hardware back. No-op in the browser.
void bootstrapNative(router);
