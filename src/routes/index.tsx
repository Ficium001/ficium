import { createBrowserRouter } from "react-router-dom";
import Splash from "../pages/Splash";
import Register from "../pages/Register";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import CheckEmail from "../pages/CheckEmail";
import NotFound from "../pages/NotFound";
import { ProtectedRoute, PublicOnlyRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  // Public — everyone can see
  { path: "/", element: <Splash /> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },

  // Public-only — bounce to dashboard if already logged in
  {
    path: "/register",
    element: (
      <PublicOnlyRoute>
        <Register />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <Login />
      </PublicOnlyRoute>
    ),
  },

  // Protected — require login
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },

  // Catch-all
  { path: "*", element: <NotFound /> },
]);