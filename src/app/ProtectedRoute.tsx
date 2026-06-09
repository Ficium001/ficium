import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../features/auth/context/AuthContext";

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
  // Bank users belong on portal.ficium.net — redirect them there
  if (role === "bank") {
    window.location.href = "https://portal.ficium.net";
    return null;
  }
  if (role === "admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

/**
 * Routes only visible when logged out.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (user && role) {
    if (role === "bank") {
      window.location.href = "https://portal.ficium.net";
      return null;
    }
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ficium animate-spin" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </div>
  );
}
