// =============================================================
// Ficium — Goal Workspace (/goals/:id)
// Tabbed workspace: Plan | Documents | Insights | Requests
// Plan tab preserves all existing UX. Other tabs are additive.
// =============================================================
import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, Target, FileText, Sparkles, Send, LayoutGrid, BarChart3 } from "lucide-react";
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

const JOURNEY_STEPS = ["Goal set", "Saving", "Financing", "Achieved"];

type TabId = "plan" | "documents" | "insights" | "requests";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "plan",      label: "Plan",      icon: LayoutGrid  },
  { id: "documents", label: "Documents", icon: FileText    },
  { id: "insights",  label: "Insights",  icon: Sparkles    },
  { id: "requests",  label: "Requests",  icon: Send        },
];

// ── Plan Tab (existing UX, untouched) ─────────────────────────
function PlanTab({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const pct  = goalProgress(goal);
  const fmt  = (n: number) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
  const step = pct >= 100 ? 3 : pct >= 50 ? 2 : pct > 0 ? 1 : 0;

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[12px] text-muted font-semibold mb-0.5">Progress</div>
            <div className="font-display text-[40px] font-extrabold text-ficium leading-none">
              {pct}<span className="text-[18px] font-semibold text-muted ml-1">%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-muted font-semibold mb-0.5">Saved</div>
            <div className="text-[16px] font-bold text-ink">{fmt(goal.savedAmount)}</div>
            <div className="text-[12px] text-muted">of {fmt(goal.targetAmount)}</div>
          </div>
        </div>
        <div className="h-3 bg-ink/[0.07] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-ficium transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        {goal.targetDate && (
          <div className="mt-2 text-[12px] text-muted">
            🎯 Target: {new Date(goal.targetDate).toLocaleDateString("en-MU", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Journey steps */}
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-4">Your journey</div>
        <div className="relative flex items-start justify-between">
          <div className="absolute top-5 left-5 right-5 h-1 bg-ink/[0.08] rounded-pill" />
          <div className="absolute top-5 left-5 h-1 bg-ficium rounded-pill transition-all duration-700"
               style={{ width: `${(step / (JOURNEY_STEPS.length - 1)) * 85}%` }} />
          {JOURNEY_STEPS.map((label, i) => {
            const done = i <= step;
            return (
              <div key={label} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                <div className={["w-10 h-10 rounded-full grid place-items-center text-[12px] font-bold border-2 transition-all",
                  done ? "bg-ficium border-ficium text-white" : "bg-white border-ink/20 text-muted"].join(" ")}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={["text-[11px] font-semibold text-center leading-tight", done ? "text-ficium" : "text-muted"].join(" ")}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI insight */}
      {goal.aiInsight && (
        <div className="bg-ficium/[0.04] border border-ficium/[0.12] rounded-[18px] px-5 py-4 flex items-start gap-3">
          <span className="text-[20px]">✨</span>
          <p className="text-[13px] text-ink/80 leading-relaxed font-medium">{goal.aiInsight}</p>
        </div>
      )}

      {/* Banks ready */}
      {goal.banksReady > 0 && (
        <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ficium/10 grid place-items-center flex-shrink-0">
            <Building2 size={22} className="text-ficium" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[14px] text-ink">{goal.banksReady} banks ready to help</div>
            <div className="text-[12px] text-muted">Post a request — banks compete for you anonymously.</div>
          </div>
        </div>
      )}

      {/* CTAs */}
      <button
        onClick={() => navigate(goal.loanRoute)}
        className="w-full py-4 rounded-2xl text-[15px] font-bold text-white bg-ficium shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Find financing →
      </button>
      <button
        onClick={() => navigate("/advisor")}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-ficium border-2 border-ficium/20 hover:bg-ficium/[0.04] transition-colors"
      >
        Ask AI Coach for advice
      </button>
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────
function DocumentsTab({ goal: _goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const docs = [
    { label: "Payslips (last 3)", status: "verified" as const },
    { label: "Bank Statements (6 months)", status: "verified" as const },
    { label: "NIC / Passport", status: "verified" as const },
    { label: "Proof of Address", status: "missing" as const },
  ];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Document Vault</div>
          <div className="text-[11px] font-semibold text-amber-600">
            {docs.filter(d => d.status === "missing").length} missing
          </div>
        </div>
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.label} className={[
              "flex items-center justify-between p-3 rounded-xl border",
              doc.status === "verified" ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"
            ].join(" ")}>
              <div className="flex items-center gap-3">
                <FileText size={16} className={doc.status === "verified" ? "text-emerald-600" : "text-amber-500"} />
                <span className="text-[13px] font-medium text-ink">{doc.label}</span>
              </div>
              {doc.status === "verified"
                ? <span className="text-[11px] font-bold text-emerald-600">✓ Verified</span>
                : <button className="text-[11px] font-bold text-amber-600 underline">Upload</button>}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => navigate("/onboarding/dossier")}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-ficium border-2 border-ficium/20 hover:bg-ficium/[0.04] transition-colors"
      >
        Manage full dossier →
      </button>
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────
function InsightsTab() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="bg-ficium/[0.04] border border-ficium/[0.12] rounded-[18px] px-5 py-4 flex items-start gap-3">
        <Sparkles size={18} className="text-ficium mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[12px] font-bold text-ficium uppercase tracking-widest mb-1">AI Coach</div>
          <p className="text-[13px] text-ink/80 leading-relaxed">
            Your debt-to-income ratio is healthy at 38%. You could qualify for a higher amount than targeted — consider reviewing your goal amount. Rates have dropped 0.25% this month, making now a strong window to send your request.
          </p>
        </div>
      </div>
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5 space-y-3">
        <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Market Signals</div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <BarChart3 size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="text-[13px] font-medium text-ink">Mortgage rates dropped 0.25% this month</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Building2 size={16} className="text-blue-600 flex-shrink-0" />
          <span className="text-[13px] font-medium text-ink">MCB currently has the most competitive rates</span>
        </div>
      </div>
      <button
        onClick={() => navigate("/advisor")}
        className="w-full py-4 rounded-2xl text-[15px] font-bold text-white bg-ficium shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Open full AI Coach →
      </button>
    </div>
  );
}

// ── Requests Tab ──────────────────────────────────────────────
function RequestsTab({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      {/* Readiness gate */}
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-3">Readiness</div>
        <div className="flex items-center gap-4 mb-4">
          <div className="font-display text-[40px] font-extrabold text-ficium leading-none">82<span className="text-[18px] text-muted font-semibold">%</span></div>
          <div>
            <div className="font-bold text-[14px] text-emerald-600 mb-0.5">Ready to Send</div>
            <div className="text-[12px] text-muted">Upload proof of address to reach 91%</div>
          </div>
        </div>
        <button
          onClick={() => navigate(goal.loanRoute)}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white bg-ficium shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all"
        >
          📬 Send to Banks →
        </button>
      </div>

      {/* Active offers */}
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Active Offers</div>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-pill">3 bids</span>
        </div>
        <div className="space-y-2">
          {[
            { bank: "MCB Bank", rate: "7.9%", term: "20yr", best: true },
            { bank: "SBM Bank", rate: "8.2%", term: "20yr", best: false },
            { bank: "ABSA Mauritius", rate: "8.5%", term: "15yr", best: false },
          ].map((offer) => (
            <div key={offer.bank} className={[
              "flex items-center justify-between p-3 rounded-xl border",
              offer.best ? "border-emerald-200 bg-emerald-50/60" : "border-ink/[0.06] bg-ink/[0.02]"
            ].join(" ")}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-ink">{offer.bank}</span>
                  {offer.best && <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">BEST</span>}
                </div>
                <div className="text-[11px] text-muted">{offer.term} term</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[20px] font-extrabold text-emerald-600">{offer.rate}</div>
                <div className="text-[10px] text-muted">per annum</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate("/requests")}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-ficium border-2 border-ficium/20 hover:bg-ficium/[0.04] transition-colors"
      >
        View all requests →
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function GoalDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { data: goals = [] } = useGoals();

  // Read initial tab from hash e.g. /goals/123#requests
  const hashTab = (location.hash.replace("#", "") as TabId) || "plan";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(t => t.id === hashTab) ? hashTab : "plan"
  );

  const goal: Goal | undefined = goals.find(g => g.id === id);

  if (!goal) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted mb-4">Goal not found.</p>
        <button onClick={() => navigate("/goals")} className="text-ficium font-semibold">← Back to goals</button>
      </div>
    </div>
  );

  const style = GOAL_STYLE[goal.type] ?? GOAL_STYLE.other;
  const Icon  = style.icon;

  return (
    <div className="min-h-screen bg-cream pb-28">

      {/* Header — unchanged style */}
      <div style={{ background: `linear-gradient(135deg, ${style.imgFrom}, ${style.imgTo})` }}>
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 pt-8 pb-0">
          <button
            onClick={() => navigate("/goals")}
            className="flex items-center gap-1.5 text-[13px] text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft size={15} /> All goals
          </button>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 grid place-items-center flex-shrink-0">
              <Icon size={30} className="text-white" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-white/60 uppercase tracking-widest mb-1">{goal.type}</div>
              <h1 className="font-display text-[24px] sm:text-[30px] font-extrabold text-white leading-tight">{goal.title}</h1>
            </div>
          </div>

          {/* Workspace tabs */}
          <div className="flex border-t border-white/10">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const active  = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                    active
                      ? "text-white border-white"
                      : "text-white/40 border-transparent hover:text-white/70",
                  ].join(" ")}
                >
                  <TabIcon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 pt-5">
        {activeTab === "plan"      && <PlanTab goal={goal} />}
        {activeTab === "documents" && <DocumentsTab goal={goal} />}
        {activeTab === "insights"  && <InsightsTab />}
        {activeTab === "requests"  && <RequestsTab goal={goal} />}
      </div>

      <BottomNav />
    </div>
  );
}
