import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getOtpStatus, sessionKey } from "../api/otp";

const otpStatusKey = (sid: string | null) => ["otp-status", sid] as const;

/** OTP state of the current auth session. A new sign-in is a new session, so a new key. */
export function useOtpStatus() {
  const { session } = useAuth();
  const sid = sessionKey(session?.access_token);
  return useQuery({
    queryKey: otpStatusKey(sid),
    queryFn: getOtpStatus,
    enabled: !!session,
    staleTime: Infinity,      // only verify() changes it, and that invalidates
    retry: 1,
  });
}
