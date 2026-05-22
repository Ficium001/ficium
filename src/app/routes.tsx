import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PublicOnlyRoute, ClientOnlyRoute } from "./ProtectedRoute";

import Splash from "../features/marketing/pages/Splash";
import Login from "../features/auth/pages/Login";
import CheckEmail from "../features/auth/pages/CheckEmail";

const RegisterTypeSelect  = lazy(() => import("../features/auth/pages/RegisterTypeSelect"));
const RegisterIndividual  = lazy(() => import("../individual/auth/pages/RegisterIndividual"));
const RegisterBusiness    = lazy(() => import("../business/auth/pages/RegisterBusiness"));
const RegisterInstitution = lazy(() => import("../institution/auth/pages/RegisterInstitution"));
const ForgotPassword      = lazy(() => import("../features/auth/pages/ForgotPassword"));
const ResetPassword       = lazy(() => import("../features/auth/pages/ResetPassword"));
const Dashboard           = lazy(() => import("../individual/dashboard/pages/Dashboard"));
const Profile             = lazy(() => import("../individual/dashboard/pages/Profile"));
const Kyc                 = lazy(() => import("../individual/onboarding/pages/Kyc"));
const Dossier             = lazy(() => import("../individual/onboarding/pages/Dossier"));
const Requests            = lazy(() => import("../individual/requests/pages/Requests"));
const NewRequest          = lazy(() => import("../individual/requests/pages/NewRequest"));
const RequestDetail       = lazy(() => import("../individual/requests/pages/RequestDetail"));
const Alerts              = lazy(() => import("../individual/alerts/pages/Alerts"));
const Advisor             = lazy(() => import("../individual/advisor/pages/Advisor"));
const InstitutionPending  = lazy(() => import("../institution/auth/pages/InstitutionPending"));
const NotFound            = lazy(() => import("../shared/pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-ficium border-t-transparent animate-spin" />
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/",                       element: <Splash /> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },

  { path: "/login",                  element: <PublicOnlyRoute><Login /></PublicOnlyRoute> },
  { path: "/forgot-password",        element: <S><ForgotPassword /></S> },
  { path: "/auth/reset-password",    element: <S><ResetPassword /></S> },

  { path: "/register",               element: <PublicOnlyRoute><S><RegisterTypeSelect /></S></PublicOnlyRoute> },
  { path: "/register/individual",    element: <PublicOnlyRoute><S><RegisterIndividual /></S></PublicOnlyRoute> },
  { path: "/register/business",      element: <PublicOnlyRoute><S><RegisterBusiness /></S></PublicOnlyRoute> },
  { path: "/register/institution",   element: <PublicOnlyRoute><S><RegisterInstitution /></S></PublicOnlyRoute> },

  { path: "/institution/pending",    element: <S><InstitutionPending /></S> },

  { path: "/dashboard",              element: <ClientOnlyRoute><S><Dashboard /></S></ClientOnlyRoute> },
  { path: "/profile",                element: <ClientOnlyRoute><S><Profile /></S></ClientOnlyRoute> },
  { path: "/onboarding/kyc",         element: <ClientOnlyRoute><S><Kyc /></S></ClientOnlyRoute> },
  { path: "/onboarding/dossier",     element: <ClientOnlyRoute><S><Dossier /></S></ClientOnlyRoute> },
  { path: "/requests",               element: <ClientOnlyRoute><S><Requests /></S></ClientOnlyRoute> },
  { path: "/requests/new",           element: <ClientOnlyRoute><S><NewRequest /></S></ClientOnlyRoute> },
  { path: "/requests/:id",           element: <ClientOnlyRoute><S><RequestDetail /></S></ClientOnlyRoute> },
  { path: "/alerts",                 element: <ClientOnlyRoute><S><Alerts /></S></ClientOnlyRoute> },
  { path: "/advisor",                element: <ClientOnlyRoute><S><Advisor /></S></ClientOnlyRoute> },

  { path: "*",                       element: <S><NotFound /></S> },
]);
