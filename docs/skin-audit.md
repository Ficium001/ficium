# Skin Audit — screen alignment with the 2026 design system

Audit of every screen (+ feature components) vs the centralised skin.

| Status | Screen | Modern | Legacy hex/cream | `[#hex]` |
|---|---|:--:|:--:|:--:|
| ON-SKIN | `individual/dashboard/Profile.tsx` | ✓ | — | 3 |
| ON-SKIN | `features/auth/Login.tsx` | ✓ | — | 2 |
| ON-SKIN | `business/auth/RegisterBusiness.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/CheckEmail.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/ForgotPassword.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/RegisterTypeSelect.tsx` | ✓ | — | 0 |
| ON-SKIN | `features/auth/ResetPassword.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/advisor/Advisor.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/auth/RegisterIndividual.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/dashboard/Dashboard.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/markets/Markets.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/requests/NewRequest.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/requests/RequestDetail.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/requests/Requests.tsx` | ✓ | — | 0 |
| PARTIAL | `shared/NotFound.tsx` | ✓ | ⚠️ | 0 |
| LEGACY | `features/marketing/HowItWorks.tsx` | — | ⚠️ | 11 |
| LEGACY | `individual/alerts/Alerts.tsx` | — | ⚠️ | 4 |
| LEGACY | `individual/health/FinancialHealth.tsx` | — | ⚠️ | 3 |
| LEGACY | `individual/networth/NetWorth.tsx` | — | ⚠️ | 3 |
| LEGACY | `admin/FiciumAdminPanel.tsx` | — | — | 0 |
| LEGACY | `features/marketing/Splash.tsx` | — | ⚠️ | 0 |
| LEGACY | `individual/audit/ClientAudit.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/Dossier.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/Kyc.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/KycPending.tsx` | — | — | 0 |
| LEGACY | `individual/tools/FinancialTools.tsx` | — | ⚠️ | 0 |

**Totals:** 14 on-skin · 1 partial · 11 legacy.
(This branch is on top of main; PR #8 and #10 — not yet merged — fix the PARTIAL screens shown here.)

## Centralisation
- `bg-cream` retired app-wide: page surfaces -> `bg-paper`, component fills (inputs/hover rows) -> new `bg-surface` token.
- All signature gradients are tokens (`bg-hero`, `bg-hero-deep`, `bg-brand`, etc.) in `tailwind.config.js`.
- Dead code removed: Goals/Journeys (prior commit), unused `DashboardBackground` (this batch).
- CI skin-guard enforces zero raw gradients in `src/shared/ui` + advisor.
