import { lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PublicOnlyRoute, ClientOnlyRoute, BankOnlyRoute } from "./ProtectedRoute";

import Splash from "../features/marketing/pages/Splash";
import Login from "../features/auth/pages/Login";
import CheckEmail from "../features/auth/pages/CheckEmail";

// ── Shared / marketing ────────────────────────────────────────
const RegisterTypeSelect  = lazy(() => import("../features/auth/pages/RegisterTypeSelect"));
const RegisterIndividual  = lazy(() => import("../individual/auth/pages/RegisterIndividual"));
const RegisterBusiness    = lazy(() => import("../business/auth/pages/RegisterBusiness"));
const RegisterInstitution = lazy(() => import("../institution/auth/pages/RegisterInstitution"));
const ForgotPassword      = lazy(() => import("../features/auth/pages/ForgotPassword"));
const ResetPassword       = lazy(() => import("../features/auth/pages/ResetPassword"));
const HowItWorks          = lazy(() => import("../features/marketing/pages/HowItWorks"));
const NotFound            = lazy(() => import("../shared/pages/NotFound"));

// ── Individual (client) app ───────────────────────────────────
const Dashboard           = lazy(() => import("../individual/dashboard/pages/Dashboard"));
const Profile             = lazy(() => import("../individual/dashboard/pages/Profile"));
const Kyc                 = lazy(() => import("../individual/onboarding/pages/Kyc"));
const KycPending          = lazy(() => import("../individual/onboarding/pages/KycPending"));
const Dossier             = lazy(() => import("../individual/onboarding/pages/Dossier"));
const Requests            = lazy(() => import("../individual/requests/pages/Requests"));
const NewRequest          = lazy(() => import("../individual/requests/pages/NewRequest"));
const RequestDetail       = lazy(() => import("../individual/requests/pages/RequestDetail"));
const Alerts              = lazy(() => import("../individual/alerts/pages/Alerts"));
const Markets             = lazy(() => import("../individual/markets/pages/Markets"));
const Advisor             = lazy(() => import("../individual/advisor/pages/Advisor"));
const FinancialTools      = lazy(() => import("../individual/tools/pages/FinancialTools"));
const ClientAudit         = lazy(() => import("../individual/audit/pages/ClientAudit"));
const Goals               = lazy(() => import("../individual/goals/pages/Goals"));
const NewGoal             = lazy(() => import("../individual/goals/pages/NewGoal"));
const GoalDetail          = lazy(() => import("../individual/goals/pages/GoalDetail"));

// ── Institution app ───────────────────────────────────────────
const InstitutionPending      = lazy(() => import("../institution/auth/pages/InstitutionPending"));
const InstitutionLogin        = lazy(() => import("../institution/auth/pages/InstitutionLogin"));
const InstitutionOnboarding   = lazy(() => import("../institution/auth/pages/InstitutionOnboarding"));
const FiciumAdminPanel        = lazy(() => import("../admin/pages/FiciumAdminPanel"));
const InstitutionPortalShell  = lazy(() => import("../institution/components/InstitutionPortalShell"));
const InstitutionDashboard    = lazy(() => import("../institution/dashboard/pages/InstitutionDashboard"));
const InstitutionMarketplace  = lazy(() => import("../institution/marketplace/pages/InstitutionMarketplace"));
const InstitutionApprovals    = lazy(() => import("../institution/approvals/pages/InstitutionApprovals"));
const InstitutionBids         = lazy(() => import("../institution/bids/pages/InstitutionBids"));
const InstitutionProducts     = lazy(() => import("../institution/products/pages/InstitutionProducts"));
const InstitutionWebhooks     = lazy(() => import("../institution/webhooks/pages/InstitutionWebhooks"));
const InstitutionAudit        = lazy(() => import("../institution/audit/pages/InstitutionAudit"));
const InstitutionSettings     = lazy(() => import("../institution/settings/pages/InstitutionSettings"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-ficium border-t-transparent animate-spin" />
    </div>
  );
}

// Catches chunk-load failures (stale cache after deploy) and auto-reloads once
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false };
  static getDerivedStateFromError() { return { errored: true }; }
  componentDidCatch(err: Error, _info: ErrorInfo) {
    const isChunkError = err.message.includes("Failed to fetch dynamically imported module")
      || err.message.includes("Importing a module script failed")
      || err.name === "ChunkLoadError";
    if (isChunkError && !sessionStorage.getItem("chunk_reload")) {
      sessionStorage.setItem("chunk_reload", "1");
      window.location.reload();
    }
  }
  render() {
    if (this.state.errored) {
      return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-ink font-semibold">Something went wrong loading this page.</p>
          <button
            onClick={() => { sessionStorage.removeItem("chunk_reload"); window.location.reload(); }}
            className="px-4 py-2 bg-ficium text-white rounded-xl text-sm font-semibold"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function S({ children }: { children: React.ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}

export const router = createBrowserRouter([

  // ── Marketing ───────────────────────────────────────────────
  { path: "/",                       element: <Splash /> },
  { path: "/how-it-works",           element: <S><HowItWorks /></S> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },

  // ── Auth (shared) ───────────────────────────────────────────
  { path: "/login",                  element: <PublicOnlyRoute><Login /></PublicOnlyRoute> },
  { path: "/forgot-password",        element: <S><ForgotPassword /></S> },
  { path: "/auth/reset-password",    element: <S><ResetPassword /></S> },
  { path: "/register",               element: <S><RegisterTypeSelect /></S> },
  { path: "/register/individual",    element: <S><RegisterIndividual /></S> },
  { path: "/register/business",      element: <S><RegisterBusiness /></S> },
  { path: "/register/institution",   element: <S><RegisterInstitution /></S> },

  // ── Individual (client) app ─────────────────────────────────
  { path: "/dashboard",              element: <ClientOnlyRoute><S><Dashboard /></S></ClientOnlyRoute> },
  { path: "/profile",                element: <ClientOnlyRoute><S><Profile /></S></ClientOnlyRoute> },
  { path: "/onboarding/kyc",         element: <ClientOnlyRoute><S><Kyc /></S></ClientOnlyRoute> },
  { path: "/onboarding/kyc-pending", element: <ClientOnlyRoute><S><KycPending /></S></ClientOnlyRoute> },
  { path: "/onboarding/dossier",     element: <ClientOnlyRoute><S><Dossier /></S></ClientOnlyRoute> },
  { path: "/requests",               element: <ClientOnlyRoute><S><Requests /></S></ClientOnlyRoute> },
  { path: "/requests/new",           element: <ClientOnlyRoute><S><NewRequest /></S></ClientOnlyRoute> },
  { path: "/requests/:id",           element: <ClientOnlyRoute><S><RequestDetail /></S></ClientOnlyRoute> },
  { path: "/alerts",                 element: <ClientOnlyRoute><S><Alerts /></S></ClientOnlyRoute> },
  { path: "/markets",               element: <ClientOnlyRoute><S><Markets /></S></ClientOnlyRoute> },
  { path: "/advisor",                element: <ClientOnlyRoute><S><Advisor /></S></ClientOnlyRoute> },
  { path: "/tools",                  element: <ClientOnlyRoute><S><FinancialTools /></S></ClientOnlyRoute> },
  { path: "/activity",               element: <ClientOnlyRoute><S><ClientAudit /></S></ClientOnlyRoute> },
  { path: "/goals",                  element: <ClientOnlyRoute><S><Goals /></S></ClientOnlyRoute> },
  { path: "/goals/new",              element: <ClientOnlyRoute><S><NewGoal /></S></ClientOnlyRoute> },
  { path: "/goals/:id",              element: <ClientOnlyRoute><S><GoalDetail /></S></ClientOnlyRoute> },

  // ── Institution app ─────────────────────────────────────────
  { path: "/institution/login",        element: <S><InstitutionLogin /></S> },
  { path: "/institution/register",     element: <S><RegisterInstitution /></S> },
  { path: "/institution/pending",      element: <S><InstitutionPending /></S> },
  { path: "/institution/onboarding",   element: <S><InstitutionOnboarding /></S> },

  {
    path: "/institution",
    element: <BankOnlyRoute><S><InstitutionPortalShell /></S></BankOnlyRoute>,
    children: [
      { index: true,            element: <S><InstitutionDashboard /></S>   },
      { path: "marketplace",    element: <S><InstitutionMarketplace /></S> },
      { path: "bids",           element: <S><InstitutionBids /></S>        },
      { path: "approvals",      element: <S><InstitutionApprovals /></S>   },
      { path: "products",       element: <S><InstitutionProducts /></S>    },
      { path: "webhooks",       element: <S><InstitutionWebhooks /></S>    },
      { path: "audit",          element: <S><InstitutionAudit /></S>       },
      { path: "settings",       element: <S><InstitutionSettings /></S>    },
    ],
  },

  // ── Admin panel ─────────────────────────────────────────────
  { path: "/admin", element: <S><FiciumAdminPanel /></S> },

  // ── Fallback ────────────────────────────────────────────────
  { path: "*", element: <S><NotFound /></S> },
]);
