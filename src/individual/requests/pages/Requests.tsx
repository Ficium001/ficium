// =============================================================
// Ficium — Requests page (/requests)
// Merged from Goals + old Requests. Single source of truth.
// Card grid from Goals. Journey + bids sidebar from old Requests.
// =============================================================
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Target, Building2, FileText, TrendingUp,
  Activity, Brain, ArrowRight, ChevronRight,
  Zap, Bell,
} from "lucide-react";
import { useGoals, goalProgress, type Goal, type GoalType } from "@/individual/dashboard/hooks/useGoals";
import { useMyRequests, useBankReadiness } from "../../dashboard/hooks/useDashboard";
import { BottomNav } from "@/shared/ui";
import { Home, Car, Plane, TrendingUp as TrendUp, GraduationCap, Briefcase, PiggyBank } from "lucide-react";
import { ActiveRequestCard } from "@/individual/requests/components/ActiveRequestCard";

/* ── Goal card styles ── */
const GOAL_STYLE: Record<GoalType, { icon: React.ElementType; imgFrom: string; imgTo: string }> = {
  mortgage:   { icon: Home,          imgFrom: "#c47b2b", imgTo: "#7a4a1e" },
  vehicle:    { icon: Car,           imgFrom: "#4b5563", imgTo: "#1f2937" },
  personal:   { icon: Plane,         imgFrom: "#0ea5e9", imgTo: "#0369a1" },
  investment: { icon: TrendUp,       imgFrom: "#0f0c29", imgTo: "#2A1FE6" },
  education:  { icon: GraduationCap, imgFrom: "#059669", imgTo: "#065f46" },
  business:   { icon: Briefcase,     imgFrom: "#7c3aed", imgTo: "#4c1d95" },
  savings:    { icon: PiggyBank,     imgFrom: "#d97706", imgTo: "#92400e" },
  other:      { icon: Target,        imgFrom: "#6b7280", imgTo: "#374151" },
};

const STATUS_PILL: Record<Goal["status"], string> = {
  "on-track":        "bg-emerald-50 text-emerald-700",
  "needs-attention": "bg-amber-50 text-amber-700",
  "ahead":           "bg-ficium/10 text-ficium",
};
const STATUS_LABEL: Record<Goal["status"], string> = {
  "on-track":        "On track",
  "needs-attention": "Needs attention",
  "ahead":           "Ahead",
};

const MOCK_ACTIVITY = [
  { id: 1, text: "MCB submitted a new offer on your Personal Loan", time: "2 mins ago", dot: "bg-ficium" },
  { id: 2, text: "SBM reviewed your application", time: "1 hour ago", dot: "bg-amber-400" },
  { id: 3, text: "Your request entered bidding stage", time: "Today, 09:14", dot: "bg-emerald-400" },
  { id: 4, text: "ABSA placed a competitive offer", time: "Yesterday", dot: "bg-ficium" },
];

export default function Requests() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: requests = [], isLoading: reqLoading } = useMyRequests();
  const { score: readiness } = useBankReadiness();

  const isLoading     = goalsLoading || reqLoading;
  const openRequests  = requests.filter(r => r.status === "open");
  const totalOffers   = requests.reduce((s, r) => s + r.bidCount, 0);

  const fmt = (n: number) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

  return (
    <div className="min-h-screen bg-cream pb-28 lg:pb-10">

      {/* Gradient header */}
      <div className="absolute top-0 left-0 right-0 h-[480px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.45) 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="flex items-start justify-between pt-10 pb-8 gap-4 flex-wrap">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Your marketplace</div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Requests
            </h1>
            <p className="text-white/50 text-[16px] mt-2 max-w-[460px] leading-relaxed">
              Post your need — providers compete to win your business.
            </p>
          </div>
          <button
            onClick={() => navigate("/requests/new")}
            className="inline-flex items-center gap-2 bg-ficium text-white px-6 py-4 rounded-[22px] text-[15px] font-bold shadow-ficium hover:-translate-y-0.5 transition-transform flex-shrink-0 mt-2"
          >
            <Plus size={18} /> Post a need
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Requests",    value: isLoading ? "—" : String(openRequests.length),  icon: FileText,   color: "text-indigo-300" },
            { label: "Providers Offering", value: isLoading ? "—" : String(totalOffers),          icon: Building2,  color: "text-amber-300"  },
            { label: "Best Rate",          value: "8.2%",                                         icon: TrendingUp, color: "text-emerald-300" },
            { label: "Readiness",          value: `${readiness ?? 72}%`,                          icon: Target,     color: "text-rose-300"   },
          ].map(s => (
            <div key={s.label} className="rounded-[22px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-white/55 font-medium">{s.label}</span>
                <s.icon size={15} className={s.color} />
              </div>
              <div className="font-display text-[40px] font-extrabold text-white leading-none tracking-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* Single unified card grid */}
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="bg-white rounded-[18px] h-56 animate-pulse border border-ink/[0.06]" />)}
              </div>
            ) : (goals.length === 0 && requests.length === 0) ? (
              <div className="bg-white rounded-[28px] border border-ink/[0.06] p-10 text-center shadow-sm">
                <div className="w-16 h-16 rounded-[22px] bg-ficium/10 text-ficium grid place-items-center mx-auto mb-4">
                  <FileText size={28} />
                </div>
                <div className="font-display text-[24px] font-bold mb-2">No requests yet</div>
                <p className="text-[15px] text-muted mb-6 max-w-[300px] mx-auto leading-relaxed">
                  Post your financing need and let providers compete for you.
                </p>
                <button
                  onClick={() => navigate("/requests/new")}
                  className="inline-flex items-center gap-2 bg-ficium text-white px-6 py-3.5 rounded-pill text-[14px] font-bold shadow-ficium"
                >
                  <Plus size={16} /> Post a need
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Goal cards → post a request */}
                {goals.map(g => {
                  const style = GOAL_STYLE[g.type] ?? GOAL_STYLE.other;
                  const Icon  = style.icon;
                  const pct   = goalProgress(g);
                  const typeMap: Record<string, string> = {
                    mortgage: "mortgage", vehicle: "vehicle", personal: "personal",
                    investment: "savings", education: "education", business: "business",
                    savings: "deposit", other: "personal",
                  };
                  return (
                    <div
                      key={g.id}
                      onClick={() => navigate(`/requests/new?type=${typeMap[g.type] ?? "personal"}`)}
                      className="bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all"
                    >
                      <div className="h-[100px] flex items-center justify-center"
                           style={{ background: `linear-gradient(135deg, ${style.imgFrom}, ${style.imgTo})` }}>
                        <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center">
                          <Icon size={24} className="text-white" />
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-1.5">
                        <div className="font-bold text-[13px] text-ink">{g.title}</div>
                        <div className="font-display text-[26px] font-extrabold text-ficium leading-none">
                          {pct}<span className="text-[12px] font-semibold text-muted ml-0.5">%</span>
                        </div>
                        <div className="h-[3px] bg-ink/[0.07] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-ficium" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[11px] text-ink/70 font-semibold">{fmt(g.savedAmount)} / {fmt(g.targetAmount)}</div>
                        <span className={["self-start text-[10px] font-bold px-2 py-0.5 rounded-pill", STATUS_PILL[g.status]].join(" ")}>
                          {STATUS_LABEL[g.status]}
                        </span>
                        <div className="text-[10px] font-bold text-ficium flex items-center gap-1">
                          <Building2 size={10} /> {g.banksReady} providers ready
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/requests/new?type=${typeMap[g.type] ?? "personal"}`); }}
                          className="w-full py-2 rounded-xl text-[12px] font-bold text-white bg-ficium hover:opacity-90 mt-1"
                        >
                          Post a request →
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* DB request cards */}
                {requests.map(r => <ActiveRequestCard key={r.id} request={r} />)}

                {/* Post new */}
                <button
                  onClick={() => navigate("/requests/new")}
                  className="bg-white rounded-[18px] border-2 border-dashed border-ink/[0.12] min-h-[240px] flex flex-col items-center justify-center gap-3 hover:border-ficium/40 hover:bg-ficium/[0.02] transition-all group"
                >
                  <div className="w-11 h-11 rounded-full bg-ficium grid place-items-center shadow-ficium group-hover:scale-110 transition-transform">
                    <Plus size={20} className="text-white" />
                  </div>
                  <span className="text-[12px] font-bold text-ink">Post New Request</span>
                </button>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">

            {/* Activity Feed */}
            <div className="bg-white rounded-[26px] border border-ink/[0.06] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-ficium" />
                  <span className="font-display text-[18px] font-bold">Activity</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex flex-col gap-4">
                {MOCK_ACTIVITY.map(a => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={["w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5", a.dot].join(" ")} />
                    <div>
                      <p className="text-[13px] text-ink/80 leading-snug">{a.text}</p>
                      <p className="text-[12px] text-muted mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Coach */}
            <div className="rounded-[26px] overflow-hidden bg-gradient-to-br from-[#0f0c29] to-[#302b63] p-6 border border-ficium/20">
              <div className="flex items-center gap-2 mb-1">
                <Brain size={15} className="text-white/70" />
                <span className="text-[12px] font-bold text-white/50 uppercase tracking-widest">Ficium AI</span>
              </div>
              <h3 className="font-display text-[20px] font-bold text-white leading-snug mb-3">
                Your profile is strong
              </h3>
              <p className="text-[13px] text-white/60 leading-relaxed mb-5">
                Based on your financial profile, you're likely to receive competitive offers from providers within 24 hours of posting.
              </p>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-2 bg-white/10 rounded-pill overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-pill" style={{ width: `${readiness ?? 72}%` }} />
                </div>
                <span className="text-[13px] font-bold text-white">{readiness ?? 72}%</span>
              </div>
              <Link
                to="/advisor"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-[13px] font-bold px-4 py-3 rounded-xl no-underline"
              >
                Open AI Analysis <ArrowRight size={13} />
              </Link>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-[26px] border border-ink/[0.06] p-5 shadow-sm">
              <div className="font-display text-[16px] font-bold mb-3">Quick actions</div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Update financial profile", to: "/onboarding/dossier", icon: FileText },
                  { label: "Check notifications",      to: "/alerts",             icon: Bell    },
                  { label: "View market rates",        to: "/markets",            icon: Zap     },
                ].map(q => (
                  <Link key={q.label} to={q.to} className="no-underline flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink/[0.04] transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-ficium/10 grid place-items-center flex-shrink-0">
                      <q.icon size={14} className="text-ficium" />
                    </div>
                    <span className="text-[13px] font-semibold text-ink/80">{q.label}</span>
                    <ChevronRight size={13} className="text-muted ml-auto group-hover:text-ink transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
