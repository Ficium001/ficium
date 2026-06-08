// =============================================================
// Ficium — ActiveRequestCard v2
// Clean card: full gradient header, icon centered, bold body
// Matches the image reference aesthetic
// =============================================================
import { useNavigate } from "react-router-dom";
import {
  Home, Car, CreditCard, Briefcase, PiggyBank,
  TrendingUp, Banknote, Building2, Clock,
  CheckCircle2, ArrowRight, Users,
} from "lucide-react";
import type { RequestSummary } from "@/individual/requests/api/requests";

const PRODUCT_CONFIG: Record<string, {
  icon:        React.ElementType;
  label:       string;
  from:        string;
  to:          string;
  accent:      string;
}> = {
  mortgage:           { icon: Home,       label: "Home Loan",     from: "#c47b2b", to: "#7a4a1e", accent: "#d97706" },
  personal_loan:      { icon: Building2,  label: "Personal Loan", from: "#0ea5e9", to: "#0369a1", accent: "#0284c7" },
  credit_card:        { icon: CreditCard, label: "Credit Card",   from: "#db2777", to: "#9d174d", accent: "#db2777" },
  leasing:            { icon: Car,        label: "Vehicle Loan",  from: "#4b5563", to: "#1f2937", accent: "#475569" },
  business_loan:      { icon: Briefcase,  label: "Business Loan", from: "#7c3aed", to: "#4c1d95", accent: "#7c3aed" },
  sme_loan:           { icon: Briefcase,  label: "SME Loan",      from: "#7c3aed", to: "#4c1d95", accent: "#7c3aed" },
  fixed_deposit:      { icon: PiggyBank,  label: "Fixed Deposit", from: "#d97706", to: "#92400e", accent: "#f59e0b" },
  investment_account: { icon: TrendingUp, label: "Investment",    from: "#1e1b4b", to: "#2A1FE6", accent: "#4f46e5" },
  overdraft:          { icon: Banknote,   label: "Overdraft",     from: "#dc2626", to: "#991b1b", accent: "#dc2626" },
};

function getConfig(type: string) {
  return PRODUCT_CONFIG[type] ?? {
    icon: Building2, label: "Request",
    from: "#6b7280", to: "#374151", accent: "#64748b",
  };
}

const JOURNEY_STEPS = ["Submitted", "Under Review", "Bidding", "Offer Ready"];

function journeyProgress(r: RequestSummary) {
  if (r.status === "accepted") return 3;
  if (r.bidCount > 0)          return 2;
  if (r.status === "open")     return 1;
  return 0;
}

function fmtAmt(n: number) {
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `Rs ${(n / 1_000).toFixed(0)}k`;
  return `Rs ${n}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-MU", { day: "numeric", month: "short" });
}

export function ActiveRequestCard({ request }: { request: RequestSummary }) {
  const navigate = useNavigate();
  const cfg      = getConfig(request.productType);
  const Icon     = cfg.icon;
  const progress = journeyProgress(request);
  const isClosed = request.status !== "open";
  const pct      = Math.round((progress / (JOURNEY_STEPS.length - 1)) * 100);

  return (
    <div
      onClick={() => navigate(`/requests/${request.id}`)}
      className="bg-white rounded-[20px] border border-ink/[0.06] shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
    >
      {/* Full-width gradient header */}
      <div
        className="relative flex flex-col items-center justify-center py-7 px-4"
        style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}
      >
        {/* Status pill top-right */}
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-white/25 text-white">
          {request.status}
        </span>

        {/* Centered icon */}
        <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center mb-2">
          <Icon size={28} className="text-white" />
        </div>

        {/* Best rate */}
        {request.bestRate !== null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/20 rounded-full px-3 py-1">
            <span className="text-[11px] font-bold text-white whitespace-nowrap">
              Best {request.bestRate.toFixed(2)}% APR
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">

        {/* Label + amount */}
        <div>
          <p className="text-[11px] text-muted font-medium mb-0.5">{cfg.label}</p>
          <p className="font-display text-[28px] font-extrabold text-ink leading-none tracking-tight">
            {fmtAmt(request.amount)}
          </p>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <Clock size={10} /> {timeAgo(request.createdAt)}
          </p>
        </div>

        {/* Journey progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Journey</span>
            <span className="text-[10px] font-bold" style={{ color: cfg.accent }}>
              {JOURNEY_STEPS[progress]}
            </span>
          </div>

          {/* Bar */}
          <div className="relative mb-4">
            <div className="h-1.5 bg-ink/[0.08] rounded-full">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: cfg.accent }}
              />
            </div>
            {/* Dots */}
            <div className="absolute -top-[3px] left-0 right-0 flex justify-between">
              {JOURNEY_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: i <= progress ? cfg.accent : "#e2e8f0" }}
                />
              ))}
            </div>
            {/* Labels */}
            <div className="absolute -bottom-4 left-0 right-0 flex justify-between">
              {JOURNEY_STEPS.map((label, i) => (
                <span
                  key={label}
                  className={["text-[9px] font-semibold", i <= progress ? "text-ink/60" : "text-muted/40"].join(" ")}
                  style={{ width: "25%", textAlign: i === 0 ? "left" : i === JOURNEY_STEPS.length - 1 ? "right" : "center" }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Status banner */}
        {!isClosed && request.bidCount === 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <Clock size={13} className="text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-700 font-medium">Waiting for offers · usually within 24h</span>
          </div>
        )}
        {request.bidCount > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
            <span className="text-[11px] text-emerald-700 font-medium">
              {request.bidCount} provider{request.bidCount !== 1 ? "s" : ""} competing for you
            </span>
          </div>
        )}

        {/* Provider count */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: cfg.accent }}>
          <Users size={12} />
          {request.bidCount > 0
            ? `${request.bidCount} providers offering`
            : "0 providers yet"}
        </div>

        {/* Dual CTAs */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={e => { e.stopPropagation(); navigate(`/requests/new?type=${request.productType.replace("_loan","").replace("_account","").replace("_deposit","deposit")}`); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border-2 transition-all hover:opacity-80"
            style={{ borderColor: cfg.accent, color: cfg.accent }}
          >
            New similar →
          </button>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/requests/${request.id}`); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: cfg.accent }}
          >
            {request.bidCount > 0 ? "View offers" : "Track request"}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
