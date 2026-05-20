import { Link, useLocation } from "react-router-dom";
import { Home, FileText, Sparkles, Bell, User } from "lucide-react";
import { useAuth } from "../../features/auth/context/AuthContext";

const tabs = [
  { to: "/dashboard", label: "Home",     icon: Home,     key: "home"     },
  { to: "/requests",  label: "Requests", icon: FileText, key: "requests" },
  { to: "/advisor",   label: "AI",       icon: Sparkles, key: "advisor"  },
  { to: "/alerts",    label: "Alerts",   icon: Bell,     key: "alerts"   },
  { to: "/profile",   label: "Profile",  icon: User,     key: "profile"  },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const { unreadCount, role } = useAuth();

  // BottomNav is client-only — banks have a different UI
  if (role !== "client") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-ink/[0.06]">
      <div className="max-w-[640px] mx-auto grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to !== "/dashboard" && pathname.startsWith(t.to));
          const Icon = t.icon;
          const showBadge = t.key === "alerts" && unreadCount > 0;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={[
                "relative flex flex-col items-center justify-center py-2.5 gap-0.5 no-underline transition-colors",
                active ? "text-ficium" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              <div className="relative">
                <Icon size={20} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}