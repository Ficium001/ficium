/**
 * @component MoveCard
 * @description A single proactive "move" — icon, domain tag, headline stat,
 *   one-line rationale, and a CTA. Reuses the dashboard HoverCard shell so
 *   lift + gradient-edge behaviour matches the rest of the app.
 * @owner Ficium Engineering
 */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { HoverCard } from '@/shared/ui/dashboard'
import { TONE_TEXT } from '../config/palette'
import type { Move } from '../types'

export function MoveCard({ move }: { move: Move }) {
  const Icon = move.icon
  const color = TONE_TEXT[move.tone]

  return (
    <HoverCard className="p-5! flex flex-col">
      <span
        className="w-[42px] h-[42px] rounded-[13px] grid place-items-center mb-3.5 bg-brand-soft"
      >
        <Icon size={22} style={{ color }} aria-hidden />
      </span>

      <div className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color }}>
        {move.domain}
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-3">{move.title}</h3>

      <div className="font-display font-bold tracking-display text-[32px] leading-none" style={{ color }}>
        {move.stat}
        {move.statUnit && <span className="text-[18px]">{move.statUnit}</span>}
      </div>

      <p className="text-[13px] text-muted leading-snug mt-2.5 mb-4 flex-1">{move.rationale}</p>

      <Link
        to={move.to}
        className="mt-auto flex items-center justify-center gap-1.5 bg-ink text-white text-[13.5px] font-semibold
                   rounded-xl py-2.5 no-underline transition-colors hover:bg-ficium"
      >
        {move.cta} <ArrowRight size={14} aria-hidden />
      </Link>
    </HoverCard>
  )
}
