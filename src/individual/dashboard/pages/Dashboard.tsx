import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Activity, ShieldAlert, Sparkles,
  BookOpen, ChevronRight, TrendingUp, Zap, Bell, Eye, EyeOff,
  HandCoins, CreditCard, PiggyBank, LineChart,
  FileText, ArrowRight, Brain, Calculator, RefreshCw,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../../features/auth/context/AuthContext";
import {
  useProfile, useMyRequests, useNextActions,
  useBankReadiness,
} from "../hooks/useDashboard";
import type { NextAction } from "../api/profile";
import { Card, BottomNav } from "../../../shared/ui";

const SPARK_HEALTH = [30, 35, 32, 40, 38, 44, 46];
const SPARK_NETWORTH = [20, 22, 21, 24, 25, 27, 28];
const SPARK_REQUESTS = [0, 0, 0, 1, 1, 1, 1];

/* ── Static AI insights (replace with live API call in production) ── */
const AI_INSIGHTS = [
  { icon: TrendingUp, color: "#16a34a", bg: "rgba(22,163,74,0.12)", text: "Your debt ratio improved 8% this month", type: "positive" },
  { icon: CheckCircle2, color: "#4f46e5", bg: "rgba(79,70,229,0.12)", text: "Your liquidity is above average for your income bracket", type: "info" },
  { icon: AlertTriangle, color: "#d97706", bg: "rgba(217,119,6,0.12)", text: "You may be overpaying on your current loan — compare rates now", type: "warning" },
];

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [loanAmount, setLoanAmount] = useState(500000);
  const [loanTerm, setLoanTerm] = useState(36);
  const [loanRate, setLoanRate] = useState(8.5);
  const [insightIdx, setInsightIdx] = useState(0);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: requests = [], isLoading: requestsLoading } = useMyRequests();
  const { actions } = useNextActions();
  const { score: bankReadiness } = useBankReadiness();

  const loading = profileLoading || requestsLoading;
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const greeting = getGreeting();
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? "?";
  const activeRequests = requests.filter((r) => r.status === "open").length;
  const totalNewBids = requests.reduce((s, r) => s + r.bidCount, 0);
  const kycVerified = profile?.kycStatus === "verified";
  const hasDossier = !!profile?.hasDossier;
  const readyToRequest = kycVerified && hasDossier;
  const netWorth = profile?.totalNetWorth ?? 0;

  const flip = (id: string) => setFlipped((p) => ({ ...p, [id]: !p[id] }));

  const healthStatus = profile?.healthScore == null ? { label: "—", color: "#888" }
    : profile.healthScore >= 70 ? { label: "Good", color: "#16a34a" }
    : profile.healthScore >= 50 ? { label: "Fair", color: "#d97706" }
    : { label: "Low", color: "#dc2626" };

  /* Loan simulator calc */
  const monthlyRate = loanRate / 100 / 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / (Math.pow(1 + monthlyRate, loanTerm) - 1);
  const totalPayment = monthlyPayment * loanTerm;
  const totalInterest = totalPayment - loanAmount;

  /* Cycle through insights */
  useEffect(() => {
    const t = setInterval(() => setInsightIdx((i) => (i + 1) % AI_INSIGHTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen pb-28 relative">

      {/* ── GRADIENT BACKGROUND ── */}
      <div className="absolute top-0 left-0 right-0 h-[540px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 30%, rgba(79,70,229,0.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 60%, rgba(201,168,76,0.25) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.2) 0%, transparent 50%)"
        }} />
        <div className="absolute top-20 -left-16 w-64 h-64 rounded-full bg-ficium/15 blur-[80px] animate-pulse" />
        <div className="absolute top-40 -right-20 w-80 h-80 rounded-full bg-amber-400/10 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-cream to-transparent" />
      </div>

      {/* ── FULL-WIDTH DESKTOP WRAPPER ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/15 text-white grid place-items-center font-bold text-xl backdrop-blur-sm border border-white/10">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-white/50 font-medium">{greeting},</div>
              <div className="text-[20px] font-bold text-white truncate leading-tight">
                {profile?.firstName ?? profile?.fullName ?? "there"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/alerts" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 grid place-items-center text-white/80 hover:bg-white/15 transition-colors relative no-underline">
              <Bell size={16} />
              {totalNewBids > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">{totalNewBids}</span>
              )}
            </Link>
            <button onClick={handleSignOut} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 grid place-items-center text-white/80 hover:bg-white/15 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* ── BANNERS ── */}
        {profile && !kycVerified && (
          <div className="flex items-start gap-3 px-4 py-3.5 mb-4 bg-amber-500/15 backdrop-blur-sm border border-amber-400/25 rounded-2xl">
            <ShieldAlert size={18} className="text-amber-300 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-white">Finish verifying your identity</div>
              <div className="text-[13px] text-white/50 mt-0.5">Banks can't bid until KYC is complete.</div>
            </div>
            <Link to="/onboarding/kyc" className="text-[13px] font-bold text-amber-300 no-underline flex-shrink-0 pt-0.5">Resume →</Link>
          </div>
        )}
        {profile && kycVerified && !hasDossier && (
          <div className="flex items-start gap-3 px-4 py-3.5 mb-4 bg-ficium/15 backdrop-blur-sm border border-ficium/25 rounded-2xl">
            <BookOpen size={18} className="text-indigo-300 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-white">Complete your financial profile</div>
              <div className="text-[13px] text-white/50 mt-0.5">Banks need this to bid accurately.</div>
            </div>
            <Link to="/onboarding/dossier" className="text-[13px] font-bold text-indigo-300 no-underline flex-shrink-0 pt-0.5">Start →</Link>
          </div>
        )}

        {/* ── DESKTOP: two-column layout for hero + coach ── */}
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-5">
          <div>
            {/* ── NET WORTH HERO ── */}
            <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden bg-white/[0.08] backdrop-blur-xl border border-white/[0.12]">
              <div className="absolute -right-10 -top-14 w-48 h-48 rounded-full bg-ficium/30 blur-[50px] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-white/60 font-semibold tracking-wide">Total net worth</span>
                    <span className="text-[11px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-pill">MUR</span>
                  </div>
                  <button onClick={() => setHidden((h) => !h)} className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 transition-colors">
                    {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-white/40 text-xl font-semibold">Rs</span>
                  {hidden ? (
                    <span className="text-white/50 text-5xl font-extrabold tracking-wide">•• •• ••</span>
                  ) : (
                    <span className="text-white text-5xl font-extrabold tracking-tight">{formatAmount(netWorth)}</span>
                  )}
                </div>
                {!hidden && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 px-2.5 py-1 rounded-pill text-[12px] font-bold">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 text-emerald-900 grid place-items-center text-[8px] font-black">↑</span>
                      +1.7%
                    </span>
                    <span className="text-[12px] text-white/40 font-medium">this month</span>
                  </div>
                )}
              </div>
              <div className="absolute right-4 bottom-3 w-28 h-9 opacity-60">
                <MiniSparkline points={SPARK_NETWORTH} color="#9CE5C0" />
              </div>
            </div>

            {/* ── FLIP CARDS ── */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {/* Health */}
              <div className="cursor-pointer" onClick={() => flip("health")} style={{ perspective: "800px" }}>
                <div className={["relative transition-transform duration-500", flipped.health ? "[transform:rotateY(180deg)]" : ""].join(" ")} style={{ transformStyle: "preserve-3d", minHeight: "165px" }}>
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col [backface-visibility:hidden]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-red-500/20 grid place-items-center">
                        <Activity size={13} className="text-red-400" />
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-pill" style={{ background: `${healthStatus.color}20`, color: healthStatus.color }}>
                        <div className="w-1 h-1 rounded-full" style={{ background: healthStatus.color }} />
                        {healthStatus.label}
                      </div>
                    </div>
                    <div className="font-display text-[32px] font-extrabold text-white leading-none">
                      {loading ? "—" : profile?.healthScore ?? "—"}
                      <span className="text-[13px] font-semibold text-white/40 ml-0.5">/100</span>
                    </div>
                    <div className="text-[11px] text-white/50 font-semibold mt-1">Financial Health</div>
                    <div className="mt-auto -mx-3.5 -mb-3.5">
                      <MiniSparkline points={SPARK_HEALTH} color="#dc2626" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col justify-center gap-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div><div className="text-[15px] font-extrabold text-red-400">↓ 3 pts</div><div className="text-[9px] text-white/40 font-semibold">vs last month</div></div>
                    <div className="h-px bg-white/10" />
                    <div><div className="text-[15px] font-extrabold text-white">2 flags</div><div className="text-[9px] text-white/40 font-semibold">need action</div></div>
                  </div>
                </div>
              </div>

              {/* Bank Readiness */}
              <div className="cursor-pointer" onClick={() => flip("nw")} style={{ perspective: "800px" }}>
                <div className={["relative transition-transform duration-500", flipped.nw ? "[transform:rotateY(180deg)]" : ""].join(" ")} style={{ transformStyle: "preserve-3d", minHeight: "165px" }}>
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col [backface-visibility:hidden]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-ficium/20 grid place-items-center">
                        <Zap size={13} className="text-indigo-300" />
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-pill bg-emerald-400/20 text-emerald-300">
                        <div className="w-1 h-1 rounded-full bg-emerald-400" />Strong
                      </div>
                    </div>
                    <div className="font-display text-[32px] font-extrabold text-white leading-none">
                      {loading ? "—" : bankReadiness ?? "—"}
                      <span className="text-[13px] font-semibold text-white/40 ml-0.5">%</span>
                    </div>
                    <div className="text-[11px] text-white/50 font-semibold mt-1">Readiness</div>
                    <div className="mt-auto -mx-3.5 -mb-3.5">
                      <MiniSparkline points={SPARK_NETWORTH} color="#4f46e5" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col justify-center gap-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div><div className="text-[15px] font-extrabold text-emerald-300">↑ 5 pts</div><div className="text-[9px] text-white/40 font-semibold">vs last month</div></div>
                    <div className="h-px bg-white/10" />
                    <div><div className="text-[15px] font-extrabold text-white">Top 20%</div><div className="text-[9px] text-white/40 font-semibold">of applicants</div></div>
                  </div>
                </div>
              </div>

              {/* Requests */}
              <div className="cursor-pointer" onClick={() => flip("req")} style={{ perspective: "800px" }}>
                <div className={["relative transition-transform duration-500", flipped.req ? "[transform:rotateY(180deg)]" : ""].join(" ")} style={{ transformStyle: "preserve-3d", minHeight: "165px" }}>
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col [backface-visibility:hidden]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-400/20 grid place-items-center">
                        <FileText size={13} className="text-emerald-300" />
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-pill bg-ficium/20 text-indigo-300">
                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                        {activeRequests > 0 ? "Open" : "None"}
                      </div>
                    </div>
                    <div className="font-display text-[32px] font-extrabold text-white leading-none">
                      {loading ? "—" : activeRequests}
                      <span className="text-[13px] font-semibold text-white/40 ml-1">active</span>
                    </div>
                    <div className="text-[11px] text-white/50 font-semibold mt-1">Requests</div>
                    <div className="mt-auto -mx-3.5 -mb-3.5">
                      <MiniSparkline points={SPARK_REQUESTS} color="#16a47a" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col justify-center gap-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div><div className="text-[15px] font-extrabold text-white">{totalNewBids} bids</div><div className="text-[9px] text-white/40 font-semibold">awaiting review</div></div>
                    <div className="h-px bg-white/10" />
                    <div><div className="text-[15px] font-extrabold text-amber-300">~2 days</div><div className="text-[9px] text-white/40 font-semibold">avg. response</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── AI FINANCIAL COACH (desktop: right column, mobile: below flip cards) ── */}
          <div className="mb-5 lg:mb-0 lg:self-start lg:sticky lg:top-6">
            <AIFinancialCoach />
          </div>
        </div>

        {/* ═══════ CREAM ZONE ═══════ */}

        {/* ── SMART INSIGHTS FEED ── */}
        <SmartInsightsFeed insights={AI_INSIGHTS} activeIdx={insightIdx} onNext={() => setInsightIdx((i) => (i + 1) % AI_INSIGHTS.length)} />

        {/* ── I NEED SECTION ── */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">Quick access</div>
            <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">What do you <span className="text-ficium">need today?</span></h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/requests/new" className="no-underline group">
              <div className="bg-white rounded-2xl border border-ink/[0.06] p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-ficium/10 grid place-items-center mb-3">
                  <HandCoins size={20} className="text-ficium" />
                </div>
                <div className="text-[13px] text-muted font-medium mb-1">I need a</div>
                <div className="font-display text-[18px] font-bold text-ink leading-tight">Credit facility</div>
                <div className="flex items-center gap-1 mt-3 text-[12px] text-ficium font-semibold">
                  Get offers <ArrowRight size={12} />
                </div>
              </div>
            </Link>
            <Link to="/requests/new" className="no-underline group">
              <div className="bg-white rounded-2xl border border-ink/[0.06] p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center mb-3">
                  <TrendingUp size={20} className="text-amber-600" />
                </div>
                <div className="text-[13px] text-muted font-medium mb-1">I need an</div>
                <div className="font-display text-[18px] font-bold text-ink leading-tight">Investment</div>
                <div className="flex items-center gap-1 mt-3 text-[12px] text-amber-600 font-semibold">
                  Get offers <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── BANKS COMPETE FOR YOU ── */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">Marketplace</div>
              <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">Banks compete <span className="text-ficium">for you</span></h2>
            </div>
            <Link to="/requests" className="text-[13px] text-muted font-semibold no-underline flex items-center gap-0.5 hover:text-ink transition-colors pb-1">
              All <ChevronRight size={13} />
            </Link>
          </div>
          {/* ── Desktop: 4-col grid; Mobile: 2-col ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <MarketTile
              icon={<HandCoins size={17} />}
              label="Personal"
              title="Loans that compete for you"
              metric="Best rate"
              metricValue="8.2%"
              bg="bg-ficium"
              href="/requests/new"
            />
            {/* ── CHANGED: SME (ink) → Credit Card Offer ── */}
            <MarketTile
              icon={<CreditCard size={17} />}
              label="Credit Card"
              title="Card offers tailored to you"
              metric="Top cashback"
              metricValue="3.5%"
              bg="bg-violet-600"
              href="/requests/new"
            />
            <MarketTile
              icon={<PiggyBank size={17} />}
              label="Deposits"
              title="Deposits with real yield"
              metric="Top yield"
              metricValue="5.4%"
              bg="bg-amber-400"
              dark
              href="/requests/new"
            />
            <MarketTile
              icon={<LineChart size={17} />}
              label="Wealth"
              title="Investments that find you"
              metric="Fee saving"
              metricValue="0.4%"
              bg="bg-emerald-300"
              dark
              href="/requests/new"
            />
          </div>
        </div>

        {/* ── LOAN SIMULATOR ── */}
        <LoanSimulator
          loanAmount={loanAmount} setLoanAmount={setLoanAmount}
          loanTerm={loanTerm} setLoanTerm={setLoanTerm}
          loanRate={loanRate} setLoanRate={setLoanRate}
          monthlyPayment={monthlyPayment}
          totalInterest={totalInterest}
          totalPayment={totalPayment}
        />

        {/* ── NEXT ACTIONS ── */}
        {actions.length > 0 && <NextActions actions={actions} />}
      </div>

      {/* ── FAB ── */}
      {readyToRequest && (
        <Link to="/requests/new" className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline">
          <Plus size={18} /> New Request
        </Link>
      )}

      <BottomNav />
    </div>
  );
}

/* ============================================================
   SMART INSIGHTS FEED
   ============================================================ */

function SmartInsightsFeed({ insights, activeIdx, onNext }: {
  insights: typeof AI_INSIGHTS;
  activeIdx: number;
  onNext: () => void;
}) {
  return (
      <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={15} className="text-ficium" />
            <span className="text-[12px] font-bold text-ficium uppercase tracking-widest">Smart Insights</span>
          </div>
          <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">What's happening <span className="text-ficium">with your money</span></h2>
        </div>
        <button onClick={onNext} className="w-9 h-9 rounded-full bg-ink/[0.06] grid place-items-center hover:bg-ink/10 transition-colors flex-shrink-0">
          <RefreshCw size={14} className="text-muted" />
        </button>
      </div>

      {/* Insight cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 lg:overflow-visible lg:grid lg:grid-cols-3 scrollbar-hide">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          const isActive = i === activeIdx;
          return (
            <div
              key={i}
              className={[
                "flex-shrink-0 w-[75vw] sm:w-[300px] lg:w-auto rounded-2xl border p-5 transition-all duration-500",
                isActive ? "border-ficium/20 shadow-md scale-[1.01]" : "border-ink/[0.06] opacity-60",
                "bg-white",
              ].join(" ")}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex-shrink-0 grid place-items-center mt-0.5" style={{ background: insight.bg }}>
                  <Icon size={16} style={{ color: insight.color }} />
                </div>
                <p className="text-[15px] text-ink/85 font-semibold leading-snug">{insight.text}</p>
              </div>
              {isActive && (
                <Link to="/advisor" className="text-[12px] font-bold text-ficium no-underline hover:underline flex items-center gap-1">
                  See full analysis <ArrowRight size={11} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3 lg:hidden">
        {insights.map((_, i) => (
          <div key={i} className={["h-1.5 rounded-pill transition-all duration-300", i === activeIdx ? "bg-ficium w-5" : "bg-ink/20 w-1.5"].join(" ")} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   AI FINANCIAL COACH
   ============================================================ */

function AIFinancialCoach() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "You are likely eligible for a lower-rate facility based on your income trend and improved debt ratio."
  );
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const actions = [
    { id: "score", label: "Optimize score", color: "text-ficium bg-ficium/10 hover:bg-ficium/20" },
    { id: "liabilities", label: "Reduce liabilities", color: "text-red-600 bg-red-50 hover:bg-red-100" },
    { id: "eligibility", label: "Improve eligibility", color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" },
  ];

  const handleAction = (id: string) => {
    setActiveAction(id);
    setLoading(true);
    // Simulate AI response (replace with real Claude API call)
    setTimeout(() => {
      const responses: Record<string, string> = {
        score: "To optimize your score, focus on reducing your credit utilization below 30% and ensuring all EMIs are paid on time for the next 3 months.",
        liabilities: "Your highest-cost liability is your personal loan at 12.5%. Refinancing it could save you MUR 1,800/month based on current market rates.",
        eligibility: "You're 2 steps from top-tier eligibility: complete your financial dossier and add one more asset. This unlocks bids from all 14 institutions.",
      };
      setMessage(responses[id] ?? message);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="rounded-[22px] overflow-hidden border border-ficium/20 bg-white shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#0f0c29] to-[#302b63] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center flex-shrink-0">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <div className="text-[16px] font-bold text-white leading-tight">Ficium AI Coach</div>
          <div className="text-[11px] text-white/50">Powered by Claude</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-white/50 font-medium">Live</span>
        </div>
      </div>

      {/* Message bubble */}
      <div className="p-5">
        <div className="rounded-xl bg-ficium/[0.06] border border-ficium/10 p-4 mb-5 min-h-[90px] relative">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-ficium/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <span className="text-[13px] text-muted">Analysing your profile…</span>
            </div>
          ) : (
            <p className="text-[15px] text-ink/80 leading-relaxed font-medium">{message}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAction(a.id)}
              className={[
                "w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all",
                a.color,
                activeAction === a.id ? "ring-1 ring-current" : "",
              ].join(" ")}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LOAN SIMULATOR
   ============================================================ */

function LoanSimulator({ loanAmount, setLoanAmount, loanTerm, setLoanTerm, loanRate, setLoanRate, monthlyPayment, totalInterest, totalPayment }: {
  loanAmount: number; setLoanAmount: (v: number) => void;
  loanTerm: number; setLoanTerm: (v: number) => void;
  loanRate: number; setLoanRate: (v: number) => void;
  monthlyPayment: number; totalInterest: number; totalPayment: number;
}) {
  return (
    <div className="rounded-[22px] bg-white border border-ink/[0.06] overflow-hidden mb-8 shadow-sm">
      {/* Header */}
      <div className="px-5 py-5 border-b border-ink/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 grid place-items-center flex-shrink-0">
              <Calculator size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-0.5">Loan Simulator</div>
              <div className="font-display text-[18px] font-bold text-ink leading-tight">See what you'd pay — before you commit</div>
            </div>
          </div>
          <Link to="/requests/new" className="text-[12px] font-bold text-ficium no-underline hover:underline flex items-center gap-1 flex-shrink-0 pt-2">
            Get real bids <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <div className="p-5 lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Sliders */}
        <div className="space-y-5 mb-6 lg:mb-0">
          <SimulatorSlider
            label="Loan Amount"
            value={loanAmount}
            min={50000} max={5000000} step={50000}
            onChange={setLoanAmount}
            display={`MUR ${new Intl.NumberFormat("en-IN").format(loanAmount)}`}
          />
          <SimulatorSlider
            label="Loan Term"
            value={loanTerm}
            min={6} max={120} step={6}
            onChange={setLoanTerm}
            display={`${loanTerm} months`}
          />
          <SimulatorSlider
            label="Interest Rate (p.a.)"
            value={loanRate}
            min={4} max={24} step={0.5}
            onChange={setLoanRate}
            display={`${loanRate.toFixed(1)}%`}
          />
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-gradient-to-br from-ficium to-[#302b63] p-5 sm:p-6 text-white flex flex-col justify-between">
          <div>
            <div className="text-[12px] text-white/60 font-bold uppercase tracking-widest mb-1">Monthly Repayment</div>
            <div className="font-display text-[42px] sm:text-5xl font-extrabold tracking-tight mb-1 leading-none">
              {isNaN(monthlyPayment) ? "—" : `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(monthlyPayment)}`}
            </div>
            <div className="text-[13px] text-white/50 font-medium">MUR / month for {loanTerm} months</div>
          </div>
          <div className="h-px bg-white/10 my-5" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest mb-1">Total Interest</div>
              <div className="font-display text-[22px] font-bold text-amber-300">
                {isNaN(totalInterest) ? "—" : `MUR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalInterest)}`}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest mb-1">Total Repaid</div>
              <div className="font-display text-[22px] font-bold text-white">
                {isNaN(totalPayment) ? "—" : `MUR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalPayment)}`}
              </div>
            </div>
          </div>
          <Link to="/requests/new" className="mt-5 block text-center bg-white/15 hover:bg-white/25 transition-colors rounded-xl py-3 text-[14px] font-bold text-white no-underline">
            Post a request — banks compete ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

function SimulatorSlider({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] text-muted font-semibold">{label}</span>
        <span className="text-[14px] font-bold text-ink">{display}</span>
      </div>
      <div className="relative h-2.5 bg-ink/[0.08] rounded-pill">
        <div className="absolute h-2.5 rounded-pill bg-ficium transition-all" style={{ width: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

/* ============================================================
   MINI SPARKLINE
   ============================================================ */

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const w = 200; const h = 50; const pad = 6;
  const max = Math.max(...points, 1); const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y] as [number, number];
  });
  const line = coords.map(([x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = coords[i - 1]; const cx = (px + x) / 2;
    return `C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }).join(" ");
  const fill = `${line} L ${coords[coords.length - 1][0]} ${h} L ${coords[0][0]} ${h} Z`;
  const dot = coords[coords.length - 1];
  const gid = `ms-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={dot[0]} cy={dot[1]} r="3.5" fill={color} />
    </svg>
  );
}

/* ============================================================
   MARKETPLACE TILE
   ============================================================ */

function MarketTile({ icon, label, title, metric, metricValue, bg, dark, href }: {
  icon: React.ReactNode; label: string; title: string; metric: string; metricValue: string; bg: string; dark?: boolean; href: string;
}) {
  const txt = dark ? "text-ink" : "text-white";
  const sub = dark ? "opacity-70" : "opacity-60";
  return (
    <Link to={href} className="no-underline">
      <div className={[bg, txt, "rounded-[20px] p-4 sm:p-5 min-h-[185px] flex flex-col relative overflow-hidden hover:-translate-y-0.5 transition-transform"].join(" ")}>
        <div className={["w-10 h-10 rounded-xl grid place-items-center mb-3", dark ? "bg-black/10" : "bg-white/15"].join(" ")}>{icon}</div>
        <div className={["text-[10px] font-bold uppercase tracking-widest absolute top-4 right-4 px-2 py-1 rounded-pill", dark ? "bg-black/10" : "bg-white/15"].join(" ")}>{label}</div>
        <div className="font-display text-[16px] font-bold leading-snug flex-1">{title}</div>
        <div className={["h-px my-3", dark ? "bg-black/10" : "bg-white/15"].join(" ")} />
        <div>
          <div className={["text-[10px] uppercase tracking-widest font-bold mb-0.5", sub].join(" ")}>{metric}</div>
          <div className="font-display text-[20px] font-extrabold">{metricValue}</div>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   NEXT ACTIONS
   ============================================================ */

function NextActions({ actions }: { actions: NextAction[] }) {
  const ps = { high: "border-red-200 bg-red-50 text-red-700", medium: "border-amber-200 bg-amber-50 text-amber-700", low: "border-ficium/15 bg-ficium/[0.04] text-ficium" };
  const dc = { high: "bg-red-500", medium: "bg-amber-400", low: "bg-ficium" };
  return (
    <Card padded={false} className="p-4 sm:p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={15} className="text-ficium" />
        <span className="font-display text-[17px] font-bold">Next steps</span>
        <span className="ml-auto text-[11px] font-bold bg-ficium/10 text-ficium px-2.5 py-0.5 rounded-pill">{actions.length}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {actions.map((a) => (
          <Link key={a.id} to={a.href} className="no-underline group">
            <div className={["flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm", ps[a.priority]].join(" ")}>
              <div className={["w-2.5 h-2.5 rounded-full flex-shrink-0", dc[a.priority]].join(" ")} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold leading-snug">{a.label}</div>
                <div className="text-[11px] opacity-70 mt-0.5">{a.description}</div>
              </div>
              <ChevronRight size={15} className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatAmount(n: number): string {
  if (n === 0) return "0";
  return new Intl.NumberFormat("en-IN").format(n);
}
