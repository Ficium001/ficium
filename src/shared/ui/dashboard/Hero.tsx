/**
 * @component Hero
 * @description
 *   The portal's signature element: a dark ink band that opens every
 *   dashboard with one sentence, drifting logo blades in the background,
 *   primary CTAs, and a row of count-up stats.
 *
 *   Fully content-driven — both dashboards (admin & institution) and any
 *   future role render the exact same component with different props.
 *
 *   <Hero
 *     eyebrow="ALL SYSTEMS OPERATIONAL"
 *     live
 *     headline={<>Good morning, Kishan.<br/>Your platform is <GradText>moving.</GradText></>}
 *     subline="Three approvals are waiting on you."
 *     actions={<>...buttons...</>}
 *     stats={[{ label: 'Total users', value: 24, trend: '↑ 8%' }, ...]}
 *   />
 *
 * @owner Ficium Engineering
 */

import { useId, type ReactNode } from 'react'
import CountUp from '../motion/CountUp'
import { MiniSparkline } from '@/individual/dashboard/components/MiniSparkline'

// ─── Gradient text helper ─────────────────────────────────────
export function GradText({ children }: { children: ReactNode }) {
  return (
    <span
      className='bg-accent bg-clip-text text-transparent'
    >
      {children}
    </span>
  )
}

// ─── Stat ticker entry ────────────────────────────────────────
export type HeroStat = {
  label:     string
  /** numeric value (animated). Omit when using `display` for a non-numeric state. */
  value?:    number
  decimals?: number
  format?:   'comma'
  prefix?:   string
  suffix?:   string
  /** render negative values in accounting brackets, e.g. "(Rs 2,300,000)" */
  accounting?: boolean
  /** small green/red annotation e.g. "↑ 8%" */
  trend?:    string
  trendTone?: 'good' | 'bad'
  /** non-numeric display (e.g. "—") shown instead of an animated value, for
   *  empty states where a real number would be misleading. */
  display?:  string
  /** small muted prompt under the value, e.g. "Add finances". */
  hint?:     string
  /** optional sparkline trend points, rendered at the bottom of the tile */
  sparkline?: number[]
  /** sparkline stroke/fill color override — defaults to green (good) /
   *  red (bad) based on trendTone if not set. Lets each tile have its
   *  own distinct color rather than all sparklines looking identical. */
  sparklineColor?: string
  /** when set, renders a small donut ring (0-100) instead of a sparkline —
   *  used for score-type stats like health score */
  ring?:      number
  ringMax?:   number
  /** optional link rendered at the bottom of the tile, e.g. "Full report →".
   *  Takes priority over sparkline in the footer slot. */
  link?: { label: string; onClick: () => void }
  /** compact 2-item breakdown rendered under the sparkline, e.g. Assets/Liabilities.
   *  Renders below the sparkline (if present) rather than replacing it. */
  breakdown?: { label: string; value: string }[]
  /** small pill badge in the tile's top-right corner, e.g. "Live" */
  badge?:    string
}

// ─── Background blade ─────────────────────────────────────────
function Blade({ className, both = true }: { className: string; both?: boolean }) {
  const uid = useId().replace(/[:]/g, '')
  return (
    <svg
      viewBox='0 0 310 153'
      className={`absolute opacity-50 blur-[2px] motion-safe:animate-drift will-change-transform pointer-events-none ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`hb-${uid}`} x1='85' y1='79' x2='266' y2='20' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#3536DC' />
          <stop offset='0.5' stopColor='#356EF4' />
          <stop offset='1' stopColor='#4C90F6' />
        </linearGradient>
        <linearGradient id={`hp-${uid}`} x1='85' y1='141' x2='238' y2='91' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#3A148F' />
          <stop offset='1' stopColor='#8231EC' />
        </linearGradient>
      </defs>
      {both && (
        <path d='M 121.78,31.83 Q 131,20 146,20 L 251,20 Q 266,20 257.28,32.21 L 244.72,49.79 Q 236,62 221.09,63.68 L 99.91,77.32 Q 85,79 94.22,67.17 Z' fill={`url(#hb-${uid})`} />
      )}
      <path d='M 108.10,103.75 Q 116,91 131,91 L 223,91 Q 238,91 230.12,103.77 L 216.88,125.23 Q 209,138 194,138.36 L 100,140.64 Q 85,141 92.90,128.25 Z' fill={`url(#hp-${uid})`} />
    </svg>
  )
}

// ─── Small donut ring for score-type stats (e.g. health score) ─
function HealthRing({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const r = 15
  const c = 2 * Math.PI * r
  const uid = useId().replace(/[:]/g, '')
  const gid = `hr-${uid}`

  // Always a full gradient sweep (green -> amber -> red) rather than a thin
  // partial progress arc — the gradient position communicates the score,
  // not the arc length, matching the fuller ring used elsewhere in the app.
  const angle = pct * 360

  return (
    <svg viewBox='0 0 40 40' className='w-10 h-10' aria-hidden>
      <defs>
        <linearGradient id={gid} gradientUnits='userSpaceOnUse' x1='6' y1='20' x2='34' y2='20'
          gradientTransform={`rotate(${angle - 90} 20 20)`}>
          <stop offset='0%'   stopColor='#4ADE80' />
          <stop offset='55%'  stopColor='#FBBF24' />
          <stop offset='100%' stopColor='#F87171' />
        </linearGradient>
      </defs>
      <circle cx='20' cy='20' r={r} fill='none' stroke='rgba(255,255,255,0.08)' strokeWidth='5' />
      <circle
        cx='20' cy='20' r={r} fill='none'
        stroke={`url(#${gid})`} strokeWidth='5' strokeLinecap='round'
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform='rotate(-90 20 20)'
      />
    </svg>
  )
}

// ─── Hero ─────────────────────────────────────────────────────
export default function Hero({
  eyebrow,
  live = false,
  headline,
  subline,
  actions,
  stats = [],
}: {
  eyebrow?:  string
  live?:     boolean
  headline:  ReactNode
  subline?:  ReactNode
  actions?:  ReactNode
  stats?:    HeroStat[]
}) {
  return (
    <section
      className='relative overflow-hidden rounded-hero text-white bg-hero
                 px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10'
    >
      <Blade className='w-[380px] -top-16 right-[6%] [animation-delay:-2s]' />
      <Blade className='w-[300px] -bottom-20 right-[24%] [animation-duration:18s]' both={false} />

      {eyebrow && (
        <div className='relative z-1 inline-flex items-center gap-2 text-[12.5px] font-semibold tracking-[.06em] text-[#B9B9D9] mb-3.5'>
          {live && (
            <span className='w-[7px] h-[7px] rounded-full bg-emerald-400 animate-pulse-ring-green' aria-hidden />
          )}
          {eyebrow}
        </div>
      )}

      <h1 className='relative z-1 font-display font-bold tracking-display leading-[1.06]
                     text-[30px] sm:text-[40px] lg:text-[48px] max-w-[18ch]'>
        {headline}
      </h1>

      {subline && (
        <p className='relative z-1 text-[#A6A6C8] mt-3.5 text-[15px] sm:text-[15.5px] max-w-[48ch]'>
          {subline}
        </p>
      )}

      {actions && (
        <div className='relative z-2 flex flex-wrap gap-3 mt-4'>{actions}</div>
      )}

      {stats.length > 0 && (
        <div className='relative z-1 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2'>
          {stats.map(s => (
            <div
              key={s.label}
              className='relative overflow-hidden rounded-[16px] border border-white/8 bg-white/4 px-4 pt-4 pb-3 min-h-[128px] sm:min-h-[150px] flex flex-col'
            >
              {s.badge && (
                <span className='absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-400/15 px-2 py-0.5 rounded-pill'>
                  <span className='w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse-ring-green' aria-hidden />
                  {s.badge}
                </span>
              )}

              <div className='flex items-start justify-between gap-2'>
                <div className='flex-1 min-w-0'>
                  <div className='font-display font-bold tracking-display text-[20px] sm:text-[24px] leading-none'>
                    {s.display !== undefined ? (
                      <span className='text-[#8E8EB4]'>{s.display}</span>
                    ) : (
                      <CountUp
                        value={s.value ?? 0}
                        decimals={s.decimals}
                        format={s.format}
                        prefix={s.prefix}
                        suffix={s.suffix}
                        accounting={s.accounting}
                      />
                    )}
                    {s.trend && (
                      <span
                        className={`text-[11px] font-semibold ml-1 font-body tracking-normal ${
                          s.trendTone === 'bad' ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {s.trend}
                      </span>
                    )}
                  </div>
                  <div className='text-[11px] text-[#8E8EB4] font-medium mt-0.5'>{s.label}</div>
                  {s.hint && (
                    <div className='text-[10px] text-[#6E6E96] font-medium mt-0.5'>{s.hint}</div>
                  )}
                </div>
                {s.ring !== undefined && (
                  <div className='shrink-0 mt-0.5'>
                    <HealthRing value={s.ring} max={s.ringMax} />
                  </div>
                )}
              </div>

              {/* Footer slot: link takes priority, then sparkline. Both sit
                  directly under the tile's own content — never floated to
                  the side or pushed outside the tile. */}
              {s.link ? (
                <button
                  onClick={s.link.onClick}
                  className='mt-1.5 text-[11px] font-semibold text-[#A6A6C8] hover:text-white transition-colors text-left w-fit'
                >
                  {s.link.label}
                </button>
              ) : (
                s.sparkline && s.sparkline.length > 1 && s.display === undefined && s.ring === undefined && (
                  <div className='h-6 mt-1.5 -mx-1'>
                    <MiniSparkline
                      points={s.sparkline}
                      color={s.sparklineColor ?? (s.trendTone === 'bad' ? '#F87171' : '#9CE5C0')}
                    />
                  </div>
                )
              )}

              {/* Compact breakdown — e.g. Assets / Liabilities under Net worth.
                  Sits below the sparkline/link, separated by a hairline. */}
              {s.breakdown && s.breakdown.length > 0 && (
                <div className='mt-1.5 pt-1.5 border-t border-white/[0.07] grid grid-cols-2 gap-x-2 gap-y-1'>
                  {s.breakdown.map(b => (
                    <div key={b.label} className='min-w-0'>
                      <div className='text-[9px] text-[#6E6E96] font-semibold uppercase tracking-wide truncate'>{b.label}</div>
                      <div className='text-[10.5px] text-[#D4D4E8] font-bold mt-0.5 whitespace-nowrap'>{b.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Hero buttons ─────────────────────────────────────────────
export function HeroButton({
  children, onClick, variant = 'grad',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'grad' | 'ghost'
}) {
  const base =
    'font-semibold text-[14.5px] px-6 py-3 rounded-[14px] transition-all duration-300 ease-swift active:scale-[.97]'
  const styles =
    variant === 'grad'
      ? 'bg-brand-cta text-white shadow-ficium hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(124,58,237,.45)]'
      : 'bg-white/8 text-white border border-white/16 hover:bg-white/[0.14]'
  return (
    <button
      type='button'
      onClick={onClick}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  )
}
