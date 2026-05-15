import { createBrowserRouter } from "react-router-dom";
import Splash from "../pages/Splash";
import Register from "../pages/Register";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import NotFound from "../pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Splash /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Login /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "*", element: <NotFound /> },
]);