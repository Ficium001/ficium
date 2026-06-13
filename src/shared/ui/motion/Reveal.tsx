/**
 * @component Reveal
 * @description
 *   Wraps content in a scroll-triggered fade/slide-up — the portal's
 *   "storytelling" beat. Fires once per element via IntersectionObserver.
 *   Respects prefers-reduced-motion (content simply appears).
 *
 *   <Reveal>...</Reveal>
 *   <Reveal delay={120}>...</Reveal>  — stagger siblings
 *
 * @owner Ficium Engineering
 */

import { type ReactNode } from 'react'
import { usePrefersReducedMotion, useInView } from './hooks'


export default function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  const reduced = usePrefersReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>()
  const shown = reduced || inView

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(26px)',
        transition: reduced
          ? undefined
          : `opacity .7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  )
}
