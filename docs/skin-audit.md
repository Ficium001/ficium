# Skin Audit — screen alignment with the 2026 design system

Audit of every live screen (+ feature components) vs the centralised skin:
`PageShell`/`RegisterShell` (paper surfaces) · ink `bg-hero`/`bg-hero-deep` · dashboard kit · tokenised gradients.

**ON-SKIN** · **PARTIAL** (modern + leftover legacy) · **LEGACY** (bespoke).

| Status | Screen | Modern | Legacy hex/cream | `[#hex]` |
|---|---|:--:|:--:|:--:|
| ON-SKIN | `individual/dashboard/Profile.tsx` | ✓ | — | 3 |
| ON-SKIN | `features/auth/Login.tsx` | ✓ | — | 2 |
| ON-SKIN | `features/marketing/HowItWorks.tsx` | ✓ | — | 2 |
| ON-SKIN | `business/auth/RegisterBusiness.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/CheckEmail.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/ForgotPassword.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/RegisterTypeSelect.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/ResetPassword.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/marketing/Splash.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/advisor/Advisor.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/alerts/Alerts.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/auth/RegisterIndividual.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/dashboard/Dashboard.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/health/FinancialHealth.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/markets/Markets.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/networth/NetWorth.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/requests/NewRequest.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/requests/RequestDetail.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/requests/Requests.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/tools/FinancialTools.tsx` | ✓ | — | 0 |
| ON-SKIN | `shared/NotFound.tsx` | ✓ | — | 0 |
| LEGACY | `admin/FiciumAdminPanel.tsx` | — | — | 0 |
| LEGACY | `individual/audit/ClientAudit.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/Dossier.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/Kyc.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/KycPending.tsx` | — | — | 0 |

**Totals:** 21 on-skin · 0 partial · 5 legacy (of 26 live screens).

## Centralisation
- `bg-cream` retired app-wide: page surfaces -> `bg-paper`, component fills (inputs/hover rows on white cards) -> new `bg-surface` (#F6F5FA) token.
- All signature gradients are tokens in `tailwind.config.js` (`bg-hero`, `bg-hero-deep`, `bg-brand`, `bg-brand-cta`, `bg-brand-soft`, `bg-accent`, `bg-edge[-h]`, `bg-rail`, `bg-callout`, `bg-mark`).
- `PageShell` centralises the page frame; `RegisterShell` centralises the auth split-panel; both consume the tokens.
- `src/shared/ui` + advisor are gradient-token only — CI skin-guard enforces it.
- Dead code removed: Goals/Journeys (6 files, prior commit) and unused `DashboardBackground` (this batch).

## Remaining LEGACY screens
Onboarding/auth/admin/marketing shells not yet on PageShell/Hero — next batch candidates.

Widen the CI skin-guard folder scope as each migrates.
