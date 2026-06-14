/**
 * @component AskRail
 * @description Left rail: quick-ask prompts, FICO's full remit outline
 *   (signals breadth beyond lending), and the competing-bids CTA.
 * @owner Ficium Engineering
 */

import { Link } from 'react-router-dom'
import { ChevronRight, ArrowRight } from 'lucide-react'
import { ASSISTANT } from '../config/assistant'
import { QUICK_ASKS, REMIT } from '../config/briefing'
import { TONE_TEXT, TONE_SOFT } from '../config/palette'

export function AskRail({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <aside className="flex flex-col gap-[18px] lg:sticky lg:top-4">
      {/* Ask FICO */}
      <div className="bg-white border border-line rounded-card shadow-card">
        <div className="px-5 pt-[18px] pb-0.5">
          <div className="text-[13.5px] font-semibold text-ink">Ask {ASSISTANT.name}</div>
          <div className="text-[12px] text-muted font-medium mt-0.5">Anything across your money</div>
        </div>
        <div className="p-2">
          {QUICK_ASKS.map(({ label }) => (
            <button
              key={label}
              onClick={() => onAsk(label)}
              className="group w-full flex items-center justify-between gap-2 text-left rounded-xl px-3 py-2.5
                         text-[14px] text-ink/85 hover:bg-[#F7F7FB] hover:text-ficium transition-colors"
            >
              {label}
              <ChevronRight size={14} className="text-muted opacity-0 -translate-x-1 group-hover:opacity-100
                                                  group-hover:translate-x-0 group-hover:text-ficium transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Remit outline */}
      <div className="bg-white border border-line rounded-card shadow-card">
        <div className="px-5 pt-[18px] pb-1">
          <div className="text-[13.5px] font-semibold text-ink">{ASSISTANT.name} handles</div>
          <div className="text-[12px] text-muted font-medium mt-0.5">A full relationship manager's remit</div>
        </div>
        <div className="p-2 pt-1.5">
          {REMIT.map(({ label, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#F7F7FB] transition-colors">
              <span className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-shrink-0"
                    style={{ background: TONE_SOFT[tone], color: TONE_TEXT[tone] }}>
                <Icon size={15} aria-hidden />
              </span>
              <span className="text-[13.5px] font-medium text-[#2c2c3a]">{label}</span>
            </div>
          ))}
        </div>
        <Link
          to="/requests/new"
          className="m-2 flex items-center justify-center gap-2 text-white text-[14px] font-semibold rounded-[14px]
                     py-3 no-underline shadow-ficium transition-transform hover:-translate-y-px bg-brand"
        >
          Get competing bids <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </aside>
  )
}
