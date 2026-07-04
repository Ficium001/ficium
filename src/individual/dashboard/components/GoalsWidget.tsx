/**
 * GoalsWidget
 *
 * Shows financial goal progress on the dashboard.
 *
 * Phase 1 (current): derives goals from profile data that already exists
 *   — e.g. if a mortgage request is open → "Buy a house" goal inferred
 *   — networth snapshot → emergency fund progress
 *   — graceful empty state with "Set a goal" CTA linking to requests/new
 *
 * Phase 2 (future): replace derivedGoals with a `user_goals` Supabase table
 * once that module is built. The UI here will need zero changes.
 */

import { useNavigate }       from "react-router-dom";
import { Target, Plus }      from "lucide-react";
import { useMyRequests }     from "@/individual/requests/hooks/useRequests";
import { useSnapshot }       from "@/individual/networth/hooks/useSnapshot";

// ─── types ────────────────────────────────────────────────────

type Goal = {
  id:       string;
  label:    string;
  current:  number;
  target:   number;
  color:    string; // tailwind bg class
  textColor: string;
};

// ─── helpers ──────────────────────────────────────────────────

function fmtAmt(n: number) {
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `Rs ${(n / 1_000).toFixed(0)}k`;
  return `Rs ${n}`;
}

/** Clamp pct between 0-100 */
function pct(current: number, target: number) {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

// ─── GoalRow ──────────────────────────────────────────────────

function GoalRow({ goal }: { goal: Goal }) {
  const p = pct(goal.current, goal.target);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{goal.label}</span>
        <span className="text-[12px] font-bold text-muted">{p}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-ink/6 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${goal.color}`}
          style={{ width: `${p}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{fmtAmt(goal.current)}</span>
        <span>{fmtAmt(goal.target)}</span>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────

export function GoalsWidget() {
  const navigate                      = useNavigate();
  const { data: requests = [] }       = useMyRequests();
  const { data: snapshot }            = useSnapshot();

  // ── Derive goals from existing data ──────────────────────────
  const goals: Goal[] = [];

  // 1. Emergency fund: target = 3× monthly income
  if (snapshot?.monthlyIncome && snapshot.monthlyIncome > 0) {
    const target  = snapshot.monthlyIncome * 3;
    const current = Math.min(
      snapshot.totalAssets > 0 ? snapshot.totalAssets * 0.15 : 0,
      target,
    );
    goals.push({
      id:        "emergency",
      label:     "Emergency fund",
      current:   Math.round(current),
      target:    Math.round(target),
      color:     "bg-emerald-500",
      textColor: "text-emerald-600",
    });
  }

  // 2. Infer "Buy a house" goal from a mortgage request
  const mortgageReq = requests.find(r =>
    r.productType === "mortgage" && r.status === "open",
  );
  if (mortgageReq) {
    // Treat networth assets as saved so far
    const saved = snapshot?.totalAssets ?? 0;
    goals.push({
      id:        "house",
      label:     "Buy a house",
      current:   Math.min(saved, mortgageReq.amount),
      target:    mortgageReq.amount,
      color:     "bg-blue-500",
      textColor: "text-blue-600",
    });
  }

  // 3. Debt reduction goal if liabilities exist
  if (snapshot?.totalLiabilities && snapshot.totalLiabilities > 0) {
    const startDebt = snapshot.totalLiabilities * 1.2;
    const paid      = startDebt - snapshot.totalLiabilities;
    goals.push({
      id:        "debt",
      label:     "Debt reduction",
      current:   Math.max(0, paid),
      target:    startDebt,
      color:     "bg-violet-500",
      textColor: "text-violet-600",
    });
  }

  // 4. Net worth milestone
  if (snapshot?.netWorth && snapshot.netWorth > 0) {
    const milestone = Math.ceil(snapshot.netWorth / 1_000_000) * 1_000_000;
    const prev      = milestone - 1_000_000;
    goals.push({
      id:        "networth",
      label:     `Rs ${(milestone / 1_000_000).toFixed(0)}M net worth`,
      current:   Math.max(0, snapshot.netWorth - prev),
      target:    1_000_000,
      color:     "bg-amber-500",
      textColor: "text-amber-600",
    });
  }

  return (
    <div className="bg-white rounded-[22px] border border-ink/6 shadow-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ficium/10 grid place-items-center">
            <Target size={14} className="text-ficium" />
          </div>
          <h2 className="font-display text-[16px] font-bold text-ink">Goals</h2>
        </div>
        <button
          onClick={() => navigate("/requests")}
          className="text-[12px] font-semibold text-muted hover:text-ink"
        >
          View all
        </button>
      </div>

      {goals.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ink/4 grid place-items-center">
            <Target size={20} className="text-ink/30" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink mb-1">
              Set your first goal
            </p>
            <p className="text-[12px] text-muted leading-snug">
              Post a request to track<br />your financial goals here
            </p>
          </div>
          <button
            onClick={() => navigate("/requests/new")}
            className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-ficium px-4 py-2 rounded-[10px] hover:opacity-90 transition-opacity"
          >
            <Plus size={13} />
            New request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.slice(0, 4).map(g => (
            <GoalRow key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
