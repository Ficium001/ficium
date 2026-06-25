/**
 * Thin wrapper — injects `role` from the local auth context, then
 * renders both TopNav (desktop, md+) and BottomNav (mobile, md:hidden).
 * Pages that use <BottomNav /> get both navs automatically.
 */
import { BottomNav as SharedBottomNav } from './base/BottomNav';
import { TopNav as SharedTopNav } from './base/TopNav';
import { useAuth } from '../../features/auth/context/AuthContext';

export function BottomNav() {
  const { role } = useAuth();
  return (
    <>
      <SharedTopNav role={role} />
      <SharedBottomNav role={role} />
    </>
  );
}
