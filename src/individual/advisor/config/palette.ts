/**
 * @module advisor/config/palette
 * @description Accent tone → token colors used by MoveCard and AskRail.
 *   Mirrors the design tokens in src/index.css @theme (blue/violet/warn/good).
 * @owner Ficium Engineering
 */

import type { Tone } from '../types'

/** Foreground hex for icons, tags and stats. */
export const TONE_TEXT: Record<Tone, string> = {
  blue:   '#1E6CF5',
  violet: '#7C3AED',
  warn:   '#E8930C',
  good:   '#0FA47A',
}

/** Soft tinted background for icon chips. */
export const TONE_SOFT: Record<Tone, string> = {
  blue:   '#EEF3FF',
  violet: '#F4EFFE',
  warn:   '#FFF6E8',
  good:   '#E9F8F1',
}
