import { createBrowserRouter } from "react-router-dom";
import Splash from "../features/marketing/pages/Splash";
import Register from "../features/auth/pages/Register";
import Login from "../features/auth/pages/Login";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";
import Dashboard from "../features/dashboard/pages/Dashboard";
import CheckEmail from "../features/auth/pages/CheckEmail";
import Kyc from "../features/onboarding/pages/Kyc";
import Dossier from "../features/onboarding/pages/Dossier";
import Requests from "../features/requests/pages/Requests";
import NewRequest from "../features/requests/pages/NewRequest";
import Advisor from "../features/advisor/pages/Advisor";
import Alerts from "../features/alerts/pages/Alerts";
import Profile from "../features/dashboard/pages/Profile";
import BankRegister from "../features/bank/pages/BankRegister";
import BankPending from "../features/bank/pages/BankPending";
import NotFound from "../shared/pages/NotFound";
import { ProtectedRoute, PublicOnlyRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  // Public
  { path: "/", element: <Splash /> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/auth/reset-password", element: <ResetPassword /> },

  // Public-only
  { path: "/register",      element: <PublicOnlyRoute><Register /></PublicOnlyRoute> },
  { path: "/bank/register", element: <PublicOnlyRoute><BankRegister /></PublicOnlyRoute> },
  { path: "/login",         element: <PublicOnlyRoute><Login /></PublicOnlyRoute> },

  // Protected — client
  { path: "/dashboard",          element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
  { path: "/onboarding/kyc",     element: <ProtectedRoute><Kyc /></ProtectedRoute> },
  { path: "/onboarding/dossier", element: <ProtectedRoute><Dossier /></ProtectedRoute> },
  { path: "/requests",           element: <ProtectedRoute><Requests /></ProtectedRoute> },
  { path: "/requests/new",       element: <ProtectedRoute><NewRequest /></ProtectedRoute> },
  { path: "/advisor",            element: <ProtectedRoute><Advisor /></ProtectedRoute> },
  { path: "/alerts",             element: <ProtectedRoute><Alerts /></ProtectedRoute> },
  { path: "/profile",            element: <ProtectedRoute><Profile /></ProtectedRoute> },

  // Protected — bank
  { path: "/bank/pending", element: <ProtectedRoute><BankPending /></ProtectedRoute> },

  // Catch-all
  { path: "*", element: <NotFound /> },
]);