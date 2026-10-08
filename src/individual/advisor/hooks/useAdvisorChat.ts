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

import { useCallback, useEffect, useRef, useState } from 'react'
import { askAdvisor, type ChatMessage as WireMessage } from '../api/advisor'
import { clearHistory, loadHistory, saveExchange } from '../api/history'
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

/** Max recent messages sent to the model (server also caps at 20). */
const CONTEXT_WINDOW = 20

export interface UseAdvisorChat {
  messages:   ChatMessage[]
  thinking:   boolean
  used:       number
  remaining:  number
  exhausted:  boolean
  send:       (text: string) => void
  /** Refreshes the briefing card in place; the conversation is kept. */
  reset:      () => void
  /** Permanently deletes the saved conversation and starts over. */
  clear:      () => Promise<void>
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

  // Keep the briefing card current (profile name / moves) without touching
  // the conversation around it.
  useEffect(() => {
    setMessages((cur) => cur.map((m) => (m.id === 'briefing' ? buildBriefing(firstName, moves) : m)))
  }, [firstName, moves])

  // Restore the saved conversation once the signed-in user is known.
  const loadedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!userId || loadedFor.current === userId) return
    loadedFor.current = userId
    let cancelled = false
    void loadHistory().then((saved) => {
      if (cancelled || saved.length === 0) return
      const restored: ChatMessage[] = saved.map((m) => ({
        id:   m.id,
        role: m.role === 'assistant' ? 'ai' : 'user',
        text: m.content,
      }))
      // Anything sent while loading is already in `cur` after the briefing.
      setMessages((cur) => [cur[0], ...restored, ...cur.slice(1)])
    })
    return () => { cancelled = true }
  }, [userId])

  const reset = useCallback(() => {
    setMessages((cur) => cur.map((m) => (m.id === 'briefing' ? buildBriefing(firstName, moves) : m)))
  }, [firstName, moves])

  const clear = useCallback(async () => {
    if (await clearHistory()) setMessages([buildBriefing(firstName, moves)])
  }, [firstName, moves])

  const send = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking || exhausted) return

    const sentAt = Date.now()
    const userMsg: ChatMessage = { id: sentAt.toString(), role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setThinking(true)

    const history: WireMessage[] = [...messages, userMsg]
      .slice(-CONTEXT_WINDOW)
      .map((m) => ({
        role:    m.role === 'ai' ? 'assistant' : 'user',
        content: m.text ?? '',
      }))

    void (async () => {
      try {
        const reply = await askAdvisor(history, userId)
        setUsed(bumpUsed()) // only count on success — a network error shouldn't burn a free message
        void saveExchange(trimmed, reply, sentAt)
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

  return { messages, thinking, used, remaining, exhausted, send, reset, clear }
}

export { ASSISTANT, greetingFor }
