/**
 * @component ChatBubble / ThinkingBubble
 * @description Message rendering for the advisor stream. The seeded briefing
 *   message renders the proactive MoveCards + quick chips; subsequent AI
 *   replies render as plain bubbles. FICO's avatar is the shared dark mark.
 * @owner Ficium Engineering
 */

import { User, Boxes, MessageCircle } from 'lucide-react'
import { FicoMark } from '@/shared/ui'
import { ASSISTANT } from '../config/assistant'
import { MoveCard } from './MoveCard'
import type { ChatMessage } from '../types'

export function ChatBubble({ message, onChip }: { message: ChatMessage; onChip: (chip: string) => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%] bg-ficium text-white px-4 py-3 rounded-[18px] rounded-tr-md
                        text-[14.5px] leading-relaxed font-medium shadow-ficium">
          {message.text}
        </div>
        <div className="w-8 h-8 rounded-full bg-ink/10 grid place-items-center flex-shrink-0 self-end">
          <User size={14} className="text-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      <FicoMark size={38} className="mt-0.5 !rounded-[11px]" />
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-line rounded-[6px_18px_18px_18px] px-[22px] py-[19px] shadow-card">
          {message.text && (
            <p className="text-[15.5px] text-[#2a2a38] leading-[1.62] whitespace-pre-line">{message.text}</p>
          )}

          {message.moves && message.moves.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-5 mb-3">
                <Boxes size={15} className="text-ficium" />
                <span className="text-[12px] font-semibold text-ficium uppercase tracking-[.1em]">
                  Moves worth making now
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {message.moves.map((m) => <MoveCard key={m.id} move={m} />)}
              </div>
            </>
          )}

          {message.chips && message.chips.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-5 mb-3">
                <MessageCircle size={15} className="text-muted" />
                <span className="text-[12px] font-semibold text-muted uppercase tracking-[.1em]">Or just ask</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {message.chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onChip(chip)}
                    className="bg-white border border-line rounded-pill px-[15px] py-[9px] text-[13.5px] font-medium
                               text-[#3a3a4a] hover:border-ficium hover:text-ficium hover:bg-[#F8F7FE] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 ml-1">
          <span className="w-[13px] h-[13px] rounded-[5px] bg-brand" />
          <span className="text-[11px] text-muted font-medium">{ASSISTANT.name} · {ASSISTANT.poweredBy}</span>
        </div>
      </div>
    </div>
  )
}

export function ThinkingBubble() {
  return (
    <div className="flex gap-3 items-start">
      <FicoMark size={38} className="mt-0.5 !rounded-[11px]" />
      <div className="bg-white border border-line rounded-[6px_18px_18px_18px] px-[22px] py-[19px] shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-ficium/50 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <span className="text-[13px] text-muted font-medium">{ASSISTANT.name} is reviewing your position…</span>
        </div>
      </div>
    </div>
  )
}
