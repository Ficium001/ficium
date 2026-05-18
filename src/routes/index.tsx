import { createBrowserRouter } from "react-router-dom";
import Splash from "../pages/Splash";
import Register from "../pages/Register";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import CheckEmail from "../pages/CheckEmail";
import NotFound from "../pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Splash /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Login /> },
  { path: "/onboarding/check-email", element: <CheckEmail /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "*", element: <NotFound /> },
]);