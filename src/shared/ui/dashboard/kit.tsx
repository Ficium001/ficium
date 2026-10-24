/**
 * @module shared/ui/dashboard/kit
 * @description
 *   Small building blocks for the revamped dashboards. Everything here
 *   is content-agnostic — admin, institution, and any future role
 *   compose dashboards from these pieces.
 *
 *   SectionHead   — h2 + subtitle + optional link
 *   Panel         — white card surface
 *   HoverCard     — Panel with lift + gradient edge on hover
 *   StatMini      — compact metric card (icon + label + value)
 *   FeedItem      — activity feed row with timeline rail
 *   DarkCallout   — dark "one best action" closing card
 *   Tag           — small status pill
 *   ProgressBar   — animated readiness/score bar
 *   SkeletonBlock — loading placeholder
 *
 * @owner Ficium Engineering
 */

import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// ─── SectionHead ──────────────────────────────────────────────
export function SectionHead({
  title, subtitle, to, toLabel = 'View all',
}: {
  title: string
  subtitle?: string
  to?: string
  toLabel?: string
}) {
  return (
    <div className='flex items-baseline justify-between gap-4 mb-5'>
      <div>
        <h2 className='font-display font-bold tracking-display text-[20px] lg:text-[24px] text-ink'>
          {title}
        </h2>
        {subtitle && <p className='text-[13.5px] text-muted mt-1'>{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className='flex items-center gap-1 text-[13.5px] font-semibold text-ficium hover:underline shrink-0'
        >
          {toLabel} <ArrowRight className='w-3.5 h-3.5' aria-hidden />
        </Link>
      )}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────
export function Panel({
  children, className = '',
}: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-line rounded-card shadow-card p-6 ${className}`}>
      {children}
    </div>
  )
}

export function PanelHead({
  title, subtitle, action,
}: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className='flex items-start justify-between gap-3 flex-wrap'>
      <div>
        <h3 className='text-[16px] font-semibold text-ink tracking-[-.01em]'>{title}</h3>
        {subtitle && <div className='text-[12.5px] text-muted mt-0.5'>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

// ─── HoverCard ────────────────────────────────────────────────
export function HoverCard({
  children, className = '',
}: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        'group relative overflow-hidden bg-white border border-line rounded-card shadow-card p-6',
        'transition-all duration-300 ease-swift',
        'hover:-translate-y-1 hover:shadow-lift hover:border-[#DCDCEE]',
        className,
      ].join(' ')}
    >
      {/* gradient edge appears on hover */}
      <span
        aria-hidden
        className='absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-edge'
      />
      {children}
    </div>
  )
}

// ─── FeedItem ─────────────────────────────────────────────────
const FEED_DOT: Record<string, string> = {
  good:   '#0FA47A',
  blue:   '#1E6CF5',
  violet: '#7C3AED',
  warn:   '#E8930C',
  bad:    '#E5484D',
}

export function Feed({ children }: { children: ReactNode }) {
  return <div className='mt-4 flex flex-col'>{children}</div>
}

export function FeedItem({
  tone = 'blue', title, detail, time, last = false,
}: {
  tone?:  keyof typeof FEED_DOT
  title:  ReactNode
  detail?: ReactNode
  time?:  string
  last?:  boolean
}) {
  return (
    <div className='flex items-start gap-3.5 px-1 py-3 rounded-xl transition-colors hover:bg-[#F7F7FB]'>
      <div className='flex flex-col items-center shrink-0 pt-[5px] self-stretch'>
        <span
          className='w-[9px] h-[9px] rounded-full shrink-0'
          style={{ background: FEED_DOT[tone] }}
          aria-hidden
        />
        {!last && <span className='w-[2px] flex-1 bg-line mt-1.5 min-h-[18px]' aria-hidden />}
      </div>
      <div className='text-[13.5px] leading-snug min-w-0'>
        <span className='font-semibold text-ink'>{title}</span>
        {detail && <span className='block text-muted text-[12px] mt-0.5'>{detail}</span>}
      </div>
      {time && (
        <span className='ml-auto text-[12px] text-muted shrink-0 pt-[3px]'>{time}</span>
      )}
    </div>
  )
}

// ─── DarkCallout ──────────────────────────────────────────────
export function DarkCallout({
  title, body, action, className = '',
}: {
  title:  ReactNode
  body:   ReactNode
  action: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-card p-6 lg:p-7 text-white flex flex-col justify-between bg-callout ${className}`}
    >
      <div>
        <h3 className='font-display font-bold tracking-display text-[20px]'>{title}</h3>
        <p className='text-[#A6A6C8] text-[14px] mt-2.5 leading-relaxed'>{body}</p>
      </div>
      <div className='mt-6'>{action}</div>
    </div>
  )
}

