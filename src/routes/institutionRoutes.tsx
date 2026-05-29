// =============================================================
// Ficium 3 — Institution Portal Router
// Drop these routes into your existing App.tsx router.
//
// Usage in App.tsx:
//   import { institutionRoutes } from './routes/institutionRoutes'
//   // Add to your createBrowserRouter routes array:
//   ...institutionRoutes
// =============================================================
import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import InstitutionRoute from '../components/institution/InstitutionRoute'
import InstitutionPortalShell from '../components/institution/InstitutionPortalShell'

// ── Lazy-loaded pages (code-split per section) ─────────────────
const InstitutionDashboard    = lazy(() => import('../pages/institution/InstitutionDashboard'))
const InstitutionMarketplace  = lazy(() => import('../pages/institution/InstitutionMarketplace'))
const InstitutionBids         = lazy(() => import('../pages/institution/InstitutionBids'))
const InstitutionApprovals    = lazy(() => import('../pages/institution/InstitutionApprovals'))
const InstitutionProducts     = lazy(() => import('../pages/institution/InstitutionProducts'))
const InstitutionWebhooks     = lazy(() => import('../pages/institution/InstitutionWebhooks'))
const InstitutionAudit        = lazy(() => import('../pages/institution/InstitutionAudit'))
const InstitutionSettings     = lazy(() => import('../pages/institution/InstitutionSettings'))
const InstitutionOnboarding   = lazy(() => import('../pages/institution/InstitutionOnboarding'))
const InstitutionLogin        = lazy(() => import('../pages/institution/InstitutionLogin'))

// ── Page loading fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center h-full min-h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// ── Route definitions ──────────────────────────────────────────
export const institutionRoutes: RouteObject[] = [
  // Public institution routes (no auth required)
  {
    path: '/institution/login',
    element: <Lazy><InstitutionLogin /></Lazy>,
  },
  {
    path: '/institution/onboarding',
    element: <Lazy><InstitutionOnboarding /></Lazy>,
  },
  {
    path: '/institution/onboarding/status',
    element: <Lazy><InstitutionOnboarding /></Lazy>,
  },

  // Protected institution portal (wrapped in InstitutionRoute guard)
  {
    path: '/institution',
    element: <InstitutionRoute />,
    children: [
      {
        element: <InstitutionPortalShell />,
        children: [
          { index: true,              element: <Lazy><InstitutionDashboard /></Lazy>   },
          { path: 'marketplace',      element: <Lazy><InstitutionMarketplace /></Lazy> },
          { path: 'bids',             element: <Lazy><InstitutionBids /></Lazy>        },
          { path: 'approvals',        element: <Lazy><InstitutionApprovals /></Lazy>   },
          { path: 'products',         element: <Lazy><InstitutionProducts /></Lazy>    },
          { path: 'webhooks',         element: <Lazy><InstitutionWebhooks /></Lazy>    },
          { path: 'audit',            element: <Lazy><InstitutionAudit /></Lazy>       },
          { path: 'settings',         element: <Lazy><InstitutionSettings /></Lazy>    },
        ],
      },
    ],
  },
]
