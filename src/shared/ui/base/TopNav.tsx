/**
 * @component TopNav
 * @description
 *   Horizontal top navigation for md+ (desktop/tablet) viewports.
 *   Hidden on mobile — BottomNav takes over there.
 *
 *   <TopNav role={role} />
 *
 * @owner Ficium Engineering
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Target, TrendingUp, User } from "lucide-react";
import { FiciumLogo } from "./FiciumLogo";
import { FicoMark } from "./FicoMark";

const tabs = [
  { to: "/dashboard", label: "Home",     icon: Home,       key: "home"     },
  { to: "/requests",  label: "Requests", icon: Target,     key: "requests" },
  { to: "/markets",   label: "Markets",  icon: TrendingUp, key: "markets"  },
  { to: "/profile",   label: "Profile",  icon: User,       key: "profile"  },
] as const;

export function TopNav({ role }: { role: string | null | undefined }) {
  const { pathname } = useLocation();

  if (role !== "client") return null;

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-14 bg-paper/85 backdrop-blur-xl border-b border-line items-center px-6">
      {/* Logo */}
      <Link to="/dashboard" className="mr-8 no-underline shrink-0">
        <FiciumLogo />
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to !== "/dashboard" && pathname.startsWith(t.to));
          const Icon   = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={[
                "relative flex items-center gap-2 px-3 py-1.5 rounded-pill text-sm font-semibold no-underline transition-colors",
                active
                  ? "text-ficium bg-ficium/10"
                  : "text-muted hover:text-ink hover:bg-line/50",
              ].join(" ")}
            >
              <Icon size={16} />
              {t.label}
              {/* gradient underline indicator */}
              {active && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-pill bg-rail"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* FICO advisor CTA */}
      <Link
        to="/advisor"
        aria-label="FICO Advisor"
        className="ml-4 no-underline flex items-center gap-2 px-4 py-1.5 rounded-pill bg-hero text-white text-sm font-semibold transition-opacity hover:opacity-90"
      >
        <FicoMark size={20} />
        FICO
      </Link>
    </header>
  );
}
