/**
 * @module advisor/types
 * @description Shared types for the advisor surface.
 * @owner Ficium Engineering
 */

import type { ElementType } from 'react'

/** Accent tones map to the design-token palette in MoveCard / AskRail. */
export type Tone = 'blue' | 'violet' | 'warn' | 'good'

export type MessageRole = 'ai' | 'user'

/**
 * A proactive "move" FICO surfaces in the briefing — a recommendation
 * spanning any financial domain (borrowing, savings, FX, wealth, cover…).
 */
export interface Move {
  id:        string
  /** Domain label, e.g. "Home finance", "FX & transfers". */
  domain:    string
  title:     string
  /** Headline figure, e.g. "5.4%", "−1.1pts". */
  stat:      string
  /** Optional small unit rendered after the stat, e.g. "pts". */
  statUnit?: string
  /** One-line reason this is worth doing now. */
  rationale: string
  /** CTA label, e.g. "See offers". */
  cta:       string
  /** Route the CTA links to. */
  to:        string
  tone:      Tone
  icon:      ElementType
}

/** An entry in FICO's "remit" outline shown in the rail. */
export interface RemitItem {
  label: string
  icon:  ElementType
  tone:  Tone
}

/** A quick-ask prompt. */
export interface QuickAsk {
  label: string
}

/** A chat message in the advisor stream. */
export interface ChatMessage {
  id:       string
  role:     MessageRole
  text?:    string
  /** When true, this AI message renders the briefing moves + chips. */
  briefing?: boolean
  moves?:   Move[]
  chips?:   string[]
}
