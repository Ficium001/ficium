/**
 * @component PageShell
 * @description
 *   The canonical page surface. Centralises the app background (`bg-paper`),
 *   the content width, base padding and the bottom nav, so individual screens
 *   never re-implement the frame. Migrate a screen onto the skin by wrapping
 *   its body in <PageShell> and deleting any bespoke background/width markup.
 *
 *   <PageShell role={role}>…</PageShell>                     standard screen
 *   <PageShell role={role} max="960px">…</PageShell>         narrower content column
 *   <PageShell role={role} nav={false}>…</PageShell>         e.g. auth / marketing
 *
 *   `role` is injected by the consuming app's auth context; passed through
 *   to BottomNav so this component stays app-agnostic.
 *
 * @owner Ficium Engineering
 */

import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { TopNav } from './TopNav'

export function PageShell({
  children,
  role,
  max = '1200px',
  nav = true,
  className = '',
}: {
  children: ReactNode
  /** User role — passed to BottomNav to control visibility. */
  role: string | null | undefined
  /** Max content width. */
  max?: string
  /** Render the bottom nav (default true). */
  nav?: boolean
  className?: string
}) {
  return (
    <div className="min-h-screen bg-paper pb-28 md:pb-8 md:pt-14">
      {nav && <TopNav role={role} />}
      <div
        className={`mx-auto w-full px-4 sm:px-6 lg:px-6 pt-4 ${className}`}
        style={{ maxWidth: max }}
      >
        {children}
      </div>
      {nav && <BottomNav role={role} />}
    </div>
  )
}

export default PageShell
