/**
 * @module advisor/config/briefing
 * @description
 *   Content config for FICO's briefing: the quick-ask prompts, the remit
 *   outline (what a full relationship manager covers), and the default
 *   proactive "moves".
 *
 *   ── DATA SEAM ──────────────────────────────────────────────────────
 *   DEFAULT_MOVES are illustrative placeholders. They should be replaced
 *   by a `useBriefing(profile)` hook that derives moves from the rating
 *   engine + market views (v_market_rates, client_dossier) so the figures
 *   are real. Keep the `Move` shape stable and this swap is drop-in —
 *   no component changes required.
 *
 * @owner Ficium Engineering
 */

import {
  Building2, PiggyBank, TrendingUp, ArrowLeftRight,
  CreditCard, ShieldCheck, Landmark, Wallet,
} from 'lucide-react'
import type { ElementType } from 'react'
import type { Move, QuickAsk, RemitItem } from '../types'

/** Quick-ask prompts — span the whole financial relationship, not just lending. */
export const QUICK_ASKS: QuickAsk[] = [
  { label: 'Review my accounts & cash flow' },
  { label: 'Should I refinance my home loan?' },
  { label: 'Best rate for an FX transfer' },
  { label: 'Optimise my cards & repayments' },
  { label: 'Grow my wealth' },
  { label: 'Review my insurance cover' },
  { label: 'Improve my credit health' },
]

/** Short prompt chips shown under the briefing and on mobile. */
export const QUICK_CHIPS: string[] = [
  'Review my accounts',
  'Refinance my home loan',
  'Best FX rate today',
  'Optimise my cards',
  'Grow my wealth',
  'Check my insurance cover',
  'Which provider fits me?',
]

/** FICO's remit — the full relationship-manager surface area. */
export const REMIT: RemitItem[] = [
  { label: 'Accounts & everyday banking', icon: Wallet,        tone: 'blue'   },
  { label: 'Cards & credit',              icon: CreditCard,    tone: 'violet' },
  { label: 'Home & property finance',     icon: Building2,     tone: 'blue'   },
  { label: 'Savings & deposits',          icon: PiggyBank,     tone: 'warn'   },
  { label: 'FX & transfers',              icon: ArrowLeftRight, tone: 'blue'  },
  { label: 'Investments & wealth',        icon: TrendingUp,    tone: 'good'   },
  { label: 'Insurance & protection',      icon: ShieldCheck,   tone: 'violet' },
]

/** Proactive moves — illustrative until wired to real data (see DATA SEAM). */
export const DEFAULT_MOVES: Move[] = [
  {
    id:        'refi-home-loan',
    domain:    'Home finance',
    title:     'Refinance your home loan',
    stat:      '−1.1',
    statUnit:  'pts',
    rationale: "You're paying above market. At today's prime rate that's roughly MUR 4,200/mo back in your pocket.",
    cta:       'See offers',
    to:        '/requests/new',
    tone:      'blue',
    icon:      Building2,
  },
  {
    id:        'move-idle-cash',
    domain:    'Savings',
    title:     'Move idle cash',
    stat:      '5.4%',
    rationale: 'Your balance earns near zero today. A high-yield deposit adds about MUR 32k a year, kept liquid.',
    cta:       'See offers',
    to:        '/requests/new',
    tone:      'warn',
    icon:      PiggyBank,
  },
  {
    id:        'time-fx-transfer',
    domain:    'FX & transfers',
    title:     'Time your USD transfer',
    stat:      '+1.8%',
    rationale: 'MUR/USD is favourable this week. On your usual transfer that\u2019s about MUR 6,900 more landing.',
    cta:       'See rates',
    to:        '/markets',
    tone:      'violet',
    icon:      ArrowLeftRight,
  },
]

/** Watch chips shown in the hero — what FICO is actively monitoring. */
export const WATCH: { label: string; icon: ElementType }[] = [
  { label: 'Watching 6 things for you', icon: ShieldCheck },
  { label: 'Home-loan rate now above market', icon: Building2 },
  { label: 'MUR/USD favourable this week', icon: Landmark },
]
