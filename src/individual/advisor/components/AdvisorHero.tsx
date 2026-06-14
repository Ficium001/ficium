/**
 * @component AdvisorHero
 * @description FICO's opening band — identity (dark mark + role + live),
 *   the personalised greeting with a gradient accent line, and the "watching"
 *   chips that signal proactive monitoring. Built on the app's ink-hero
 *   treatment (radial #181842 → #0B0B1E) with drifting logo blades.
 * @owner Ficium Engineering
 */

import { useId } from 'react'
import { RefreshCw } from 'lucide-react'
import { GradText } from '@/shared/ui/dashboard'
import { FicoMark } from '@/shared/ui'
import { ASSISTANT, greetingFor } from '../config/assistant'
import { WATCH } from '../config/briefing'

/** Decorative drifting Ficium blades (logo motif) behind the hero. */
function Blades() {
  const uid = useId().replace(/[:]/g, '')
  const blue = `ab-${uid}`
  const purple = `ap-${uid}`
  const topBlade = 'M 121.78,31.83 Q 131,20 146,20 L 251,20 Q 266,20 257.28,32.21 L 244.72,49.79 Q 236,62 221.09,63.68 L 99.91,77.32 Q 85,79 94.22,67.17 Z'
  const botBlade = 'M 108.10,103.75 Q 116,91 131,91 L 223,91 Q 238,91 230.12,103.77 L 216.88,125.23 Q 209,138 194,138.36 L 100,140.64 Q 85,141 92.90,128.25 Z'
  return (
    <>
      <svg viewBox="0 0 310 153" aria-hidden
        className="absolute w-[380px] -top-16 right-[6%] opacity-50 blur-[2px] motion-safe:animate-drift [animation-delay:-2s] pointer-events-none">
        <defs>
          <linearGradient id={blue} x1="85" y1="79" x2="266" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3536DC" /><stop offset="0.5" stopColor="#356EF4" /><stop offset="1" stopColor="#4C90F6" />
          </linearGradient>
          <linearGradient id={purple} x1="85" y1="141" x2="238" y2="91" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3A148F" /><stop offset="1" stopColor="#8231EC" />
          </linearGradient>
        </defs>
        <path d={topBlade} fill={`url(#${blue})`} />
        <path d={botBlade} fill={`url(#${purple})`} />
      </svg>
      <svg viewBox="0 0 310 153" aria-hidden
        className="absolute w-[300px] -bottom-20 right-[24%] opacity-50 blur-[2px] motion-safe:animate-drift [animation-duration:18s] pointer-events-none">
        <path d={botBlade} fill={`url(#${purple})`} />
      </svg>
    </>
  )
}

export function AdvisorHero({ firstName, onReset }: { firstName: string; onReset: () => void }) {
  return (
    <section
      className="relative overflow-hidden rounded-hero text-white bg-hero px-7 py-9 sm:px-10 sm:py-10"
    >
      <Blades />

      {/* Identity row */}
      <div className="relative z-[2] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <FicoMark size={52} glow pulse />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-display font-bold tracking-display text-[21px] leading-none">{ASSISTANT.name}</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.06em]
                               bg-good/15 text-[#6ff0bd] border border-good/40 rounded-pill px-2 py-0.5">
                <span className="w-[7px] h-[7px] rounded-full bg-[#34e6a0] motion-safe:animate-pulse-ring-green" aria-hidden />
                On duty
              </span>
            </div>
            <div className="text-[13px] text-white/60 font-medium mt-1">{ASSISTANT.role}</div>
          </div>
        </div>
        <button
          onClick={onReset}
          aria-label="Refresh briefing"
          title="Refresh briefing"
          className="w-10 h-10 rounded-xl grid place-items-center text-white/80 border border-white/15 bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Greeting */}
      <div className="relative z-[2] mt-7">
        <div className="text-[12.5px] font-semibold tracking-[.06em] text-[#B9B9D9] mb-3">
          {greetingFor()}, {firstName}
        </div>
        <h1 className="font-display font-bold tracking-display leading-[1.06] text-[30px] sm:text-[40px] lg:text-[46px]">
          I've gone over everything.<br />
          <GradText>Three moves stand out.</GradText>
        </h1>
      </div>
      <p className="relative z-[2] text-[#A6A6C8] mt-3.5 text-[15.5px] max-w-[52ch] leading-relaxed">
        Accounts, debt, cards, deposits, FX, investments, cover — I reviewed your full position against every
        provider on Ficium tonight. Here's what's worth your attention, ranked by what it's worth to you.
      </p>

      {/* Watch chips */}
      <div className="relative z-[2] flex flex-wrap gap-2.5 mt-6">
        {WATCH.map(({ label, icon: Icon }) => (
          <span key={label} className="inline-flex items-center gap-2 text-[13px] font-medium text-white/90
                                       bg-white/[0.07] border border-white/[0.14] rounded-pill px-3.5 py-2">
            <Icon size={15} className="opacity-85" aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
