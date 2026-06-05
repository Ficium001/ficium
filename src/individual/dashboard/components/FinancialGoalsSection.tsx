import { useNavigate }  from "react-router-dom";
import {
  Home, Car, Plane, TrendingUp, Plus, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinancialGoal {
  id:          string;
  icon:        React.ElementType;
  title:       string;
  progress:    number;           // 0–100
  saved:       string;           // e.g. "Rs 800k"
  target:      string;           // e.g. "Rs 1M"
  savedLabel:  string;           // e.g. "Deposit saved"
  targetDate:  string;           // e.g. "Dec 2026"
  banksReady:  number;
  color:       string;           // Tailwind text colour token
  bg:          string;           // Tailwind bg colour token  (icon wrapper)
  barColor:    string;           // inline hex for progress bar
  loanLabel:   string;           // CTA text e.g. "Find home loan"
  loanRoute:   string;           // e.g. "/requests/new?type=mortgage"
}

// ── Static seed data (replace with Supabase query when goals table exists) ───

const DEFAULT_GOALS: FinancialGoal[] = [
  {
    id:         "house",
    icon:       Home,
    title:      "Buy a House",
    progress:   80,
    saved:      "Rs 800k",
    target:     "Rs 1M",
    savedLabel: "Deposit saved",
    targetDate: "Dec 2026",
    banksReady: 5,
    color:      "text-ficium",
    bg:         "bg-ficium/10",
    barColor:   "#4338FF",
    loanLabel:  "Find home loan",
    loanRoute:  "/requests/new?type=mortgage",
  },
  {
    id:         "vehicle",
    icon:       Car,
    title:      "Buy a Vehicle",
    progress:   25,
    saved:      "Rs 250k",
    target:     "Rs 1M",
    savedLabel: "Saved",
    targetDate: "Jun 2027",
    banksReady: 3,
    color:      "text-emerald-700",
    bg:         "bg-emerald-50",
    barColor:   "#059669",
    loanLabel:  "Find vehicle loan",
    loanRoute:  "/requests/new?type=vehicle",
  },
  {
    id:         "europe",
    icon:       Plane,
    title:      "Europe Trip",
    progress:   60,
    saved:      "Rs 108k",
    target:     "Rs 180k",
    savedLabel: "Saved",
    targetDate: "Aug 2026",
    banksReady: 2,
    color:      "text-amber-600",
    bg:         "bg-amber-50",
    barColor:   "#d97706",
    loanLabel:  "Find travel loan",
    loanRoute:  "/requests/new?type=personal",
  },
  {
    id:         "invest",
    icon:       TrendingUp,
    title:      "Build Investment",
    progress:   40,
    saved:      "Rs 40k",
    target:     "Rs 100k",
    savedLabel: "Invested",
    targetDate: "Dec 2027",
    banksReady: 4,
    color:      "text-violet-700",
    bg:         "bg-violet-50",
    barColor:   "#7c3aed",
    loanLabel:  "Find products",
    loanRoute:  "/requests/new?type=investment",
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface FinancialGoalsSectionProps {
  goals?: FinancialGoal[];
}

// ── Component ─────────────────────────────────────────────────────────────────
// Horizontal scrollable carousel matching the existing dashboard layout style.
// Each card mirrors the SmartInsightsFeed / FinancialToolsSection glass-card
// aesthetic — white bg, border-ink/[0.06], rounded-[22px].

export function FinancialGoalsSection({ goals = DEFAULT_GOALS }: FinancialGoalsSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">

      {/* Section header — matches SmartInsightsFeed/MarketTile header pattern */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">
            Your Goals
          </div>
          <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
            Your financial <span className="text-ficium">goals</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <span className="text-[11px] font-bold bg-ficium/10 text-ficium px-2.5 py-1 rounded-pill">
            {goals.length} Active
          </span>
          <button
            onClick={() => navigate("/goals")}
            className="text-[13px] text-muted font-semibold flex items-center gap-0.5 hover:text-ink transition-colors"
          >
            View all →
          </button>
        </div>
      </div>

      {/* Scroll rail — mirrors the SmartInsightsFeed horizontal scroll pattern */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">

        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onLoan={() => navigate(goal.loanRoute)} />
        ))}

        {/* Add New Goal card */}
        <button
          onClick={() => navigate("/goals/new")}
          className="flex-shrink-0 w-[120px] rounded-[18px] border border-dashed border-ink/[0.15] bg-ink/[0.02] flex flex-col items-center justify-center gap-2.5 hover:border-ficium/40 hover:bg-ficium/[0.03] transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-ficium grid place-items-center shadow-ficium group-hover:scale-110 transition-transform">
            <Plus size={18} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-ink leading-tight">Add</div>
            <div className="text-[12px] font-bold text-ink leading-tight">New Goal</div>
          </div>
        </button>

      </div>
    </div>
  );
}

// ── GoalCard ──────────────────────────────────────────────────────────────────
// Individual goal card. Self-contained — receives goal data and callbacks only.

interface GoalCardProps {
  goal:   FinancialGoal;
  onLoan: () => void;
}

function GoalCard({ goal, onLoan }: GoalCardProps) {
  const Icon = goal.icon;

  return (
    <div className="flex-shrink-0 w-[200px] sm:w-[215px] bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden flex flex-col">

      {/* Icon header — mirrors MarketTile icon bg pattern */}
      <div className={["h-[88px] flex items-center justify-center", goal.bg].join(" ")}>
        <Icon size={38} className={goal.color} />
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2 flex-1 flex flex-col gap-1.5">

        <div className="text-[13px] font-bold text-ink">{goal.title}</div>

        <div className="font-display text-[26px] font-extrabold text-ink leading-none">
          {goal.progress}
          <span className="text-[14px] font-semibold text-muted ml-0.5">%</span>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-ink/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${goal.progress}%`, background: goal.barColor }}
          />
        </div>

        {/* Saved / target */}
        <div className="text-[10px] text-muted font-medium">{goal.savedLabel}</div>
        <div className="text-[11px] font-semibold text-ink/70">
          {goal.saved} / {goal.target}
        </div>

        {/* Target date */}
        <div className="text-[10px] text-muted flex items-center gap-1">
          <span>🎯</span>
          <span>Target: {goal.targetDate}</span>
        </div>

        {/* Banks ready — key Ficium differentiator */}
        <div className="text-[10px] font-bold text-ficium flex items-center gap-1">
          <Building2 size={10} />
          {goal.banksReady} banks ready to help
        </div>

      </div>

      {/* Footer CTAs */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <button
          onClick={onLoan}
          className="w-full py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: goal.barColor }}
        >
          {goal.loanLabel} →
        </button>
        <button
          className="text-[11px] font-semibold text-ficium hover:underline"
          onClick={() => {}}
        >
          Continue journey →
        </button>
      </div>

    </div>
  );
}
