// =============================================================
// Ficium — Goals page (/goals)
// Lists all client goals with progress. Links to /goals/new and
// /goals/:id. Wired to useGoals() → Supabase client_goals table.
// =============================================================
import { useNavigate } from "react-router-dom";
import { Plus, Target, Building2 } from "lucide-react";
import { useGoals, goalProgress, type Goal, type GoalType } from "@/individual/dashboard/hooks/useGoals";
import { BottomNav } from "@/shared/ui";
import { Home, Car, Plane, TrendingUp, GraduationCap, Briefcase, PiggyBank } from "lucide-react";

const GOAL_STYLE: Record<GoalType, { icon: React.ElementType; imgFrom: string; imgTo: string }> = {
  mortgage:   { icon: Home,          imgFrom: "#c47b2b", imgTo: "#7a4a1e" },
  vehicle:    { icon: Car,           imgFrom: "#4b5563", imgTo: "#1f2937" },
  personal:   { icon: Plane,         imgFrom: "#0ea5e9", imgTo: "#0369a1" },
  investment: { icon: TrendingUp,    imgFrom: "#0f0c29", imgTo: "#2A1FE6" },
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

export default function Goals() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading } = useGoals();

  return (
    <div className="min-h-screen bg-cream pb-28">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-8 flex items-end justify-between">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Your journeys</div>
            <h1 className="font-display text-[36px] sm:text-[48px] font-extrabold text-white leading-tight">
              Financial Goals
            </h1>
          </div>
          <button
            onClick={() => navigate("/goals/new")}
            className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-[18px] text-[14px] font-bold shadow-ficium hover:-translate-y-0.5 transition-transform"
          >
            <Plus size={16} /> New Goal
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-[18px] h-64 animate-pulse border border-ink/[0.06]" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white rounded-[22px] border border-ink/[0.06] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-ficium/10 grid place-items-center mx-auto mb-4">
              <Target size={28} className="text-ficium" />
            </div>
            <h2 className="font-display text-[22px] font-bold text-ink mb-2">No goals yet</h2>
            <p className="text-muted text-[14px] mb-6 max-w-[280px] mx-auto">
              Set a financial goal and let Ficium AI guide you towards it.
            </p>
            <button
              onClick={() => navigate("/goals/new")}
              className="inline-flex items-center gap-2 bg-ficium text-white px-6 py-3 rounded-pill text-[14px] font-bold shadow-ficium"
            >
              <Plus size={16} /> Create first goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map((g) => {
              const style = GOAL_STYLE[g.type] ?? GOAL_STYLE.other;
              const Icon  = style.icon;
              const pct   = goalProgress(g);
              const fmt   = (n: number) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

              return (
                <div
                  key={g.id}
                  onClick={() => navigate(`/goals/${g.id}`)}
                  className="bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-[120px] flex items-center justify-center"
                       style={{ background: `linear-gradient(135deg, ${style.imgFrom}, ${style.imgTo})` }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center">
                      <Icon size={28} className="text-white" />
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="font-bold text-[14px] text-ink">{g.title}</div>
                    <div className="font-display text-[28px] font-extrabold text-ficium leading-none">
                      {pct}<span className="text-[13px] font-semibold text-muted ml-0.5">%</span>
                    </div>
                    <div className="h-[3px] bg-ink/[0.07] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-ficium" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[11px] text-ink/70 font-semibold">{fmt(g.savedAmount)} / {fmt(g.targetAmount)}</div>
                    <span className={["self-start text-[10px] font-bold px-2 py-0.5 rounded-pill", STATUS_PILL[g.status]].join(" ")}>
                      {STATUS_LABEL[g.status]}
                    </span>
                    {g.aiInsight && <p className="text-[11px] text-muted italic">{g.aiInsight}</p>}
                    <div className="text-[10px] font-bold text-ficium flex items-center gap-1">
                      <Building2 size={10} /> {g.banksReady} banks ready
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(g.loanRoute); }}
                      className="w-full py-2 rounded-xl text-[12px] font-bold text-white bg-ficium hover:opacity-90 mt-1"
                    >
                      Find financing →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add card */}
            <button
              onClick={() => navigate("/goals/new")}
              className="bg-white rounded-[18px] border-2 border-dashed border-ink/[0.12] min-h-[280px] flex flex-col items-center justify-center gap-3 hover:border-ficium/40 hover:bg-ficium/[0.02] transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-ficium grid place-items-center shadow-ficium group-hover:scale-110 transition-transform">
                <Plus size={20} className="text-white" />
              </div>
              <span className="text-[13px] font-bold text-ink">Add New Goal</span>
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
