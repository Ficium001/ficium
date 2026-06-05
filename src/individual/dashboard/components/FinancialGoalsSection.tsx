import { useNavigate } from "react-router-dom";
import {
  Home, Car, Plane, TrendingUp, Plus, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinancialGoal {
  id:          string;
  icon:        React.ElementType;
  title:       string;
  progress:    number;
  saved:       string;
  target:      string;
  savedLabel:  string;
  targetDate:  string;
  banksReady:  number;
  barColor:    string;
  loanLabel:   string;
  loanRoute:   string;
  status:      "on-track" | "needs-attention" | "ahead";
  aiSays:      string;
  // Gradient used as photo stand-in until real user photos are stored
  imgGradient: string;
  imgIconColor: string;
}

// ── Seed data — replace with Supabase goals query when table is ready ─────────

const DEFAULT_GOALS: FinancialGoal[] = [
  {
    id:           "house",
    icon:         Home,
    title:        "Buy a House",
    progress:     80,
    saved:        "Rs 800k",
    target:       "Rs 1M",
    savedLabel:   "Saved",
    targetDate:   "Dec 2026",
    banksReady:   5,
    barColor:     "#4338FF",
    loanLabel:    "Find home loan",
    loanRoute:    "/requests/new?type=mortgage",
    status:       "on-track",
    aiSays:       "You're eligible for better rates.",
    imgGradient:  "from-amber-800 via-amber-600 to-amber-400",
    imgIconColor: "text-white",
  },
  {
    id:           "vehicle",
    icon:         Car,
    title:        "Mercedes A250e",
    progress:     25,
    saved:        "Rs 250k",
    target:       "Rs 1M",
    savedLabel:   "Saved",
    targetDate:   "Jun 2027",
    banksReady:   3,
    barColor:     "#4338FF",
    loanLabel:    "Find vehicle loan",
    loanRoute:    "/requests/new?type=vehicle",
    status:       "needs-attention",
    aiSays:       "Increase deposit by Rs 50k to unlock better offers.",
    imgGradient:  "from-slate-700 via-slate-500 to-slate-400",
    imgIconColor: "text-white",
  },
  {
    id:           "europe",
    icon:         Plane,
    title:        "Europe Trip",
    progress:     60,
    saved:        "Rs 108k",
    target:       "Rs 180k",
    savedLabel:   "Saved",
    targetDate:   "Aug 2026",
    banksReady:   2,
    barColor:     "#4338FF",
    loanLabel:    "Find travel loan",
    loanRoute:    "/requests/new?type=personal",
    status:       "on-track",
    aiSays:       "You can reach your goal 2 months earlier.",
    imgGradient:  "from-sky-700 via-sky-400 to-cyan-300",
    imgIconColor: "text-white",
  },
  {
    id:           "invest",
    icon:         TrendingUp,
    title:        "Investment Fund",
    progress:     40,
    saved:        "Rs 40k",
    target:       "Rs 100k",
    savedLabel:   "Invested",
    targetDate:   "Dec 2027",
    banksReady:   4,
    barColor:     "#4338FF",
    loanLabel:    "Find products",
    loanRoute:    "/requests/new?type=investment",
    status:       "on-track",
    aiSays:       "Your returns are outperforming similar profiles.",
    imgGradient:  "from-[#0f0c29] via-[#1a1040] to-[#302b63]",
    imgIconColor: "text-emerald-400",
  },
];

const STATUS_STYLES = {
  "on-track":        "bg-emerald-50 text-emerald-700",
  "needs-attention": "bg-amber-50 text-amber-700",
  "ahead":           "bg-ficium/10 text-ficium",
} as const;

const STATUS_LABELS = {
  "on-track":        "On track",
  "needs-attention": "Needs attention",
  "ahead":           "Ahead of schedule",
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

interface FinancialGoalsSectionProps {
  goals?: FinancialGoal[];
}

export function FinancialGoalsSection({ goals = DEFAULT_GOALS }: FinancialGoalsSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
            Your Active <span className="text-ficium">Journeys</span>
          </h2>
        </div>
        <button
          onClick={() => navigate("/goals")}
          className="text-[13px] text-muted font-semibold flex items-center gap-0.5 hover:text-ink transition-colors pb-1"
        >
          View all goals →
        </button>
      </div>

      {/* Scroll rail — horizontal on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible">

        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onLoan={() => navigate(goal.loanRoute)} />
        ))}

        {/* Add New Goal */}
        <button
          onClick={() => navigate("/goals/new")}
          className="flex-shrink-0 w-[160px] lg:w-auto min-h-[320px] rounded-[18px] border border-dashed border-ink/[0.15] bg-white flex flex-col items-center justify-center gap-3 hover:border-ficium/40 hover:bg-ficium/[0.02] transition-all group"
        >
          <div className="w-11 h-11 rounded-full bg-ficium grid place-items-center shadow-ficium group-hover:scale-110 transition-transform">
            <Plus size={20} className="text-white" />
          </div>
          <div className="text-[13px] font-bold text-ink text-center leading-tight">
            Add<br />New Goal
          </div>
        </button>

      </div>
    </div>
  );
}

// ── GoalCard ──────────────────────────────────────────────────────────────────

function GoalCard({ goal, onLoan }: { goal: FinancialGoal; onLoan: () => void }) {
  const Icon = goal.icon;

  return (
    <div className="flex-shrink-0 w-[200px] lg:w-auto bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden flex flex-col">

      {/* Photo / gradient header */}
      <div className={["bg-gradient-to-br h-[130px] flex items-center justify-center relative", goal.imgGradient].join(" ")}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center">
          <Icon size={30} className={goal.imgIconColor} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-1 flex-1 flex flex-col gap-1.5">
        <div className="text-[13px] font-bold text-ink">{goal.title}</div>

        <div className="font-display text-[28px] font-extrabold text-ficium leading-none">
          {goal.progress}
          <span className="text-[14px] font-semibold text-muted ml-0.5">%</span>
        </div>

        <div className="h-[3px] bg-ink/[0.07] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${goal.progress}%`, background: goal.barColor }}
          />
        </div>

        <div className="text-[11px] text-muted font-medium">{goal.savedLabel}</div>
        <div className="text-[11px] font-semibold text-ink/80">
          {goal.saved} / {goal.target}
        </div>

        {/* Status badge */}
        <span className={["inline-flex self-start text-[10px] font-bold px-2 py-0.5 rounded-pill mt-0.5", STATUS_STYLES[goal.status]].join(" ")}>
          {STATUS_LABELS[goal.status]}
        </span>

        {/* AI Says */}
        <div className="mt-1">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-0.5">AI says</div>
          <p className="text-[11px] text-ink/70 leading-snug">{goal.aiSays}</p>
        </div>

        {/* Banks ready */}
        <div className="text-[10px] font-bold text-ficium flex items-center gap-1 mt-0.5">
          <Building2 size={10} />
          {goal.banksReady} banks ready
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
        <button
          onClick={onLoan}
          className="w-full py-2 rounded-xl text-[12px] font-bold text-white bg-ficium hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {goal.loanLabel} →
        </button>
        <button className="text-[11px] font-semibold text-ficium hover:underline">
          Continue journey →
        </button>
      </div>

    </div>
  );
}
