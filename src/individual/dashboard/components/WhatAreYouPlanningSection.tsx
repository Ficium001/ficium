// =============================================================
// Ficium — WhatAreYouPlanningSection (v3)
// Clean tile-based design: tap a category → goes straight to wizard.
// Two sections:
//   "What do you need financing for?" — 4-col icon grid
//   "I have money to place"           — 2-col wide cards
// =============================================================
import { useNavigate } from "react-router-dom";
import {
  Home, Car, CreditCard, GraduationCap, Briefcase, User,
  Building2, TrendingUp,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────
const BORROW: Array<{
  id: string; icon: React.ElementType; label: string;
  route: string; bg: string; color: string;
}> = [
  { id: "mortgage",  icon: Home,          label: "Home loan",      route: "/requests/new?type=mortgage",  bg: "#dbeafe", color: "#1d4ed8" },
  { id: "personal",  icon: User,          label: "Personal loan",  route: "/requests/new?type=personal",  bg: "#dbeafe", color: "#2563eb" },
  { id: "credit",    icon: CreditCard,    label: "Credit card",    route: "/requests/new?type=credit",    bg: "#fce7f3", color: "#be185d" },
  { id: "vehicle",   icon: Car,           label: "Vehicle loan",   route: "/requests/new?type=vehicle",   bg: "#fef9c3", color: "#ca8a04" },
  { id: "auto",      icon: Car,           label: "Vehicle loan",   route: "/requests/new?type=auto",      bg: "#fef9c3", color: "#a16207" },
  { id: "business",  icon: Briefcase,     label: "Business loan",  route: "/requests/new?type=business",  bg: "#fee2e2", color: "#dc2626" },
  { id: "education", icon: GraduationCap, label: "Education loan", route: "/requests/new?type=education", bg: "#d1fae5", color: "#059669" },
];

const SAVE: Array<{
  id: string; icon: React.ElementType; label: string;
  route: string; bg: string; color: string;
}> = [
  { id: "deposit", icon: Building2,  label: "Place a deposit", route: "/requests/new?type=deposit", bg: "#dcfce7", color: "#16a34a" },
  { id: "savings", icon: TrendingUp, label: "Grow my savings", route: "/requests/new?type=savings", bg: "#dcfce7", color: "#15803d" },
];

// ── Component ─────────────────────────────────────────────────
export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[20px] border border-ink/[0.06] shadow-card p-5">

      {/* Header */}
      <h2 className="font-display text-[19px] font-bold text-ink leading-snug mb-0.5">
        Providers compete for you
      </h2>
      <p className="text-[13px] font-medium text-emerald-600 mb-4">
        Providers review it and send you their best offer.
      </p>

      {/* ── Financing grid ─────────────────────────────────── */}
      <p className="text-[13px] font-semibold text-ink mb-3">
        What do you need financing for?
      </p>

      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {BORROW.map(({ id, icon: Icon, label, route, bg, color }) => (
          <button
            key={id}
            onClick={() => navigate(route)}
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
          >
            <div
              className="w-full aspect-square rounded-[14px] flex items-center justify-center"
              style={{ background: bg }}
            >
              <Icon size={26} color={color} strokeWidth={1.8} />
            </div>
            <span className="text-[10.5px] font-medium text-ink text-center leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Money to place ─────────────────────────────────── */}
      <p className="text-[13px] font-semibold text-ink mb-3">
        I have money to place
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {SAVE.map(({ id, icon: Icon, label, route, bg, color }) => (
          <button
            key={id}
            onClick={() => navigate(route)}
            className="flex items-center gap-2.5 rounded-[14px] px-3 py-3.5 active:scale-[0.97] transition-transform"
            style={{ background: bg }}
          >
            <Icon size={20} color={color} strokeWidth={1.8} />
            <span className="text-[12.5px] font-semibold text-ink leading-tight text-left">
              {label}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
