# Skin Audit — screen alignment with the 2026 design system

Audit of every screen (and its feature components) vs the centralised skin:
ink hero `bg-hero`, `bg-paper` surface, dashboard kit, tokenised gradients.

**ON-SKIN**: kit, no legacy gradient · **PARTIAL**: kit + leftover legacy gradient · **LEGACY**: bespoke.

| Status | Screen | Kit | Legacy grad | bg-paper | `[#hex]` in page |
|---|---|:--:|:--:|:--:|:--:|
| ON-SKIN | `features/auth/Login.tsx` | ✓ | — | ✓ | 2 |
| ON-SKIN | `features/auth/CheckEmail.tsx` | ✓ | — | ✓ | 0 |
| ON-SKIN | `features/auth/ForgotPassword.tsx` | ✓ | — | ✓ | 0 |
| ON-SKIN | `features/auth/RegisterTypeSelect.tsx` | ✓ | — | ✓ | 0 |
| ON-SKIN | `features/auth/ResetPassword.tsx` | ✓ | — | ✓ | 0 |
| ON-SKIN | `individual/advisor/Advisor.tsx` | ✓ | — | ✓ | 0 |
| PARTIAL | `individual/dashboard/Profile.tsx` | ✓ | ⚠️ | ✓ | 3 |
| PARTIAL | `individual/requests/NewRequest.tsx` | ✓ | ⚠️ | ✓ | 3 |
| PARTIAL | `individual/dashboard/Dashboard.tsx` | ✓ | ⚠️ | ✓ | 0 |
| PARTIAL | `individual/markets/Markets.tsx` | ✓ | ⚠️ | ✓ | 0 |
| PARTIAL | `individual/requests/RequestDetail.tsx` | ✓ | ⚠️ | ✓ | 0 |
| PARTIAL | `individual/requests/Requests.tsx` | ✓ | ⚠️ | ✓ | 0 |
| PARTIAL | `shared/NotFound.tsx` | ✓ | ⚠️ | ✓ | 0 |
| LEGACY | `individual/journeys/Journeys.tsx` | — | ⚠️ | — | 15 |
| LEGACY | `individual/journeys/JourneyWizard.tsx` | — | ⚠️ | — | 14 |
| LEGACY | `individual/journeys/JourneyWorkspace.tsx` | — | ⚠️ | — | 14 |
| LEGACY | `features/marketing/HowItWorks.tsx` | — | ⚠️ | ✓ | 11 |
| LEGACY | `individual/alerts/Alerts.tsx` | — | ⚠️ | — | 4 |
| LEGACY | `individual/goals/Goals.tsx` | — | ⚠️ | — | 3 |
| LEGACY | `individual/goals/NewGoal.tsx` | — | ⚠️ | — | 3 |
| LEGACY | `individual/health/FinancialHealth.tsx` | — | ⚠️ | — | 3 |
| LEGACY | `individual/networth/NetWorth.tsx` | — | ⚠️ | — | 3 |
| LEGACY | `admin/FiciumAdminPanel.tsx` | — | — | — | 0 |
| LEGACY | `business/auth/RegisterBusiness.tsx` | — | — | — | 0 |
| LEGACY | `features/marketing/Splash.tsx` | — | ⚠️ | ✓ | 0 |
| LEGACY | `individual/audit/ClientAudit.tsx` | — | — | — | 0 |
| LEGACY | `individual/auth/RegisterIndividual.tsx` | — | — | — | 0 |
| LEGACY | `individual/goals/GoalDetail.tsx` | — | ⚠️ | — | 0 |
| LEGACY | `individual/onboarding/Dossier.tsx` | — | — | — | 0 |
| LEGACY | `individual/onboarding/Kyc.tsx` | — | — | — | 0 |
| LEGACY | `individual/onboarding/KycPending.tsx` | — | — | — | 0 |
| LEGACY | `individual/tools/FinancialTools.tsx` | — | ⚠️ | — | 0 |

**Totals:** 6 on-skin · 7 partial · 19 legacy.

## Centralisation status
- Gradients are now tokens in `tailwind.config.js` (`bg-hero/brand/brand-soft/accent/edge/…`).
- Design system (`src/shared/ui`) + advisor consume tokens only; CI skin-guard enforces it.
- Remaining work is migrating LEGACY/PARTIAL screens onto `PageShell` + kit.

## Migration order
1. `PageShell` wrapper (centralised `bg-paper` + width + nav slot) on every screen.
2. Bespoke dark headers → kit `Hero`.
3. Ad-hoc cards → `Panel`/`HoverCard`; `[#hex]` → tokens.
4. Retire legacy palette tokens (cream/accent/mint/peach).
5. Widen CI skin-guard scope per folder as it migrates.
