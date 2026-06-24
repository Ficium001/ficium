// =============================================================
// Ficium — WhatAreYouPlanningSection (v3.2)
// Emoji icons match the reference design exactly.
// =============================================================
import { useNavigate } from "react-router-dom";

const BORROW = [
  { id: "mortgage",  emoji: "🏠", label: "Home loan",      route: "/requests/new?type=mortgage",  bg: "#dbeafe", color: "#1d4ed8" },
  { id: "personal",  emoji: "👤", label: "Personal loan",  route: "/requests/new?type=personal",  bg: "#dbeafe", color: "#2563eb" },
  { id: "credit",    emoji: "💳", label: "Credit card",    route: "/requests/new?type=credit",    bg: "#fce7f3", color: "#be185d" },
  { id: "vehicle",   emoji: "🚗", label: "Vehicle loan",   route: "/requests/new?type=vehicle",   bg: "#fef9c3", color: "#ca8a04" },
  { id: "auto",      emoji: "🚙", label: "Vehicle loan",   route: "/requests/new?type=auto",      bg: "#fef9c3", color: "#a16207" },
  { id: "business",  emoji: "🧳", label: "Business loan",  route: "/requests/new?type=business",  bg: "#fee2e2", color: "#dc2626" },
  { id: "education", emoji: "🎓", label: "Education loan", route: "/requests/new?type=education", bg: "#d1fae5", color: "#059669" },
];

const SAVE = [
  { id: "deposit", emoji: "🏛️", label: "Place a deposit", route: "/requests/new?type=deposit", bg: "#dcfce7", color: "#16a34a" },
  { id: "savings", emoji: "📈", label: "Grow my savings", route: "/requests/new?type=savings", bg: "#dcfce7", color: "#15803d" },
];

export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[20px] border border-ink/[0.06] shadow-card p-5">

      {/* Header */}
      <h2 className="font-display text-[18px] sm:text-[20px] font-bold text-ink leading-snug mb-0.5">
        Providers compete for you
      </h2>
      <p className="text-[13px] font-medium text-emerald-600 mb-4">
        Providers review it and send you their best offer.
      </p>

      {/* ── Financing tiles ───────────────────────────────── */}
      <p className="text-[13px] font-semibold text-ink mb-3">
        What do you need financing for?
      </p>

      <div className="flex flex-wrap gap-2.5 mb-5">
        {BORROW.map(({ id, emoji, label, route, bg, color }) => (
          <button
            key={id}
            onClick={() => navigate(route)}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            style={{ width: 76 }}
          >
            <div
              className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}
            >
              <span style={{ fontSize: 30, lineHeight: 1 }}>{emoji}</span>
            </div>
            <span className="text-[11px] font-medium text-center leading-tight" style={{ color }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Money to place ─────────────────────────────────── */}
      <p className="text-[13px] font-semibold text-ink mb-3">
        I have money to place
      </p>

      <div className="flex flex-wrap gap-2.5">
        {SAVE.map(({ id, emoji, label, route, bg, color }) => (
          <button
            key={id}
            onClick={() => navigate(route)}
            className="flex items-center gap-2.5 rounded-[14px] px-4 py-3.5 active:scale-[0.97] transition-transform flex-1 min-w-[140px]"
            style={{ background: bg }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
            <span className="text-[13px] font-semibold leading-tight text-left" style={{ color }}>
              {label}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
