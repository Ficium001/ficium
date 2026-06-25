/**
 * @component FicoMark
 * @description
 *   FICO's identity mark — the AI relationship manager's "logo": a dark
 *   ink chip with a gradient spark. Used wherever FICO appears (advisor
 *   hero, chat avatar, the raised nav tab) so the brand reads consistently.
 *
 *   Single source of truth for the mark's look — restyle here, everywhere
 *   follows. `useId` keeps the gradient unique when several render at once.
 *
 *   <FicoMark size={44} glow />        — hero / nav (with depth + glow)
 *   <FicoMark size={38} />             — chat avatar
 *   <FicoMark size={52} glow pulse />  — focal identity (animated ring)
 *
 * @owner Ficium Engineering
 */

import { useId } from 'react'

export function FicoMark({
  size = 44,
  radius,
  glow = false,
  pulse = false,
  className = '',
}: {
  /** Rendered square size in px. */
  size?: number
  /** Corner radius in px. Defaults to ~34% of size (rounded square). */
  radius?: number
  /** Adds outer brand glow — use on the hero and nav. */
  glow?: boolean
  /** Adds an animated pulse ring — use for the focal/live identity. */
  pulse?: boolean
  className?: string
}) {
  const uid = useId().replace(/[:]/g, '')
  const r = radius ?? Math.round(size * 0.34)
  const glyph = Math.round(size * 0.5)

  return (
    <span
      className={`relative inline-grid place-items-center flex-shrink-0 bg-mark ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        boxShadow: glow
          ? 'inset 0 0 0 1px rgba(124,58,237,.55), 0 10px 24px -6px rgba(130,49,236,.55)'
          : 'inset 0 0 0 1px rgba(124,58,237,.5)',
      }}
      aria-hidden
    >
      <svg width={glyph} height={glyph} viewBox='0 0 24 24' fill='none'>
        <defs>
          <linearGradient id={`fm-${uid}`} x1='0' y1='0' x2='24' y2='24' gradientUnits='userSpaceOnUse'>
            <stop offset='0' stopColor='#62A8FF' />
            <stop offset='0.5' stopColor='#A78BFA' />
            <stop offset='1' stopColor='#E879F9' />
          </linearGradient>
        </defs>
        <path
          d='M 12 3 L 13.9 8.1 L 19 10 L 13.9 11.9 L 12 17 L 10.1 11.9 L 5 10 L 10.1 8.1 Z'
          stroke={`url(#fm-${uid})`}
          strokeWidth='2'
          strokeLinejoin='round'
        />
      </svg>
      {pulse && (
        <span
          className='absolute inset-0 motion-safe:animate-pulse-ring'
          style={{ borderRadius: r }}
        />
      )}
    </span>
  )
}

export default FicoMark
