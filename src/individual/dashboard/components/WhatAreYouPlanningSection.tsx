import { useNavigate, Link } from "react-router-dom";

type IC = { color: string };

/* ── Inline SVG icons ──────────────────────────────── */
const IconHouse       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>);
const IconPerson      = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/></svg>);
const IconCar         = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M18.9 6C18.7 5.4 18.1 5 17.5 5h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8L18.9 6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>);
const IconRenovation  = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M13.7 2.3a1 1 0 0 0-1.4 0L8 6.6 3.7 2.3A1 1 0 0 0 2.3 3.7L6.6 8l-4.3 4.3a1 1 0 0 0 1.4 1.4L8 9.4l4.3 4.3a1 1 0 0 0 1.4-1.4L9.4 8l4.3-4.3a1 1 0 0 0 0-1.4zM19 11h-1V3a1 1 0 0 0-2 0v8h-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1zm-1 8h-2v-6h2v6z"/></svg>);
const IconGradCap     = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M12 3 1 9l4 2.2V16l7 4 7-4v-4.8L23 9 12 3zm6.8 6L12 12.7 5.2 9 12 5.3 18.8 9zM17 14.4l-5 2.9-5-2.9v-2.7l5 2.8 5-2.8v2.7z"/></svg>);
const IconBank        = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zm-5 9h14v2H5v-2zm11-9v7h3v-7h-3zM12 1L2 6v2h20V6L12 1z"/></svg>);
const IconSeedling    = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M12 22a1 1 0 0 1-1-1v-5.06C6.94 15.5 4 12.36 4 8.5V6a1 1 0 0 1 1-1h2.5C9.9 5 12 6.8 12 9.5V11c0-2.7 2.1-4.5 4.5-4.5H19a1 1 0 0 1 1 1v2.5c0 3.86-2.94 7-7 7.44V21a1 1 0 0 1-1 1z"/></svg>);
const IconShares      = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 18.5l4-4 4 4 6-8 3.5 4.5"/><circle cx="19" cy="5" r="2" fill={color} stroke="none"/></svg>);
const IconFunds       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>);
const IconBonds       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill={color}><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>);
const IconStack       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></svg>);

/* ── Financing product definitions ─────────────────────────── */
const FINANCING = [
  { id: "mortgage",   Icon: IconHouse,      label: "Home Loan",       desc: "Compare lowest mortgage rates",  route: "/requests/new?type=mortgage",   bg: "#dbeafe", color: "#1d4ed8" },
  { id: "personal",   Icon: IconPerson,     label: "Personal Loan",   desc: "Quick funds for your needs",     route: "/requests/new?type=personal",   bg: "#fce7f3", color: "#be185d" },
  { id: "vehicle",    Icon: IconCar,        label: "Vehicle Loan",    desc: "Best rates for your dream car",  route: "/requests/new?type=vehicle",    bg: "#fef9c3", color: "#ca8a04" },
  { id: "renovation", Icon: IconRenovation, label: "Renovation Loan", desc: "Finance your home improvements", route: "/requests/new?type=renovation", bg: "#ede9fe", color: "#7c3aed" },
  { id: "education",  Icon: IconGradCap,    label: "Education Loan",  desc: "Invest in your future",          route: "/requests/new?type=education",  bg: "#d1fae5", color: "#059669" },
] as const;

/* ── Save & Earn / Invest card definitions ─────────────────── */
const SAVE_AND_EARN = [
  { id: "deposit", Icon: IconBank,     label: "Fixed Deposit",   desc: "Earn guaranteed returns up to",         rate: "6.25%", rateSub: "p.a.", route: "/requests/new?type=deposit", bg: "#d1fae5", iconBg: "#a7f3d0", color: "#065f46" },
  { id: "savings", Icon: IconSeedling, label: "Savings Account", desc: "High interest savings account up to",   rate: "4.00%", rateSub: "p.a.", route: "/requests/new?type=savings", bg: "#d1fae5", iconBg: "#a7f3d0", color: "#065f46" },
] as const;

const INVEST = [
  { id: "equities", Icon: IconShares, label: "Stocks",              desc: "Invest in top companies",          route: "/requests/new?type=equities", bg: "#e0e7ff", color: "#3730a3" },
  { id: "funds",    Icon: IconFunds,  label: "ETFs",                 desc: "Diversify with low-cost ETFs",     route: "/requests/new?type=funds",    bg: "#dbeafe", color: "#1e40af" },
  { id: "bonds",    Icon: IconBonds,  label: "Bonds",                 desc: "Stable income with bonds",         route: "/requests/new?type=bonds",    bg: "#fef3c7", color: "#92400e" },
  { id: "offshore", Icon: IconStack,  label: "Structured Products",   desc: "Enhanced returns with protection", route: "/requests/new?type=offshore", bg: "#fce7f3", color: "#9d174d" },
] as const;

/* ── Financing tile: icon block + title + description + Compare → ── */
function FinancingTile({
  Icon, label, desc, route, bg, color, onClick,
}: {
  Icon: React.ComponentType<IC>;
  label: string;
  desc: string;
  route: string;
  bg: string;
  color: string;
  onClick: (route: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(route)}
      className="flex flex-col items-start text-left rounded-[18px] p-4 bg-white border border-ink/[0.06] hover:shadow-card hover:-translate-y-0.5 transition-all"
    >
      <div
        className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-3"
        style={{ background: bg }}
      >
        <Icon color={color} />
      </div>
      <div className="text-[13px] font-bold mb-1" style={{ color }}>
        {label}
      </div>
      <div className="text-[11px] text-muted leading-snug mb-2 min-h-[28px]">
        {desc}
      </div>
      <span className="text-[11px] font-bold" style={{ color }}>
        Compare →
      </span>
    </button>
  );
}

/* ── Colored product card: icon + title + desc + rate + Explore → ── */
function ProductCard({
  Icon, label, desc, rate, rateSub, route, bg, iconBg, color, onClick,
}: {
  Icon: React.ComponentType<IC>;
  label: string;
  desc: string;
  rate?: string;
  rateSub?: string;
  route: string;
  bg: string;
  iconBg?: string;
  color: string;
  onClick: (route: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(route)}
      className="flex flex-col items-start text-left rounded-[18px] p-4 h-full hover:-translate-y-0.5 transition-transform"
      style={{ background: bg }}
    >
      {iconBg && (
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
          style={{ background: iconBg }}
        >
          <Icon color={color} />
        </div>
      )}
      <div className="text-[13px] font-bold mb-1" style={{ color }}>
        {label}
      </div>
      <div className="text-[11px] leading-snug mb-2 flex-1" style={{ color, opacity: 0.75 }}>
        {desc}
        {rate && (
          <>
            {" "}
            <span className="text-[15px] font-extrabold font-display">{rate}</span>{" "}
            {rateSub && <span className="text-[10px] font-semibold">{rateSub}</span>}
          </>
        )}
      </div>
      <span className="text-[11px] font-bold" style={{ color }}>
        Explore →
      </span>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">

      {/* ── Providers compete for you ── */}
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display text-[18px] sm:text-[20px] font-bold text-ink leading-tight">
            Providers compete <span className="text-ficium">for you</span>
          </h2>
          <Link to="/requests" className="text-[12px] sm:text-[13px] text-muted font-semibold no-underline hover:text-ink flex-shrink-0 ml-4">
            View all →
          </Link>
        </div>
        <p className="text-[13px] text-muted mb-4">
          Providers review it and send you their best offer.
        </p>

        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">
          Financing
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FINANCING.map(({ id, Icon, label, desc, route, bg, color }) => (
            <FinancingTile key={id} Icon={Icon} label={label} desc={desc} route={route} bg={bg} color={color} onClick={navigate} />
          ))}
        </div>
      </div>

      {/* ── Save & Earn / Invest — two column on desktop, stacked on mobile ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">

        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">
            Save &amp; Earn
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 h-full">
            {SAVE_AND_EARN.map(({ id, Icon, label, desc, rate, rateSub, route, bg, iconBg, color }) => (
              <ProductCard key={id} Icon={Icon} label={label} desc={desc} rate={rate} rateSub={rateSub} route={route} bg={bg} iconBg={iconBg} color={color} onClick={navigate} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">
            Invest
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INVEST.map(({ id, Icon, label, desc, route, bg, color }) => (
              <ProductCard key={id} Icon={Icon} label={label} desc={desc} route={route} bg={bg} color={color} onClick={navigate} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
