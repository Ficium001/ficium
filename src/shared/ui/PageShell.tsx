/**
 * @component PageShell
 * @description
 *   The canonical page surface. Centralises the app background (`bg-paper`),
 *   the content width, base padding and the bottom nav, so individual screens
 *   never re-implement the frame. Migrate a screen onto the skin by wrapping
 *   its body in <PageShell> and deleting any bespoke background/width markup.
 *
 *   <PageShell>…</PageShell>                     standard screen
 *   <PageShell max="960px">…</PageShell>         narrower content column
 *   <PageShell nav={false}>…</PageShell>         e.g. auth / marketing
 *
 * @owner Ficium Engineering
 */

import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function PageShell({
  children,
  max = '1200px',
  nav = true,
  className = '',
}: {
  children: ReactNode
  /** Max content width. */
  max?: string
  /** Render the bottom nav (default true). */
  nav?: boolean
  className?: string
}) {
  return (
    <div className="min-h-screen bg-paper pb-28 lg:pb-24">
      <div
        className={`mx-auto w-full px-4 sm:px-6 lg:px-6 pt-4 ${className}`}
        style={{ maxWidth: max }}
      >
        {children}
      </div>
      {nav && <BottomNav />}
    </div>
  )
}

export default PageShell
