/**
 * @component BottomNav
 * @description
 *   Primary mobile navigation for the client app — appears on every
 *   client screen. 2026 revamp: frosted bar, gradient active indicator,
 *   the centre "AI" tab raised as a brand-gradient action.
 *
 *   Tabs are data-driven; reordering or relabelling is a one-line edit.
 *
 *   Accepts `role` as a prop (injected by the consuming app's auth context)
 *   rather than importing auth directly — keeps this component app-agnostic.
 *
 *   <BottomNav role={role} />
 *
 * @owner Ficium Engineering
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Target, TrendingUp, User } from "lucide-react";
import { FicoMark } from "./FicoMark";

const tabs = [
  { to: "/dashboard", label: "Home",     icon: Home,       key: "home"     },
  { to: "/requests",  label: "Requests", icon: Target,     key: "requests" },
  { to: "/advisor",   label: "FICO",     icon: Target,     key: "advisor", accent: true },
  { to: "/markets",   label: "Market",   icon: TrendingUp, key: "markets"  },
  { to: "/profile",   label: "Profile",  icon: User,       key: "profile"  },
] as const;

export function BottomNav({ role }: { role: string | null | undefined }) {
  const { pathname } = useLocation();

  if (role !== "client") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-paper/85 backdrop-blur-xl border-t border-line">
      <div className="max-w-[640px] mx-auto grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to !== "/dashboard" && pathname.startsWith(t.to));
          const Icon   = t.icon;

          // Centre FICO tab: raised identity mark
          if ("accent" in t && t.accent) {
            return (
              <Link key={t.to} to={t.to} aria-label={t.label}
                className="relative flex flex-col items-center justify-center py-2 gap-1 no-underline">
                <span className="-mt-5 transition-transform duration-300 ease-swift active:scale-95">
                  <FicoMark size={44} glow />
                </span>
                <span className={`text-[10px] font-semibold ${active ? "text-ficium" : "text-muted"}`}>
                  {t.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={t.to}
              to={t.to}
              className={[
                "relative flex flex-col items-center justify-center py-2.5 gap-0.5 no-underline transition-colors",
                active ? "text-ficium" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {/* gradient active indicator */}
              <span
                aria-hidden
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-pill bg-rail transition-opacity duration-300 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
