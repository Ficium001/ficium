// =============================================================
// Ficium — ActiveRequestCard
// Rich request card used on Dashboard + Requests page
// =============================================================
import { useNavigate } from "react-router-dom";
import {
  Home, Car, CreditCard, Briefcase, PiggyBank,
  TrendingUp, Banknote, Building2, Clock, CheckCircle2,
  ChevronRight, Zap,
} from "lucide-react";
import type { RequestSummary } from "@/individual/requests/api/requests";

/* ── Product config ── */
const PRODUCT_CONFIG: Record<string, {
  icon:        React.ElementType;
  label:       string;
  gradient:    string;
  accentColor: string;
}> = {
  mortgage:           { icon: Home,       label: "Home Loan",     gradient: "from-amber-700 to-amber-900",   accentColor: "#d97706" },
  personal_loan:      { icon: Building2,  label: "Personal Loan", gradient: "from-sky-600 to-sky-800",       accentColor: "#0284c7" },
  credit_card:        { icon: CreditCard, label: "Credit Card",   gradient: "from-pink-600 to-pink-900",     accentColor: "#db2777" },
  leasing:            { icon: Car,        label: "Vehicle Loan",  gradient: "from-slate-600 to-slate-800",   accentColor: "#475569" },
  business_loan:      { icon: Briefcase,  label: "Business Loan", gradient: "from-violet-600 to-violet-900", accentColor: "#7c3aed" },
  sme_loan:           { icon: Briefcase,  label: "SME Loan",      gradient: "from-violet-600 to-violet-900", accentColor: "#7c3aed" },
  fixed_deposit:      { icon: PiggyBank,  label: "Fixed Deposit", gradient: "from-amber-500 to-orange-700",  accentColor: "#f59e0b" },
  investment_account: { icon: TrendingUp, label: "Investment",    gradient: "from-indigo-800 to-indigo-950", accentColor: "#4f46e5" },
  overdraft:          { icon: Banknote,   label: "Overdraft",     gradient: "from-red-600 to-red-800",       accentColor: "#dc2626" },
};

function getConfig(type: string) {
  return PRODUCT_CONFIG[type] ?? {
    icon: Building2, label: "Request",
    gradient: "from-slate-600 to-slate-800", accentColor: "#64748b",
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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-MU", { day: "numeric", month: "short" });
}

export function ActiveRequestCard({ request, compact = false }: {
  request:  RequestSummary;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const cfg      = getConfig(request.productType);
  const Icon     = cfg.icon;
  const progress = journeyProgress(request);
  const isClosed = request.status !== "open";

  return (
    <div
      onClick={() => navigate(`/requests/${request.id}`)}
      className="bg-white rounded-[20px] border border-ink/[0.06] shadow-sm overflow-hidden cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all group"
    >
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${cfg.gradient} p-4 flex items-start justify-between relative min-h-[90px]`}>
        <div className="w-11 h-11 rounded-xl bg-white/20 grid place-items-center">
          <Icon size={22} className="text-white" />
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className={[
            "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
            isClosed ? "bg-white/20 text-white/70" : "bg-white/25 text-white",
          ].join(" ")}>
            {request.status}
          </span>
          {request.bidCount > 0 && (
            <div className="flex items-center gap-1 bg-emerald-400/30 border border-emerald-300/40 rounded-full px-2 py-0.5">
              <Zap size={9} className="text-emerald-300" />
              <span className="text-[10px] font-bold text-emerald-200">
                {request.bidCount} offer{request.bidCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {request.bestRate !== null && (
          <div className="absolute bottom-3 left-4 bg-black/20 rounded-full px-2.5 py-1">
            <span className="text-[11px] font-bold text-white">
              Best {request.bestRate.toFixed(2)}% APR
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">

        <div>
          <div className="text-[11px] text-muted font-medium mb-0.5">{cfg.label}</div>
          <div className="font-display text-[26px] font-extrabold text-ink leading-none">
            {fmtAmt(request.amount)}
          </div>
          <div className="text-[11px] text-muted mt-1">{timeAgo(request.createdAt)}</div>
        </div>

        {/* Journey progress */}
        {!compact && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Journey</span>
              <span className="text-[10px] font-bold" style={{ color: cfg.accentColor }}>
                {JOURNEY_STEPS[progress]}
              </span>
            </div>
            <div className="relative pb-5">
              <div className="h-1.5 bg-ink/[0.07] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(progress / (JOURNEY_STEPS.length - 1)) * 100}%`, background: cfg.accentColor }}
                />
              </div>
              <div className="absolute -top-[3px] left-0 right-0 flex justify-between px-0">
                {JOURNEY_STEPS.map((_, i) => (
                  <div key={i}
                    className="w-3 h-3 rounded-full border-2 border-white"
                    style={i <= progress ? { background: cfg.accentColor } : { background: "#e2e8f0" }}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                {JOURNEY_STEPS.map((label, i) => (
                  <span key={label}
                    className={["text-[9px] font-semibold text-center", i <= progress ? "text-ink/60" : "text-muted/40"].join(" ")}
                    style={{ width: "25%" }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status banner */}
        {request.bidCount === 0 && !isClosed ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <Clock size={12} className="text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-700 font-medium">Waiting for offers · usually within 24h</span>
          </div>
        ) : request.bidCount > 0 ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
            <span className="text-[11px] text-emerald-700 font-medium">
              {request.bidCount} provider{request.bidCount !== 1 ? "s" : ""} competing for you
            </span>
          </div>
        ) : null}

        {/* CTA */}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/requests/${request.id}`); }}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: cfg.accentColor }}
        >
          {request.bidCount > 0 ? "View offers" : "Track request"}
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
