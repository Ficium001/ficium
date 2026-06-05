import { useState }         from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, HandCoins, CreditCard, PiggyBank, LineChart,
  Calculator, Wallet, ShieldCheck, Upload, MessageCircle,
} from "lucide-react";
import { useAuth }           from "@/features/auth/context/AuthContext";
import { useProfile, useMyRequests, useNextActions, useBankReadiness } from "@/individual/dashboard/hooks/useDashboard";
import { useDashboardInsights }  from "@/individual/dashboard/hooks/useDashboardInsights";
import { getGreeting }           from "@/individual/dashboard/config/dashboard";
import {
  DashboardTopBar, OnboardingBanners,
  NetWorthHero, FlipCards,
  SmartInsightsFeed, MarketTile, NextActions,
  FinancialGoalsSection, WhatAreYouPlanningSection,
} from "@/individual/dashboard/components";
import { BottomNav } from "@/shared/ui";
import { ErrorBoundary } from "@/core/error-boundary";

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — reordered to match full-width desktop design.
// Order: TopBar → Planning → Goals → NetWorth+Health → SmartInsights
//        → Banks Compete → Quick Actions → Tools & Calculators → NextActions
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { signOut }  = useAuth();
  const navigate     = useNavigate();
  const [hidden,  setHidden]  = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const { data: profile,  isLoading: profileLoading  } = useProfile();
  const { data: requests = [], isLoading: requestsLoading } = useMyRequests();
  const { actions }      = useNextActions();
  const { score: bankReadiness } = useBankReadiness();
  const { insights, activeIdx, next } = useDashboardInsights();

  const loading        = profileLoading || requestsLoading;
  const kycVerified    = profile?.kycStatus === "verified";
  const hasDossier     = !!profile?.hasDossier;
  const readyToRequest = kycVerified && hasDossier;
  const activeRequests = requests.filter((r) => r.status === "open").length;
  const totalNewBids   = requests.reduce((s, r) => s + r.bidCount, 0);
  const name           = profile?.firstName ?? profile?.fullName ?? "there";
  const initial        = name[0]?.toUpperCase() ?? "?";

  const flip          = (id: string) => setFlipped((p) => ({ ...p, [id]: !p[id] }));
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-28">

      {/* ── Top nav — dark gradient band ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#0f0c29] via-[#1a1040] to-[#302b63]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
          <DashboardTopBar
            initial={initial} name={name} greeting={getGreeting()}
            totalNewBids={totalNewBids} onSignOut={handleSignOut}
          />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        {profile && (
          <OnboardingBanners kycVerified={kycVerified} hasDossier={hasDossier} />
        )}

        {/* 1. What are you planning today? */}
        <div className="mt-6">
          <ErrorBoundary name="Planning Section">
            <WhatAreYouPlanningSection />
          </ErrorBoundary>
        </div>

        {/* 2. Your Active Journeys (Goals) */}
        <ErrorBoundary name="Financial Goals">
          <FinancialGoalsSection />
        </ErrorBoundary>

        {/* 3. Net Worth + Financial Health side by side */}
        <div className="grid lg:grid-cols-2 gap-5 mb-8">

          {/* Net Worth card — white bg, full detail */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-ink/[0.05]">
              <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Net Worth</span>
              <span className="text-[10px] font-bold bg-ink/[0.06] text-muted px-2 py-0.5 rounded-pill">MUR</span>
            </div>
            <NetWorthHero
              netWorth={profile?.totalNetWorth ?? 0}
              hidden={hidden}
              onToggle={() => setHidden((h) => !h)}
            />
            {/* Assets / Liabilities / Monthly Change */}
            <div className="grid grid-cols-3 border-t border-ink/[0.05]">
              {[
                { label: "Assets",         value: "Rs 95,20,000" },
                { label: "Liabilities",    value: "Rs 24,20,000" },
                { label: "Monthly Change", value: "Rs 1,20,000"  },
              ].map(({ label, value }) => (
                <div key={label} className="px-5 py-3">
                  <div className="text-[10px] text-muted font-semibold mb-0.5">{label}</div>
                  <div className="text-[13px] font-bold text-ink">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Health card */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-ink/[0.05]">
              <span className="text-[15px] font-bold text-ink">Financial Health</span>
              <span className="text-[12px] font-bold text-emerald-600">Good</span>
            </div>
            <div className="p-5">
              <FlipCards
                loading={loading}
                healthScore={profile?.healthScore ?? null}
                bankReadiness={bankReadiness ?? null}
                activeRequests={activeRequests}
                totalNewBids={totalNewBids}
                flipped={flipped}
                onFlip={flip}
              />
              <div className="mt-3 bg-ficium/[0.04] border border-ficium/10 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-[20px]">✨</span>
                <span className="text-[13px] text-ink/80 font-medium">
                  Keep up the good work! You're on track to achieve your goals.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Smart Insights */}
        <ErrorBoundary name="Smart Insights">
          <SmartInsightsFeed insights={insights} activeIdx={activeIdx} onNext={next} />
        </ErrorBoundary>

        {/* 5. Banks Compete For You */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">Marketplace</div>
              <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
                Banks compete <span className="text-ficium">for you</span>
              </h2>
            </div>
            <Link to="/requests" className="text-[13px] text-muted font-semibold no-underline flex items-center gap-0.5 hover:text-ink pb-1">
              View all offers →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MarketTile icon={<HandCoins size={17} />} label="Personal Loan" title="Loans that compete for you"  metric="Best rate"    metricValue="8.2% from 6 banks" bg="bg-ficium"      href="/requests/new" />
            <MarketTile icon={<CreditCard size={17} />} label="Credit Card"  title="Card offers tailored to you" metric="Top cashback" metricValue="3.5% from 4 banks" bg="bg-violet-600"  href="/requests/new" />
            <MarketTile icon={<PiggyBank size={17} />}  label="Deposit"      title="Deposits with real yield"    metric="Top yield"    metricValue="5.4% from 3 banks" bg="bg-amber-400"   dark href="/requests/new" />
            <MarketTile icon={<LineChart size={17} />}  label="Wealth"       title="Investments that find you"   metric="Fee saving"   metricValue="0.4% potential saving" bg="bg-emerald-400" dark href="/requests/new" />
          </div>
        </div>

        {/* 6. Quick Actions */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
              Quick <span className="text-ficium">Actions</span>
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { icon: <HandCoins size={22} className="text-ficium" />,    label: "Apply for Loan",    bg: "bg-ficium/10",      to: "/requests/new" },
              { icon: <CreditCard size={22} className="text-violet-600" />, label: "Credit Card",    bg: "bg-violet-50",      to: "/requests/new?type=credit-card" },
              { icon: <LineChart size={22} className="text-emerald-600" />, label: "Invest Now",     bg: "bg-emerald-50",     to: "/requests/new?type=investment" },
              { icon: <span className="text-[22px]">%</span>,               label: "Compare Rates",  bg: "bg-amber-50",       to: "/tools" },
              { icon: <ShieldCheck size={22} className="text-blue-600" />,  label: "Check Eligibility", bg: "bg-blue-50",    to: "/advisor" },
              { icon: <Upload size={22} className="text-ink/60" />,         label: "Upload Document",bg: "bg-ink/[0.05]",     to: "/kyc" },
              { icon: <MessageCircle size={22} className="text-ficium" />,  label: "Talk to AI Coach", bg: "bg-ficium/10",   to: "/advisor" },
            ].map(({ icon, label, bg, to }) => (
              <Link key={label} to={to} className="no-underline">
                <div className="bg-white rounded-2xl border border-ink/[0.06] p-4 flex flex-col items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5 text-center">
                  <div className={["w-12 h-12 rounded-xl grid place-items-center", bg].join(" ")}>{icon}</div>
                  <span className="text-[11px] font-semibold text-ink leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 7. Tools & Calculators */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
              Tools & <span className="text-ficium">Calculators</span>
            </h2>
            <Link to="/tools" className="text-[13px] text-muted font-semibold no-underline hover:text-ink pb-1">
              View all tools →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: <Calculator size={20} className="text-ficium" />,   bg: "bg-ficium/10",    title: "Loan Calculator",      desc: "Estimate your monthly repayments" },
              { icon: <LineChart size={20} className="text-emerald-600" />, bg: "bg-emerald-50", title: "Investment Calculator", desc: "Project your future wealth" },
              { icon: <Wallet size={20} className="text-amber-600" />,    bg: "bg-amber-50",     title: "Affordability Check",  desc: "Find what you can afford" },
              { icon: <ShieldCheck size={20} className="text-violet-600" />, bg: "bg-violet-50", title: "Debt Analyser",        desc: "Understand your debt better" },
            ].map(({ icon, bg, title, desc }) => (
              <Link key={title} to="/tools" className="no-underline">
                <div className="bg-white rounded-2xl border border-ink/[0.06] p-5 flex items-start gap-4 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className={["w-10 h-10 rounded-xl grid place-items-center flex-shrink-0", bg].join(" ")}>{icon}</div>
                  <div>
                    <div className="text-[13px] font-bold text-ink">{title}</div>
                    <div className="text-[11px] text-muted mt-0.5">{desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 8. Next Actions (if any) */}
        {actions.length > 0 && (
          <ErrorBoundary name="Next Actions">
            <NextActions actions={actions} />
          </ErrorBoundary>
        )}

      </div>

      {/* FAB */}
      {readyToRequest && (
        <Link
          to="/requests/new"
          className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline"
        >
          <Plus size={18} /> New Request
        </Link>
      )}

      <BottomNav />
    </div>
  );
}
