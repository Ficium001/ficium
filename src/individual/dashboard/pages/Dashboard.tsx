import { useState }         from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, HandCoins, CreditCard, PiggyBank, LineChart,
  Calculator, Wallet, ShieldCheck, Upload, MessageCircle,
} from "lucide-react";
import { useAuth }           from "@/features/auth/context/AuthContext";
import { useProfile, useMyRequests, useNextActions, useBankReadiness } from "@/individual/dashboard/hooks/useDashboard";
import { useDashboardInsights }  from "@/individual/dashboard/hooks/useDashboardInsights";
import { getGreeting, formatAmount } from "@/individual/dashboard/config/dashboard";
import {
  DashboardTopBar, OnboardingBanners,
  NetWorthHero, FlipCards,
  SmartInsightsFeed, MarketTile, NextActions,
  FinancialGoalsSection, WhatAreYouPlanningSection,
} from "@/individual/dashboard/components";
import { BottomNav } from "@/shared/ui";
import { ErrorBoundary } from "@/core/error-boundary";

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
    <div className="min-h-screen bg-cream pb-28">

      {/* ── Top nav bar ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
          <DashboardTopBar
            initial={initial} name={name} greeting={getGreeting()}
            totalNewBids={totalNewBids} onSignOut={handleSignOut}
          />
        </div>
      </div>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">

        {profile && (
          <OnboardingBanners kycVerified={kycVerified} hasDossier={hasDossier} />
        )}

        {/* 1 — What are you planning today? */}
        <ErrorBoundary name="Planning">
          <WhatAreYouPlanningSection />
        </ErrorBoundary>

        {/* 2 — Your Active Journeys */}
        <ErrorBoundary name="Goals">
          <FinancialGoalsSection />
        </ErrorBoundary>

        {/* 3 — Net Worth + Financial Health (side-by-side desktop, stacked mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Net Worth */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-ink/[0.05]">
              <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Net Worth</span>
              <span className="text-[10px] font-bold bg-ink/[0.06] text-muted px-2 py-0.5 rounded-pill">MUR</span>
            </div>
            <NetWorthHero
              netWorth={profile?.totalNetWorth ?? 7100000}
              hidden={hidden}
              onToggle={() => setHidden((h) => !h)}
            />
            <div className="grid grid-cols-3 divide-x divide-ink/[0.05] border-t border-ink/[0.05]">
              {[
                { label: "Assets",         value: formatAmount(9520000) },
                { label: "Liabilities",    value: formatAmount(2420000) },
                { label: "Monthly Change", value: formatAmount(120000)  },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3">
                  <div className="text-[10px] text-muted font-semibold mb-0.5">{label}</div>
                  <div className="text-[12px] sm:text-[13px] font-bold text-ink">Rs {value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Health */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink/[0.05]">
              <span className="font-display text-[15px] font-bold text-ink">Financial Health</span>
              <span className="text-[12px] font-bold text-emerald-600">Good</span>
            </div>
            <div className="p-4">
              <FlipCards
                loading={loading}
                healthScore={profile?.healthScore ?? null}
                bankReadiness={bankReadiness ?? null}
                activeRequests={activeRequests}
                totalNewBids={totalNewBids}
                flipped={flipped}
                onFlip={flip}
              />
              <div className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2.5"
                   style={{ background: "rgba(42,31,230,0.04)", border: "1px solid rgba(42,31,230,0.10)" }}>
                <span className="text-[18px]">✨</span>
                <span className="text-[12px] sm:text-[13px] text-ink/80 font-medium leading-snug">
                  Keep up the good work! You're on track to achieve your goals.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 — Smart Insights */}
        <ErrorBoundary name="Smart Insights">
          <SmartInsightsFeed insights={insights} activeIdx={activeIdx} onNext={next} />
        </ErrorBoundary>

        {/* 5 — Banks Compete For You */}
        <div>
          <SectionHeader
            eyebrow="Marketplace"
            title="Banks compete"
            highlight="for you"
            action={{ label: "View all offers →", to: "/requests" }}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MarketTile icon={<HandCoins size={18} />} label="Personal Loan"  title="Loans that compete for you"   metric="Best rate"    metricValue="8.2% from 6 banks"        bg="bg-ficium"      href="/requests/new" />
            <MarketTile icon={<CreditCard size={18} />} label="Credit Card"   title="Card offers tailored to you"  metric="Top cashback" metricValue="3.5% from 4 banks"        bg="bg-violet-600"  href="/requests/new" />
            <MarketTile icon={<PiggyBank size={18} />}  label="Deposit"       title="Deposits with real yield"     metric="Top yield"    metricValue="5.4% from 3 banks"        bg="bg-amber-400"   dark href="/requests/new" />
            <MarketTile icon={<LineChart size={18} />}  label="Wealth"        title="Investments that find you"    metric="Fee saving"   metricValue="0.4% potential saving"   bg="bg-emerald-400" dark href="/requests/new" />
          </div>
        </div>

        {/* 6 — Quick Actions */}
        <div>
          <SectionHeader title="Quick" highlight="Actions" />
          {/* 4-col mobile, 7-col desktop */}
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            {QUICK_ACTIONS.map(({ icon, label, bg, to }) => (
              <Link key={label} to={to} className="no-underline">
                <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 hover:shadow-card transition-all hover:-translate-y-0.5 text-center">
                  <div className={["w-10 h-10 sm:w-12 sm:h-12 rounded-xl grid place-items-center flex-shrink-0", bg].join(" ")}>
                    {icon}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-ink leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 7 — Tools & Calculators */}
        <div>
          <SectionHeader
            title="Tools &"
            highlight="Calculators"
            action={{ label: "View all tools →", to: "/tools" }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TOOLS.map(({ icon, bg, title, desc, to }) => (
              <Link key={title} to={to} className="no-underline">
                <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-4 sm:p-5 flex items-start gap-4 hover:shadow-card transition-all hover:-translate-y-0.5">
                  <div className={["w-10 h-10 rounded-xl grid place-items-center flex-shrink-0", bg].join(" ")}>{icon}</div>
                  <div>
                    <div className="text-[13px] font-bold text-ink">{title}</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-snug">{desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 8 — Next Actions */}
        {actions.length > 0 && (
          <ErrorBoundary name="Next Actions">
            <NextActions actions={actions} />
          </ErrorBoundary>
        )}

      </div>

      {/* FAB — new request */}
      {readyToRequest && (
        <Link
          to="/requests/new"
          className="fixed bottom-20 right-4 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-pill shadow-ficium font-semibold no-underline text-[13px]"
        >
          <Plus size={16} /> New Request
        </Link>
      )}

      <BottomNav />
    </div>
  );
}

// ── Section header micro-component ───────────────────────────────────────────

function SectionHeader({
  eyebrow, title, highlight, action,
}: {
  eyebrow?:  string;
  title:     string;
  highlight: string;
  action?:   { label: string; to: string };
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">{eyebrow}</div>
        )}
        <h2 className="font-display text-[20px] sm:text-[24px] font-bold text-ink leading-tight">
          {title} <span className="text-ficium">{highlight}</span>
        </h2>
      </div>
      {action && (
        <Link to={action.to} className="text-[12px] sm:text-[13px] text-muted font-semibold no-underline hover:text-ink pb-1 flex-shrink-0 ml-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: <HandCoins     size={20} className="text-ficium"      />, label: "Apply for Loan",    bg: "bg-ficium/10",  to: "/requests/new"                        },
  { icon: <CreditCard    size={20} className="text-violet-600"  />, label: "Credit Card",       bg: "bg-violet-50",  to: "/requests/new?type=credit_card"        },
  { icon: <LineChart     size={20} className="text-emerald-600" />, label: "Invest Now",        bg: "bg-emerald-50", to: "/requests/new?type=investment_account" },
  { icon: <ShieldCheck   size={20} className="text-ficium"      />, label: "Eligibility",       bg: "bg-ficium/10",  to: "/advisor"                             },
  { icon: <Upload        size={20} className="text-muted"       />, label: "Upload Doc",        bg: "bg-ink/[0.05]", to: "/onboarding/kyc"                      },
  { icon: <MessageCircle size={20} className="text-ficium"      />, label: "AI Coach",          bg: "bg-ficium/10",  to: "/advisor"                             },
  { icon: <Calculator    size={20} className="text-amber-600"   />, label: "Calculator",        bg: "bg-amber-50",   to: "/tools"                               },
];

const TOOLS = [
  { icon: <Calculator  size={20} className="text-ficium"      />, bg: "bg-ficium/10",  title: "Loan Calculator",      desc: "Estimate your monthly repayments", to: "/tools#credit"        },
  { icon: <LineChart   size={20} className="text-emerald-600" />, bg: "bg-emerald-50", title: "Investment Calculator", desc: "Project your future wealth",       to: "/tools#investment"    },
  { icon: <Wallet      size={20} className="text-amber-600"   />, bg: "bg-amber-50",   title: "Affordability Check",  desc: "Find what you can afford",         to: "/requests/new"        },
  { icon: <ShieldCheck size={20} className="text-violet-600"  />, bg: "bg-violet-50",  title: "Debt Analyser",        desc: "Understand your debt better",      to: "/advisor"             },
];
