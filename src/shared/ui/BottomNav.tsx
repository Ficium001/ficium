/**
 * Thin wrapper — injects `role` from the local auth context, then
 * delegates to the vendored BottomNav which is app-agnostic.
 */
import { BottomNav as SharedBottomNav } from './base/BottomNav';
import { useAuth } from '../../features/auth/context/AuthContext';

export function BottomNav() {
  const { role } = useAuth();
  return <SharedBottomNav role={role} />;
}
