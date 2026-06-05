// =============================================================
// Ficium — FinancialGoalsSection
// Wired to Supabase via useGoals(). Falls back to seed data.
// Each card CTA routes directly to the correct NewRequest wizard.
// =============================================================
import { useNavigate } from "react-router-dom";
import { useGoals } from "@/individual/dashboard/hooks/useGoals";
import { Home, Car, Plane, TrendingUp, GraduationCap, Briefcase, PiggyBank, Plus, Building2 } from "lucide-react";

// ── Icon + color config per goal type ────────────────────────
const GOAL_STYLE: Record<GoalType, {
  icon:     React.ElementType;
  imgFrom:  string;
  imgTo:    string;
  barColor: string;
  loanLabel: string;
}> = {
  mortgage:   { icon: Home,          imgFrom: "#c47b2b", imgTo: "#7a4a1e", barColor: "#2A1FE6", loanLabel: "Find home loan"     },
  vehicle:    { icon: Car,           imgFrom: "#4b5563", imgTo: "#1f2937", barColor: "#2A1FE6", loanLabel: "Find vehicle loan"   },
  personal:   { icon: Plane,         imgFrom: "#0ea5e9", imgTo: "#0369a1", barColor: "#2A1FE6", loanLabel: "Find travel loan"    },
  investment: { icon: TrendingUp,    imgFrom: "#0f0c29", imgTo: "#2A1FE6", barColor: "#2A1FE6", loanLabel: "Find products"       },
  education:  { icon: GraduationCap, imgFrom: "#059669", imgTo: "#065f46", barColor: "#059669", loanLabel: "Find education loan" },
  business:   { icon: Briefcase,     imgFrom: "#7c3aed", imgTo: "#4c1d95", barColor: "#7c3aed", loanLabel: "Find business loan"  },
  savings:    { icon: PiggyBank,     imgFrom: "#d97706", imgTo: "#92400e", barColor: "#d97706", loanLabel: "Find deposit"        },
  other:      { icon: Plus,          imgFrom: "#6b7280", imgTo: "#374151", barColor: "#6b7280", loanLabel: "Post a request"      },
};

const STATUS_PILL: Record<Goal["status"], string> = {
  "on-track":        "bg-emerald-50 text-emerald-700",
  "needs-attention": "bg-amber-50  text-amber-700",
  "ahead":           "bg-ficium/10 text-ficium",
};
const STATUS_LABEL: Record<Goal["status"], string> = {
  "on-track":        "On track",
  "needs-attention": "Needs attention",
  "ahead":           "Ahead of schedule",
};

// ── Component ─────────────────────────────────────────────────
export function FinancialGoalsSection() {
  const navigate    = useNavigate();
  const { data: goals = [] } = useGoals();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[20px] sm:text-[24px] font-bold text-ink">
          Your Active <span className="text-ficium">Journeys</span>
        </h2>
        <button
          onClick={() => navigate("/goals")}
          className="text-[12px] sm:text-[13px] text-muted font-semibold hover:text-ink transition-colors"
        >
          View all goals →
        </button>
      </div>

      {/* Horizontal scroll mobile / grid desktop */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible">
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onLoan={() => navigate(g.loanRoute)}
            onJourney={() => navigate(`/goals/${g.id}`)}
          />
        ))}

        {/* Add New Goal */}
        <button
          onClick={() => navigate("/goals/new")}
          className="flex-shrink-0 w-[155px] lg:w-auto min-h-[300px] rounded-[18px] border-2 border-dashed border-ink/[0.12] bg-white flex flex-col items-center justify-center gap-3 hover:border-ficium/40 hover:bg-ficium/[0.02] transition-all group"
        >
          <div className="w-11 h-11 rounded-full bg-ficium grid place-items-center shadow-ficium group-hover:scale-110 transition-transform">
            <Plus size={20} className="text-white" />
          </div>
          <div className="text-[12px] sm:text-[13px] font-bold text-ink text-center leading-tight">
            Add<br />New Goal
          </div>
        </button>
      </div>
    </div>
  );
}

// ── GoalCard ──────────────────────────────────────────────────
function GoalCard({ goal, onLoan, onJourney }: {
  goal:      Goal;
  onLoan:    () => void;
  onJourney: () => void;
}) {
  const style   = GOAL_STYLE[goal.type] ?? GOAL_STYLE.other;
  const Icon    = style.icon;
  const pct     = goalProgress(goal);
  const fmtAmt  = (n: number) =>
    `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

  return (
    <div className="flex-shrink-0 w-[170px] sm:w-[200px] lg:w-auto bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden flex flex-col">

      {/* Gradient header */}
      <div
        className="h-[110px] sm:h-[130px] flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${style.imgFrom}, ${style.imgTo})` }}
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 grid place-items-center">
          <Icon size={26} className="text-white" />
        </div>
      </div>

      {/* Body */}
      <div className="px-3 sm:px-4 pt-3 pb-1 flex-1 flex flex-col gap-1">
        <div className="text-[12px] sm:text-[13px] font-bold text-ink">{goal.title}</div>

        <div className="font-display text-[24px] sm:text-[28px] font-extrabold leading-none" style={{ color: "#2A1FE6" }}>
          {pct}<span className="text-[13px] font-semibold text-muted ml-0.5">%</span>
        </div>

        <div className="h-[3px] bg-ink/[0.07] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.barColor }} />
        </div>

        <div className="text-[11px] font-semibold text-ink/80">
          {fmtAmt(goal.savedAmount)} / {fmtAmt(goal.targetAmount)}
        </div>

        {goal.targetDate && (
          <div className="text-[10px] text-muted">
            🎯 {new Date(goal.targetDate).toLocaleDateString("en-MU", { month: "short", year: "numeric" })}
          </div>
        )}

        <span className={["self-start text-[10px] font-bold px-2 py-0.5 rounded-pill mt-0.5", STATUS_PILL[goal.status]].join(" ")}>
          {STATUS_LABEL[goal.status]}
        </span>

        {goal.aiInsight && (
          <p className="text-[11px] text-muted italic leading-snug mt-0.5 mb-1">{goal.aiInsight}</p>
        )}

        <div className="text-[10px] font-bold flex items-center gap-1 mt-0.5" style={{ color: "#2A1FE6" }}>
          <Building2 size={10} /> {goal.banksReady} banks ready
        </div>
      </div>

      {/* Footer CTAs */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 flex flex-col gap-2">
        <button
          onClick={onLoan}
          className="w-full py-2 rounded-xl text-[11px] sm:text-[12px] font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ background: "#2A1FE6" }}
        >
          {style.loanLabel} →
        </button>
        <button
          onClick={onJourney}
          className="text-[11px] font-semibold hover:underline text-left"
          style={{ color: "#2A1FE6" }}
        >
          Continue journey →
        </button>
      </div>
    </div>
  );
}
