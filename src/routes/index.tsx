import { createBrowserRouter } from "react-router-dom";
import Splash from "../pages/Splash";
import Register from "../pages/Register";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import CheckEmail from "../pages/CheckEmail";
import Kyc from "../pages/Kyc";
import Dossier from "../pages/Dossier";
import Requests from "../pages/Requests";
import NewRequest from "../pages/NewRequest";
import Advisor from "../pages/Advisor";
import Alerts from "../pages/Alerts";
import Profile from "../pages/Profile";
import NotFound from "../pages/NotFound";
import { ProtectedRoute, PublicOnlyRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  // Public
  { path: "/", element: <Splash /> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },

  // Public-only
  { path: "/register", element: <PublicOnlyRoute><Register /></PublicOnlyRoute> },
  { path: "/login",    element: <PublicOnlyRoute><Login /></PublicOnlyRoute> },

  // Protected
  { path: "/dashboard",          element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
  { path: "/onboarding/kyc",     element: <ProtectedRoute><Kyc /></ProtectedRoute> },
  { path: "/onboarding/dossier", element: <ProtectedRoute><Dossier /></ProtectedRoute> },
  { path: "/requests",           element: <ProtectedRoute><Requests /></ProtectedRoute> },
  { path: "/requests/new",       element: <ProtectedRoute><NewRequest /></ProtectedRoute> },
  { path: "/advisor",            element: <ProtectedRoute><Advisor /></ProtectedRoute> },
  { path: "/alerts",             element: <ProtectedRoute><Alerts /></ProtectedRoute> },
  { path: "/profile",            element: <ProtectedRoute><Profile /></ProtectedRoute> },

  // Catch-all
  { path: "*", element: <NotFound /> },
]);