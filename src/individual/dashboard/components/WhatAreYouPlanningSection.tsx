import { useNavigate, Link } from "react-router-dom";

type IC = { color: string };

/* ── Inline SVG icons ──────────────────────────────── */
const IconHouse       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>);
const IconPerson      = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/></svg>);
const IconCar         = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M18.9 6C18.7 5.4 18.1 5 17.5 5h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8L18.9 6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>);
const IconRenovation  = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M13.7 2.3a1 1 0 0 0-1.4 0L8 6.6 3.7 2.3A1 1 0 0 0 2.3 3.7L6.6 8l-4.3 4.3a1 1 0 0 0 1.4 1.4L8 9.4l4.3 4.3a1 1 0 0 0 1.4-1.4L9.4 8l4.3-4.3a1 1 0 0 0 0-1.4zM19 11h-1V3a1 1 0 0 0-2 0v8h-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1zm-1 8h-2v-6h2v6z"/></svg>);
const IconGradCap     = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M12 3 1 9l4 2.2V16l7 4 7-4v-4.8L23 9 12 3zm6.8 6L12 12.7 5.2 9 12 5.3 18.8 9zM17 14.4l-5 2.9-5-2.9v-2.7l5 2.8 5-2.8v2.7z"/></svg>);
const IconCreditCard  = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>);
const IconBank        = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zm-5 9h14v2H5v-2zm11-9v7h3v-7h-3zM12 1L2 6v2h20V6L12 1z"/></svg>);
const IconSeedling    = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M12 22a1 1 0 0 1-1-1v-5.06C6.94 15.5 4 12.36 4 8.5V6a1 1 0 0 1 1-1h2.5C9.9 5 12 6.8 12 9.5V11c0-2.7 2.1-4.5 4.5-4.5H19a1 1 0 0 1 1 1v2.5c0 3.86-2.94 7-7 7.44V21a1 1 0 0 1-1 1z"/></svg>);
const IconShares      = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 18.5l4-4 4 4 6-8 3.5 4.5"/><circle cx="19" cy="5" r="2" fill={color} stroke="none"/></svg>);
const IconFunds       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>);
const IconBonds       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={color}><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>);
const IconStack       = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></svg>);
const IconDiamond     = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="2" transform="rotate(45 12 12)"/></svg>);
const IconArrowRight  = ({ color }: IC) => (<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 12h14M13 6l6 6-6 6"/></svg>);

/* ── Shared product-card shape ─────────────────────────────── */
type Badge = { text: string; bg: string; color: string };
type ProductDef = {
  id: string;
  Icon: React.ComponentType<IC>;
  label: string;
  tagline: string;
  statPrefix?: string;
  statValue: string;
  statSuffix?: string;
  bullets: readonly string[];
  cta: string;
  route: string;
  iconBg: string;
  ctaBg: string;
  accent: string;
  badge?: Badge;
};

/* ── Financing product definitions ─────────────────────────── */
const FINANCING: readonly ProductDef[] = [
  { id: "mortgage",   Icon: IconHouse,      label: "Home Loan",       tagline: "Compare lowest mortgage rates",
    statPrefix: "From", statValue: "5.29%", statSuffix: "p.a.",
    bullets: ["Up to Rs 50M", "20+ providers", "Approval in 24 hrs"], cta: "Compare Rates",
    route: "/requests/new?type=mortgage", iconBg: "#dbeafe", ctaBg: "#eff6ff", accent: "#1d4ed8",
    badge: { text: "Most Popular", bg: "#dcfce7", color: "#15803d" } },
  { id: "personal",   Icon: IconPerson,     label: "Personal Loan",   tagline: "Quick funds for your needs",
    statPrefix: "From", statValue: "6.49%", statSuffix: "p.a.",
    bullets: ["Up to Rs 2M", "15+ providers", "Funds in 24 hrs"], cta: "Get Offers",
    route: "/requests/new?type=personal", iconBg: "#fce7f3", ctaBg: "#fdf2f8", accent: "#be185d",
    badge: { text: "Quick Funds", bg: "#fce7f3", color: "#be185d" } },
  { id: "vehicle",    Icon: IconCar,        label: "Vehicle Loan",    tagline: "Best rates for your dream car",
    statPrefix: "From", statValue: "4.99%", statSuffix: "p.a.",
    bullets: ["Up to Rs 5M", "18+ providers", "Quick approval"], cta: "Compare Rates",
    route: "/requests/new?type=vehicle", iconBg: "#fef9c3", ctaBg: "#fefce8", accent: "#ca8a04",
    badge: { text: "Best Rates", bg: "#ffedd5", color: "#c2410c" } },
  { id: "renovation", Icon: IconRenovation, label: "Renovation Loan", tagline: "Finance your home improvements",
    statPrefix: "From", statValue: "6.25%", statSuffix: "p.a.",
    bullets: ["Up to Rs 3M", "10+ providers", "Fast approval"], cta: "Get Offers",
    route: "/requests/new?type=renovation", iconBg: "#ede9fe", ctaBg: "#f5f3ff", accent: "#7c3aed",
    badge: { text: "New", bg: "#ede9fe", color: "#7c3aed" } },
  { id: "education",  Icon: IconGradCap,    label: "Education Loan",  tagline: "Invest in your future",
    statPrefix: "From", statValue: "5.75%", statSuffix: "p.a.",
    bullets: ["Up to Rs 3M", "Grace period options", "Fast approval"], cta: "Compare Rates",
    route: "/requests/new?type=education", iconBg: "#d1fae5", ctaBg: "#ecfdf5", accent: "#059669" },
  { id: "creditcard", Icon: IconCreditCard, label: "Credit Card",     tagline: "Compare cashback & rewards",
    statPrefix: "Up to", statValue: "10%", statSuffix: "cashback",
    bullets: ["25+ cards", "No annual fee options", "Instant approval"], cta: "Find My Card",
    route: "/requests/new?type=credit", iconBg: "#fee2e2", ctaBg: "#fef2f2", accent: "#dc2626",
    badge: { text: "Top Cashback", bg: "#fee2e2", color: "#dc2626" } },
] as const;

/* ── Save & Earn / Invest product definitions ─────────────── */
const SAVE_AND_EARN: readonly ProductDef[] = [
  { id: "deposit", Icon: IconBank,     label: "Fixed Deposit",   tagline: "Guaranteed returns",
    statPrefix: "Up to", statValue: "6.25%", statSuffix: "p.a.",
    bullets: ["Tenure: 3M to 5Y", "20+ banks", "Capital protected"], cta: "View Rates",
    route: "/requests/new?type=deposit", iconBg: "#d1fae5", ctaBg: "#ecfdf5", accent: "#065f46" },
  { id: "savings", Icon: IconSeedling, label: "Savings Account", tagline: "High interest savings",
    statPrefix: "Up to", statValue: "4.00%", statSuffix: "p.a.",
    bullets: ["No minimum balance", "Free debit card", "Instant account opening"], cta: "Explore Accounts",
    route: "/requests/new?type=savings", iconBg: "#d1fae5", ctaBg: "#ecfdf5", accent: "#065f46" },
] as const;

const INVEST: readonly ProductDef[] = [
  { id: "equities", Icon: IconShares, label: "Stocks",             tagline: "Invest in top companies",
    statValue: "Zero commission*",
    bullets: ["2,000+ stocks", "Expert analysis", "Easy investing"], cta: "Start Investing",
    route: "/requests/new?type=equities", iconBg: "#e0e7ff", ctaBg: "#eef2ff", accent: "#3730a3" },
  { id: "funds",    Icon: IconFunds,  label: "ETFs",                tagline: "Diversify with low-cost ETFs",
    statPrefix: "From", statValue: "0.15%", statSuffix: "expense ratio",
    bullets: ["150+ ETFs", "Low fees", "Diversified"], cta: "Explore ETFs",
    route: "/requests/new?type=funds", iconBg: "#dbeafe", ctaBg: "#eff6ff", accent: "#1e40af" },
  { id: "bonds",    Icon: IconBonds,  label: "Bonds",               tagline: "Stable income with bonds",
    statPrefix: "Up to", statValue: "8.50%", statSuffix: "p.a.",
    bullets: ["Government & corporate bonds", "Regular income", "Lower risk"], cta: "Explore Bonds",
    route: "/requests/new?type=bonds", iconBg: "#fef3c7", ctaBg: "#fffbeb", accent: "#92400e" },
  { id: "offshore", Icon: IconStack,  label: "Structured Products", tagline: "Enhanced returns with protection",
    statPrefix: "Up to", statValue: "12.00%", statSuffix: "p.a.",
    bullets: ["Capital protection", "Higher returns", "Diverse options"], cta: "Explore Products",
    route: "/requests/new?type=offshore", iconBg: "#fce7f3", ctaBg: "#fdf2f8", accent: "#9d174d" },
] as const;

/* ── Product card: icon + badge + tagline + stat + CTA ──────── */
function ProductCard({
  Icon, label, tagline, statPrefix, statValue, statSuffix, cta, route, iconBg, accent, badge, onClick,
}: ProductDef & { onClick: (route: string) => void }) {
  return (
    <button
      onClick={() => onClick(route)}
      className="flex flex-col items-start text-left rounded-[18px] border border-ink/6 bg-white p-4 h-full hover:border-ink/12 hover:shadow-card hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between w-full mb-3">
        <div className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ background: iconBg }}>
          <Icon color={accent} />
        </div>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-pill whitespace-nowrap" style={{ background: badge.bg, color: badge.color }}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="text-[13px] font-display font-bold text-ink mb-0.5 leading-snug">{label}</div>
      <div className="text-[11px] text-muted leading-snug mb-3">{tagline}</div>

      <div className="mb-1 mt-auto">
        {statPrefix && <span className="text-[10px] text-muted font-medium">{statPrefix} </span>}
        <span className="text-[16px] font-display font-extrabold" style={{ color: accent }}>{statValue}</span>
        {statSuffix && <span className="text-[9px] text-muted font-semibold"> {statSuffix}</span>}
      </div>

      <div className="flex items-center gap-1 text-[11px] font-bold" style={{ color: accent }}>
        {cta} <IconArrowRight color={accent} />
      </div>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">

      {/* ── Providers compete for you ── */}
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-card p-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display text-[18px] sm:text-[20px] font-bold text-ink leading-tight">
            Providers compete <span className="text-ficium">for you</span>
          </h2>
          <Link to="/requests" className="text-[12px] sm:text-[13px] text-muted font-semibold no-underline hover:text-ink shrink-0 ml-4">
            View all →
          </Link>
        </div>
        <p className="text-[13px] text-muted mb-4">
          Providers review it and send you their best offer.
        </p>

        <p className="text-[11px] font-bold uppercase tracking-widest mb-3 bg-brand bg-clip-text text-transparent">
          Financing
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FINANCING.map(p => (
            <ProductCard key={p.id} {...p} onClick={navigate} />
          ))}
        </div>
      </div>

      {/* ── Save & Earn / Invest — stacked full-width rows so cards
           have room for the badge/stat/checklist/CTA content at
           mobile widths, where 90%+ of traffic lands. ── */}
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-card p-5">

        <div className="mb-5">
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">
            Save &amp; Earn
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SAVE_AND_EARN.map(p => (
              <ProductCard key={p.id} {...p} onClick={navigate} />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">
            Invest
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INVEST.map(p => (
              <ProductCard key={p.id} {...p} onClick={navigate} />
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate("/requests/new?quiz=1")}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left border-2 transition-all hover:shadow-sm"
          style={{ borderColor: "#5b3df0", background: "#f7f5ff" }}
        >
          <div className="w-11 h-11 rounded-full border-2 bg-white grid place-items-center shrink-0" style={{ borderColor: "#5b3df0" }}>
            <IconDiamond color="#5b3df0" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-ink">Not sure what fits you?</div>
            <div className="text-[11px] text-muted leading-snug">
              Answer 3 quick questions and get personalised recommendations across invest &amp; earn options.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
