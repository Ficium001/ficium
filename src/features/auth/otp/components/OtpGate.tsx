import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useOtpStatus } from "../hooks/useOtpStatus";

const OTP_VERIFY_PATH = "/verify-sign-in";

/**
 * Holds the signed-in app behind the sign-in code. Only the screen: the database and API
 * refuse an unverified session on their own, so if the status call fails we let the page
 * render (it will simply get no data) rather than lock everyone out when enforcement is off.
 */
export function OtpGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { data, isLoading } = useOtpStatus();
  const location = useLocation();

  if (isLoading) return <>{fallback}</>;
  if (data?.enforced && !data.verified) {
    return <Navigate to={OTP_VERIFY_PATH} state={{ from: location.pathname + location.search }} replace />;
  }
  return <>{children}</>;
}
