import { useNavigate } from "react-router-dom";
import { Home, Car, Plane, TrendingUp, Plus, Building2 } from "lucide-react";

export interface FinancialGoal {
  id:           string;
  icon:         React.ElementType;
  title:        string;
  progress:     number;
  saved:        string;
  target:       string;
  savedLabel:   string;
  banksReady:   number;
  loanLabel:    string;
  loanRoute:    string;
  status:       "on-track" | "needs-attention" | "ahead";
  aiSays:       string;
  imgFrom:      string;  // tailwind from-* for gradient header
  imgVia:       string;  // tailwind via-*
  imgTo:        string;  // tailwind to-*
}

const DEFAULT_GOALS: FinancialGoal[] = [
  {
    id:          "house",
    icon:        Home,
    title:       "Buy a House",
    progress:    80,
    saved:       "Rs 800k",
    target:      "Rs 1M",
    savedLabel:  "Saved",
    banksReady:  5,
    loanLabel:   "Find home loan",
    loanRoute:   "/requests/new?type=mortgage",
    status:      "on-track",
    aiSays:      "You're eligible for better rates.",
    imgFrom:     "#c47b2b",
    imgVia:      "#a86528",
    imgTo:       "#7a4a1e",
  },
  {
    id:          "vehicle",
    icon:        Car,
    title:       "Mercedes A250e",
    progress:    25,
    saved:       "Rs 250k",
    target:      "Rs 1M",
    savedLabel:  "Saved",
    banksReady:  3,
    loanLabel:   "Find vehicle loan",
    loanRoute:   "/requests/new?type=vehicle",
    status:      "needs-attention",
    aiSays:      "Increase deposit by Rs 50k to unlock better offers.",
    imgFrom:     "#4b5563",
    imgVia:      "#374151",
    imgTo:       "#1f2937",
  },
  {
    id:          "europe",
    icon:        Plane,
    title:       "Europe Trip",
    progress:    60,
    saved:       "Rs 108k",
    target:      "Rs 180k",
    savedLabel:  "Saved",
    banksReady:  2,
    loanLabel:   "Find travel loan",
    loanRoute:   "/requests/new?type=personal",
    status:      "on-track",
    aiSays:      "You can reach your goal 2 months earlier.",
    imgFrom:     "#0ea5e9",
    imgVia:      "#0284c7",
    imgTo:       "#0369a1",
  },
  {
    id:          "invest",
    icon:        TrendingUp,
    title:       "Investment Fund",
    progress:    40,
    saved:       "Rs 40k",
    target:      "Rs 100k",
    savedLabel:  "Invested",
    banksReady:  4,
    loanLabel:   "Find products",
    loanRoute:   "/requests/new?type=investment",
    status:      "on-track",
    aiSays:      "Your returns are outperforming similar profiles.",
    imgFrom:     "#0f0c29",
    imgVia:      "#1A14A8",
    imgTo:       "#2A1FE6",
  },
];

const STATUS_PILL: Record<FinancialGoal["status"], string> = {
  "on-track":        "bg-emerald-50 text-emerald-700",
  "needs-attention": "bg-amber-50  text-amber-700",
  "ahead":           "bg-ficium/10 text-ficium",
};
const STATUS_LABEL: Record<FinancialGoal["status"], string> = {
  "on-track":        "On track",
  "needs-attention": "Needs attention",
  "ahead":           "Ahead of schedule",
};

interface Props { goals?: FinancialGoal[]; }

export function FinancialGoalsSection({ goals = DEFAULT_GOALS }: Props) {
  const navigate = useNavigate();
  return (
    <div>
      {/* Header */}
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

      {/* Cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible">
        {goals.map((g) => <GoalCard key={g.id} goal={g} onLoan={() => navigate(g.loanRoute)} />)}

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

function GoalCard({ goal, onLoan }: { goal: FinancialGoal; onLoan: () => void }) {
  const Icon = goal.icon;
  return (
    <div className="flex-shrink-0 w-[170px] sm:w-[200px] lg:w-auto bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden flex flex-col">

      {/* Gradient photo header */}
      <div
        className="h-[110px] sm:h-[130px] flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${goal.imgFrom}, ${goal.imgVia}, ${goal.imgTo})` }}
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 grid place-items-center">
          <Icon size={26} className="text-white" />
        </div>
      </div>

      {/* Body */}
      <div className="px-3 sm:px-4 pt-3 pb-1 flex-1 flex flex-col gap-1">
        <div className="text-[12px] sm:text-[13px] font-bold text-ink">{goal.title}</div>

        {/* % in ficium colour */}
        <div className="font-display text-[24px] sm:text-[28px] font-extrabold leading-none" style={{ color: "#2A1FE6" }}>
          {goal.progress}
          <span className="text-[13px] font-semibold text-muted ml-0.5">%</span>
        </div>

        {/* Progress bar — ficium colour */}
        <div className="h-[3px] bg-ink/[0.07] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${goal.progress}%`, background: "#2A1FE6" }} />
        </div>

        <div className="text-[10px] text-muted">{goal.savedLabel}</div>
        <div className="text-[11px] font-semibold text-ink/80">{goal.saved} / {goal.target}</div>

        {/* Status badge */}
        <span className={["self-start text-[10px] font-bold px-2 py-0.5 rounded-pill mt-0.5", STATUS_PILL[goal.status]].join(" ")}>
          {STATUS_LABEL[goal.status]}
        </span>

        {/* AI says */}
        <div className="mt-1 mb-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-widest mb-0.5">AI says</div>
          <p className="text-[11px] text-ink/70 leading-snug">{goal.aiSays}</p>
        </div>

        {/* Banks tag */}
        <div className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#2A1FE6" }}>
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
          {goal.loanLabel} →
        </button>
        <button className="text-[11px] font-semibold hover:underline" style={{ color: "#2A1FE6" }}>
          Continue journey →
        </button>
      </div>
    </div>
  );
}
