/**
 * @module advisor/hooks/useAdvisorChat
 * @description
 *   Owns the advisor's conversational state so the page stays a thin
 *   orchestrator: message stream, free-tier metering, send + reset.
 *   The briefing (greeting + proactive moves) seeds the stream and is
 *   rebuilt when the profile name resolves or the user resets.
 *
 * @owner Ficium Engineering
 */

import { useCallback, useEffect, useState } from 'react'
import { askAdvisor, type ChatMessage as WireMessage } from '../api/advisor'
import { ASSISTANT, greetingFor } from '../config/assistant'
import { DEFAULT_MOVES, QUICK_CHIPS } from '../config/briefing'
import type { ChatMessage, Move } from '../types'

/** Free messages per calendar month before the upgrade wall. */
export const FREE_LIMIT = 3

const usageKey = () => {
  const d = new Date()
  return `ficium_ai_msgs_${d.getFullYear()}_${d.getMonth()}`
}

function readUsed(): number {
  try { return parseInt(localStorage.getItem(usageKey()) ?? '0', 10) || 0 } catch { return 0 }
}
function bumpUsed(): number {
  const next = readUsed() + 1
  try { localStorage.setItem(usageKey(), String(next)) } catch { /* private mode */ }
  return next
}

/** Builds the seeded briefing message (greeting + moves + chips). */
function buildBriefing(firstName: string, moves: Move[]): ChatMessage {
  return {
    id:       'briefing',
    role:     'ai',
    briefing: true,
    text:
      `Here's your briefing, ${firstName}. I looked across everything — your accounts and cash flow, ` +
      `cards, home loan, deposits, FX, investments and cover — and matched it live against every provider ` +
      `on Ficium. The moves below are the ones that pay off most, in order.`,
    moves,
    chips: QUICK_CHIPS,
  }
}

export interface UseAdvisorChat {
  messages:   ChatMessage[]
  thinking:   boolean
  used:       number
  remaining:  number
  exhausted:  boolean
  send:       (text: string) => void
  reset:      () => void
}

export function useAdvisorChat(
  firstName: string,
  userId?: string,
  moves: Move[] = DEFAULT_MOVES,
): UseAdvisorChat {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildBriefing(firstName, moves)])
  const [thinking, setThinking] = useState(false)
  const [used, setUsed]         = useState(readUsed)

  const remaining = Math.max(0, FREE_LIMIT - used)
  const exhausted = used >= FREE_LIMIT

  // Refresh the seeded briefing once the profile name resolves — but only
  // while the stream is still untouched, so we never wipe a live conversation.
  useEffect(() => {
    setMessages((cur) =>
      cur.length === 1 && cur[0].id === 'briefing' ? [buildBriefing(firstName, moves)] : cur,
    )
  }, [firstName, moves])

  const reset = useCallback(() => {
    setMessages([buildBriefing(firstName, moves)])
  }, [firstName, moves])

  const send = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking || exhausted) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setThinking(true)

    const history: WireMessage[] = [...messages, userMsg].map((m) => ({
      role:    m.role === 'ai' ? 'assistant' : 'user',
      content: m.text ?? '',
    }))

    void (async () => {
      try {
        const reply = await askAdvisor(history, userId)
        setUsed(bumpUsed()) // only count on success — a network error shouldn't burn a free message
        setMessages((cur) => [...cur, { id: `${Date.now() + 1}`, role: 'ai', text: reply }])
      } catch {
        setMessages((cur) => [...cur, {
          id: `${Date.now() + 1}`, role: 'ai',
          text: `Sorry, I couldn't connect right now. Please try again in a moment.`,
        }])
      } finally {
        setThinking(false)
      }
    })()
  }, [thinking, exhausted, messages, userId])

  return { messages, thinking, used, remaining, exhausted, send, reset }
}

export { ASSISTANT, greetingFor }
