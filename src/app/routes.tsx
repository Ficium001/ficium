import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PublicOnlyRoute, ClientOnlyRoute } from "./ProtectedRoute";

// Eagerly loaded — needed on first paint
import Splash from "../features/marketing/pages/Splash";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import CheckEmail from "../features/auth/pages/CheckEmail";

// Lazy loaded — downloaded only when the route is visited
const ForgotPassword  = lazy(() => import("../features/auth/pages/ForgotPassword"));
const ResetPassword   = lazy(() => import("../features/auth/pages/ResetPassword"));
const Dashboard       = lazy(() => import("../features/dashboard/pages/Dashboard"));
const Profile         = lazy(() => import("../features/dashboard/pages/Profile"));
const Kyc             = lazy(() => import("../features/onboarding/pages/Kyc"));
const Dossier         = lazy(() => import("../features/onboarding/pages/Dossier"));
const Requests        = lazy(() => import("../features/requests/pages/Requests"));
const NewRequest      = lazy(() => import("../features/requests/pages/NewRequest"));
const RequestDetail   = lazy(() => import("../features/requests/pages/RequestDetail"));
const Alerts          = lazy(() => import("../features/alerts/pages/Alerts"));
const Advisor         = lazy(() => import("../features/advisor/pages/Advisor"));
const BankRegister    = lazy(() => import("../features/bank/pages/BankRegister"));
const BankPending     = lazy(() => import("../features/bank/pages/BankPending"));
const NotFound        = lazy(() => import("../shared/pages/NotFound"));

// Spinner shown while a lazy chunk is downloading
function PageLoader() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-ficium border-t-transparent animate-spin" />
    </div>
  );
}

// Shorthand wrapper so routes stay readable
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────────
  { path: "/",                      element: <Splash /> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },

  // ── Public only (redirect if already logged in) ──────────────────
  { path: "/login",                 element: <PublicOnlyRoute><Login /></PublicOnlyRoute> },
  { path: "/register",              element: <PublicOnlyRoute><Register /></PublicOnlyRoute> },
  { path: "/forgot-password",       element: <S><ForgotPassword /></S> },
  { path: "/auth/reset-password",   element: <S><ResetPassword /></S> },

  // ── Bank public ──────────────────────────────────────────────────
  { path: "/bank/register",         element: <S><BankRegister /></S> },
  { path: "/bank/pending",          element: <S><BankPending /></S> },

// Client-only protected routes
{ path: "/dashboard",          element: <ClientOnlyRoute><S><Dashboard /></S></ClientOnlyRoute> },
{ path: "/profile",            element: <ClientOnlyRoute><S><Profile /></S></ClientOnlyRoute> },
{ path: "/onboarding/kyc",     element: <ClientOnlyRoute><S><Kyc /></S></ClientOnlyRoute> },
{ path: "/onboarding/dossier", element: <ClientOnlyRoute><S><Dossier /></S></ClientOnlyRoute> },
{ path: "/requests",           element: <ClientOnlyRoute><S><Requests /></S></ClientOnlyRoute> },
{ path: "/requests/new",       element: <ClientOnlyRoute><S><NewRequest /></S></ClientOnlyRoute> },
{ path: "/requests/:id",       element: <ClientOnlyRoute><S><RequestDetail /></S></ClientOnlyRoute> },
{ path: "/alerts",             element: <ClientOnlyRoute><S><Alerts /></S></ClientOnlyRoute> },
{ path: "/advisor",            element: <ClientOnlyRoute><S><Advisor /></S></ClientOnlyRoute> },

  // ── Fallback ─────────────────────────────────────────────────────
  { path: "*",                      element: <S><NotFound /></S> },
]);