import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../features/auth/context/AuthContext";

/**
 * The Ficium Portal is the canonical home for institution (`bank`) and `admin`
 * users. When such a user is authenticated inside the consumer App, we redirect
 * them out to the Portal rather than serving an in-App institution experience.
 *
 * The target URL comes from VITE_PORTAL_URL (set per-environment in Vercel),
 * falling back to the production Portal URL.
 */
const PORTAL_URL =
  (import.meta.env.VITE_PORTAL_URL as string | undefined) || "https://portal.ficium.net";

/** Full-page redirect out to the Portal for bank/admin roles. */
function PortalRedirect() {
  useEffect(() => {
    window.location.href = PORTAL_URL;
  }, []);
  return <LoadingScreen />;
}

/**
 * Requires authentication. Any logged-in role allowed.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return <>{children}</>;
}

/**
 * Requires authentication AND role = client.
 * Bank users are redirected to the institution portal.
 */
export function ClientOnlyRoute({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role === "bank" || role === "admin") return <PortalRedirect />;

  return <>{children}</>;
}

/**
 * Routes only visible when logged out.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (user && role) {
    if (role === "bank" || role === "admin") return <PortalRedirect />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ficium animate-spin" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </div>
  );
}
