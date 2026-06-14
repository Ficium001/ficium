/**
 * @component Composer
 * @description The advisor input: mobile quick-chips, the message field with
 *   send, the free-tier meter, and the upgrade wall once the monthly quota
 *   is spent.
 * @owner Ficium Engineering
 */

import { useRef } from 'react'
import { Send } from 'lucide-react'
import { FicoMark } from '@/shared/ui'
import { ASSISTANT } from '../config/assistant'
import { QUICK_CHIPS } from '../config/briefing'
import { FREE_LIMIT } from '../hooks/useAdvisorChat'

export function Composer({
  value, onChange, onSubmit, onChip, thinking, exhausted, remaining,
}: {
  value:     string
  onChange:  (v: string) => void
  onSubmit:  () => void
  onChip:    (chip: string) => void
  thinking:  boolean
  exhausted: boolean
  remaining: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  if (exhausted) {
    return (
      <div className="bg-white border border-line rounded-card p-6 text-center shadow-card">
        <FicoMark size={48} glow className="mx-auto mb-4" />
        <div className="font-display font-bold tracking-display text-[18px] text-ink mb-1">
          {FREE_LIMIT} free messages used
        </div>
        <p className="text-[13px] text-muted mb-5 max-w-[300px] mx-auto leading-relaxed">
          Upgrade to Ficium Premium for unlimited {ASSISTANT.name} coaching, deeper analysis across your
          whole financial life, and priority insights.
        </p>
        <button className="w-full text-white font-semibold py-3.5 rounded-2xl text-[14px] shadow-ficium transition-transform hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg,#356EF4,#8231EC)' }}>
          Upgrade — MUR 199/month
        </button>
        <p className="text-[11px] text-muted mt-2">Resets on the 1st of each month</p>
      </div>
    )
  }

  const submit = (e: React.FormEvent) => { e.preventDefault(); onSubmit() }

  return (
    <>
      {/* Mobile quick chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 lg:hidden scrollbar-hide">
        {QUICK_CHIPS.map((chip) => (
          <button key={chip} onClick={() => onChip(chip)}
            className="flex-shrink-0 px-3.5 py-2 bg-white border border-line rounded-pill text-[12px] font-semibold
                       text-ink/70 hover:border-ficium/30 hover:text-ficium transition-colors shadow-card">
            {chip}
          </button>
        ))}
      </div>

      <form onSubmit={submit}
        className="flex items-center gap-3 bg-white border border-line rounded-[18px] pl-5 pr-2 py-2 shadow-card
                   focus-within:border-ficium/30 focus-within:ring-2 focus-within:ring-ficium/10 transition-all">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Ask ${ASSISTANT.name} anything about your money…`}
          className="flex-1 text-[15px] text-ink placeholder:text-ink/35 outline-none bg-transparent py-2"
          autoComplete="off" autoCorrect="off" autoCapitalize="none"
        />
        <button type="submit" disabled={!value.trim() || thinking} aria-label="Send"
          className="w-11 h-11 rounded-[13px] grid place-items-center text-white flex-shrink-0 shadow-ficium
                     disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-105 disabled:hover:scale-100"
          style={{ background: 'linear-gradient(135deg,#356EF4,#8231EC)' }}>
          <Send size={18} />
        </button>
      </form>

      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[11px] text-muted">{ASSISTANT.name} · Not financial advice</p>
        <p className={`text-[11px] font-semibold ${remaining === 1 ? 'text-warn' : 'text-muted'}`}>
          {remaining} free message{remaining !== 1 ? 's' : ''} left this month
        </p>
      </div>
    </>
  )
}
