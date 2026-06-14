# Skin Audit — screen alignment with the 2026 design system

Audit of every screen (+ its feature components) vs the centralised skin:
`PageShell` (bg-paper) · ink `bg-hero` · dashboard kit · tokenised gradients.

**ON-SKIN** · **PARTIAL** (modern + leftover legacy) · **LEGACY** (bespoke) · **RETIRED** (route redirects, not rendered).

| Status | Screen | Modern | Legacy grad/cream | `[#hex]` |
|---|---|:--:|:--:|:--:|
| ON-SKIN | `individual/advisor/Advisor.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/alerts/Alerts.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/health/FinancialHealth.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/networth/NetWorth.tsx` | ✓ | — | 0 |
| ON-SKIN | `individual/tools/FinancialTools.tsx` | ✓ | — | 0 |
| PARTIAL | `individual/dashboard/Profile.tsx` | ✓ | ⚠️ | 3 |
| PARTIAL | `individual/requests/NewRequest.tsx` | ✓ | ⚠️ | 3 |
| PARTIAL | `features/auth/Login.tsx` | ✓ | ⚠️ | 2 |
| PARTIAL | `features/auth/CheckEmail.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `features/auth/ForgotPassword.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `features/auth/RegisterTypeSelect.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `features/auth/ResetPassword.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `individual/dashboard/Dashboard.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `individual/markets/Markets.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `individual/requests/RequestDetail.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `individual/requests/Requests.tsx` | ✓ | ⚠️ | 0 |
| PARTIAL | `shared/NotFound.tsx` | ✓ | ⚠️ | 0 |
| LEGACY | `features/marketing/HowItWorks.tsx` | — | ⚠️ | 11 |
| LEGACY | `admin/FiciumAdminPanel.tsx` | — | ⚠️ | 0 |
| LEGACY | `business/auth/RegisterBusiness.tsx` | — | — | 0 |
| LEGACY | `features/marketing/Splash.tsx` | — | ⚠️ | 0 |
| LEGACY | `individual/audit/ClientAudit.tsx` | — | ⚠️ | 0 |
| LEGACY | `individual/auth/RegisterIndividual.tsx` | — | — | 0 |
| LEGACY | `individual/onboarding/Dossier.tsx` | — | ⚠️ | 0 |
| LEGACY | `individual/onboarding/Kyc.tsx` | — | ⚠️ | 0 |
| LEGACY | `individual/onboarding/KycPending.tsx` | — | ⚠️ | 0 |
| RETIRED | `individual/journeys/Journeys.tsx` | — | ⚠️ | 15 |
| RETIRED | `individual/journeys/JourneyWizard.tsx` | — | ⚠️ | 14 |
| RETIRED | `individual/journeys/JourneyWorkspace.tsx` | — | ⚠️ | 14 |
| RETIRED | `individual/goals/Goals.tsx` | — | ⚠️ | 3 |
| RETIRED | `individual/goals/NewGoal.tsx` | — | ⚠️ | 3 |
| RETIRED | `individual/goals/GoalDetail.tsx` | — | ⚠️ | 0 |

**Totals:** 5 on-skin · 12 partial · 9 legacy · 6 retired (delete candidates).

## Centralisation
- Gradients are tokens in `tailwind.config.js`; `src/shared/ui` + advisor are gradient-token only (CI-enforced).
- `PageShell` centralises the page frame; `Hero`/`bg-hero` centralise the header band.

## Remaining migration (live screens)
- LEGACY client screens still bespoke: Dossier, Kyc, KycPending, ClientAudit, RegisterIndividual, RegisterBusiness, FiciumAdminPanel, Splash, HowItWorks.
- RETIRED (Goals/Journeys) redirect to /requests — safe to delete the page files.
- Widen the CI skin-guard folder scope as each migrates.
