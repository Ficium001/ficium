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
 * Banks/institutions get bounced to their portal.
 */
export function ClientOnlyRoute({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role === "bank") return <Navigate to="/institution" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

/**
 * Requires authentication AND role = bank (institution user).
 * Clients get bounced to their dashboard.
 */
export function BankOnlyRoute({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/institution/login" state={{ from: location.pathname }} replace />;
  if (role === "client") return <Navigate to="/dashboard" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

/**
 * Routes only visible when logged out.
 * Smart redirect based on role on login.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (user && role) {
    if (role === "bank")  return <Navigate to="/institution" replace />;
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
