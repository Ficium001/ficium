/**
 * Thin wrapper — injects `role` from the local auth context, then
 * delegates to the vendored PageShell which is app-agnostic.
 *
 * All existing <PageShell> usages in ficium keep working with zero
 * call-site changes.
 */
import type { ReactNode } from 'react';
import { PageShell as SharedPageShell } from './base/PageShell';
import { useAuth } from '../../features/auth/context/AuthContext';

export function PageShell({
  children,
  max,
  nav,
  className,
}: {
  children: ReactNode;
  max?: string;
  nav?: boolean;
  className?: string;
}) {
  const { role } = useAuth();
  return (
    <SharedPageShell role={role} max={max} nav={nav} className={className}>
      {children}
    </SharedPageShell>
  );
}
