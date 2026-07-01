import { useNavigate } from "react-router-dom";

type IC = { color: string };

/* ── Inline SVG icons ──────────────────────────────── */
const IconHouse       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>);
const IconPerson      = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/></svg>);
const IconCard        = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>);
const IconCar         = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M18.9 6C18.7 5.4 18.1 5 17.5 5h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8L18.9 6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>);
const IconRenovation  = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M13.7 2.3a1 1 0 0 0-1.4 0L8 6.6 3.7 2.3A1 1 0 0 0 2.3 3.7L6.6 8l-4.3 4.3a1 1 0 0 0 1.4 1.4L8 9.4l4.3 4.3a1 1 0 0 0 1.4-1.4L9.4 8l4.3-4.3a1 1 0 0 0 0-1.4zM19 11h-1V3a1 1 0 0 0-2 0v8h-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1zm-1 8h-2v-6h2v6z"/></svg>);
const IconGradCap     = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M12 3 1 9l4 2.2V16l7 4 7-4v-4.8L23 9 12 3zm6.8 6L12 12.7 5.2 9 12 5.3 18.8 9zM17 14.4l-5 2.9-5-2.9v-2.7l5 2.8 5-2.8v2.7z"/></svg>);
const IconBank        = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zm-5 9h14v2H5v-2zm11-9v7h3v-7h-3zM12 1L2 6v2h20V6L12 1z"/></svg>);
const IconChart       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M5 9.5v9H3v2h18v-2h-2v-9h-3v9h-2v-9h-3v9H9v-9H5zm7-7.5L6.5 7H9v2h6V7h2.5L12 2z"/></svg>);
const IconShares      = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M3.5 18.5l4-4 4 4 6-8 3.5 4.5M21 21H3M21 3h-6m6 6h-4m4-3h-2"/><path fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" d="M3.5 18.5l4-4 4 4 6-8"/><circle cx="19" cy="5" r="2" fill={color}/><circle cx="5" cy="19" r="1.5" fill={color}/></svg>);
const IconFunds       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>);
const IconCalendar    = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM7 15h2v2H7zm4 0h2v2h-2z"/></svg>);
const IconBonds       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>);
const IconGlobe       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="32" height="32" fill={color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>);

/* ── Item definitions ──────────────────────────────────────── */
const BORROW = [
  { id: "mortgage",    Icon: IconHouse,      label: "Home loan",       route: "/requests/new?type=mortgage",    bg: "#dbeafe", color: "#1d4ed8" },
  { id: "personal",    Icon: IconPerson,     label: "Personal loan",   route: "/requests/new?type=personal",    bg: "#dbeafe", color: "#2563eb" },
  { id: "credit",      Icon: IconCard,       label: "Credit card",     route: "/requests/new?type=credit",      bg: "#fce7f3", color: "#be185d" },
  { id: "vehicle",     Icon: IconCar,        label: "Vehicle loan",    route: "/requests/new?type=vehicle",     bg: "#fef9c3", color: "#ca8a04" },
  { id: "renovation",  Icon: IconRenovation, label: "Renovation loan", route: "/requests/new?type=renovation",  bg: "#ede9fe", color: "#7c3aed" },
  { id: "education",   Icon: IconGradCap,    label: "Education loan",  route: "/requests/new?type=education",   bg: "#d1fae5", color: "#059669" },
] as const;

const SAVE_AND_EARN = [
  { id: "deposit",  Icon: IconBank,     label: "Place a deposit", route: "/requests/new?type=deposit",  bg: "#d1fae5", color: "#059669" },
  { id: "savings",  Icon: IconChart,    label: "Grow my savings", route: "/requests/new?type=savings",  bg: "#d1fae5", color: "#047857" },
] as const;

const INVEST = [
  { id: "equities",  Icon: IconShares,   label: "Listed shares",    route: "/requests/new?type=equities",  bg: "#ccfbf1", color: "#0d9488" },
  { id: "funds",     Icon: IconFunds,    label: "Unit trusts",      route: "/requests/new?type=funds",     bg: "#cffafe", color: "#0891b2" },
  { id: "monthly",   Icon: IconCalendar, label: "Monthly plan",     route: "/requests/new?type=monthly",   bg: "#dcfce7", color: "#15803d" },
  { id: "bonds",     Icon: IconBonds,    label: "Gov bonds",        route: "/requests/new?type=bonds",     bg: "#ecfccb", color: "#4d7c0f" },
  { id: "offshore",  Icon: IconGlobe,    label: "Offshore",         route: "/requests/new?type=offshore",  bg: "#e0f2fe", color: "#0369a1" },
] as const;

/* ── Tile component ──────────────────────────────────────────── */
function Tile({
  Icon, label, route, bg, color, onClick,
}: {
  Icon: React.ComponentType<IC>;
  label: string;
  route: string;
  bg: string;
  color: string;
  onClick: (route: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(route)}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
      style={{ width: 76 }}
    >
      <div
        className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center"
        style={{ background: bg }}
      >
        <Icon color={color} />
      </div>
      <span className="text-[11px] font-medium text-center leading-tight" style={{ color }}>
        {label}
      </span>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[20px] border border-ink/[0.06] shadow-card p-5">

      <h2 className="font-display text-[18px] sm:text-[20px] font-bold text-ink leading-snug mb-0.5">
        Providers compete for you
      </h2>
      <p className="text-[13px] font-medium text-emerald-600 mb-4">
        Providers review it and send you their best offer.
      </p>

      {/* ── Borrow ── */}
      <p className="text-[13px] font-semibold text-ink mb-3">
        What do you need financing for?
      </p>
      <div className="flex flex-wrap gap-2.5 mb-5">
        {BORROW.map(({ id, Icon, label, route, bg, color }) => (
          <Tile key={id} Icon={Icon} label={label} route={route} bg={bg} color={color} onClick={navigate} />
        ))}
      </div>

      <div className="h-px bg-ink/[0.05] mb-5" />

      {/* ── Save & earn ── */}
      <p className="text-[13px] font-semibold text-ink mb-3">
        I have money to place
      </p>

      <p className="text-[11px] font-medium text-muted uppercase tracking-[0.09em] mb-2.5">
        Save &amp; earn
      </p>
      <div className="flex flex-wrap gap-2.5 mb-4">
        {SAVE_AND_EARN.map(({ id, Icon, label, route, bg, color }) => (
          <Tile key={id} Icon={Icon} label={label} route={route} bg={bg} color={color} onClick={navigate} />
        ))}
      </div>

      <p className="text-[11px] font-medium text-muted uppercase tracking-[0.09em] mb-2.5">
        Invest
      </p>
      <div className="flex flex-wrap gap-2.5">
        {INVEST.map(({ id, Icon, label, route, bg, color }) => (
          <Tile key={id} Icon={Icon} label={label} route={route} bg={bg} color={color} onClick={navigate} />
        ))}
      </div>

    </div>
  );
}
