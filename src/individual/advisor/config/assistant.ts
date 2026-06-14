/**
 * @module advisor/config/assistant
 * @description
 *   Single source of truth for the AI relationship manager's identity.
 *   Rename or re-scope FICO here and the whole advisor surface follows
 *   (hero, chat avatar label, composer placeholder, footnote).
 *
 *   Note: the bottom-nav tab label lives in shared/ui/BottomNav.tsx and
 *   should be kept in sync with `name` if it changes.
 *
 * @owner Ficium Engineering
 */

export const ASSISTANT = {
  /** Display name of the assistant. */
  name: 'FICO',
  /** One-line positioning shown under the name in the hero. */
  role: 'Your private relationship manager — across your whole financial life',
  /** Attribution shown in the footnote. */
  poweredBy: 'powered by Claude',
} as const

/** Time-of-day greeting, e.g. "Good evening". */
export function greetingFor(date = new Date()): string {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
