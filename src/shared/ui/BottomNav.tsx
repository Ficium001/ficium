/**
 * Thin wrapper — injects `role` from the local auth context, then
 * delegates to @ficium/shared BottomNav which is app-agnostic.
 */
import { BottomNav as SharedBottomNav } from "@ficium/shared/ui";
import { useAuth } from "../../features/auth/context/AuthContext";

export function BottomNav() {
  const { role } = useAuth();
  return <SharedBottomNav role={role} />;
}
