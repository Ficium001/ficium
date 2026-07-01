/**
 * RecommendedForYou
 *
 * Sidebar widget shown next to Live Offers — surfaces the next-best
 * product for the user to pursue, derived from profile completion,
 * health score and current market rates.
 *
 * Layout mirrors the design reference:
 *   - Section header with "View all →"
 *   - Stacked recommendation rows: icon | title + subtitle | stat | chevron
 */

import { useNavigate }                       from "react-router-dom";
import { Home, Landmark, LineChart, ChevronRight } from "lucide-react";
import { useProfile }                        from "@/individual/dashboard/hooks/useDashboard";

type Recommendation = {
  id:       string;
  icon:     React.ReactNode;
  iconBg:   string;
  title:    string;
  subtitle: string;
  stat:     string;
  statSub:  string;
  statColor: string;
  href:     string;
};

/** Rough eligibility estimate from profile completeness + health score.
 *  This is a lightweight heuristic for surfacing purposes only — the
 *  real number banks quote comes from their own underwriting. */
function estimateEligibility(healthScore: number | null, completionPct: number): number {
  if (healthScore != null) return Math.min(97, Math.max(35, healthScore + 5));
  return Math.min(90, Math.max(30, completionPct));
}

function Row({ r }: { r: Recommendation }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(r.href)}
      className="w-full flex items-center gap-3 p-3 rounded-[16px] bg-ink/[0.02] hover:bg-ink/[0.045] transition-colors text-left"
    >
      <div className={["w-10 h-10 rounded-xl grid place-items-center flex-shrink-0", r.iconBg].join(" ")}>
        {r.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-ink truncate">{r.title}</div>
        <div className="text-[11px] text-muted truncate">{r.subtitle}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={["text-[15px] font-extrabold font-display leading-none", r.statColor].join(" ")}>
          {r.stat}
        </div>
        <div className="text-[10px] text-muted font-medium mt-0.5">{r.statSub}</div>
      </div>
      <ChevronRight size={16} className="text-ink/25 flex-shrink-0" />
    </button>
  );
}

export function RecommendedForYou() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const eligibility = estimateEligibility(
    profile?.healthScore ?? null,
    profile?.completion?.percent ?? 20,
  );

  const recs: Recommendation[] = [
    {
      id: "home",
      icon: <Home size={18} className="text-white" />,
      iconBg: "bg-ficium",
      title: "Home Loan",
      subtitle: eligibility >= 60 ? "You're likely eligible" : "Check your eligibility",
      stat: `${eligibility}%`,
      statSub: "eligibility",
      statColor: "text-ficium",
      href: "/requests/new?type=mortgage",
    },
    {
      id: "deposit",
      icon: <Landmark size={18} className="text-white" />,
      iconBg: "bg-emerald-500",
      title: "Fixed Deposit",
      subtitle: "Earn up to",
      stat: "6.25%",
      statSub: "p.a.",
      statColor: "text-emerald-600",
      href: "/requests/new?type=deposit",
    },
    {
      id: "invest",
      icon: <LineChart size={18} className="text-white" />,
      iconBg: "bg-violet-500",
      title: "Investment Portfolio",
      subtitle: "Start with just",
      stat: "Rs 1,000",
      statSub: "",
      statColor: "text-violet-600",
      href: "/requests/new?type=funds",
    },
  ];

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[16px] sm:text-[18px] font-bold text-ink leading-tight">
          Recommended <span className="text-ficium">for you</span>
        </h2>
        <button
          onClick={() => navigate("/tools")}
          className="text-[12px] font-semibold text-muted hover:text-ink flex-shrink-0 ml-3"
        >
          View all →
        </button>
      </div>
      <div className="space-y-2">
        {recs.map(r => <Row key={r.id} r={r} />)}
      </div>
    </div>
  );
}
