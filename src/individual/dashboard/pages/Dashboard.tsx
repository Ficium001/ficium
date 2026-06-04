import { useState }      from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, HandCoins, CreditCard, PiggyBank, LineChart, ChevronRight } from "lucide-react";
import { useAuth }        from "@/features/auth/context/AuthContext";
import { useProfile, useMyRequests, useNextActions, useBankReadiness } from "@/individual/dashboard/hooks/useDashboard";
import { useDashboardInsights }  from "@/individual/dashboard/hooks/useDashboardInsights";
import { getGreeting }           from "@/individual/dashboard/config/dashboard";
import {
  DashboardBackground, DashboardTopBar, OnboardingBanners,
  NetWorthHero, FlipCards, AIFinancialCoach, SmartInsightsFeed,
  MarketTile, NextActions, FinancialToolsSection,
} from "@/individual/dashboard/components";
import { BottomNav }      from "@/shared/ui";
import { ErrorBoundary }  from "@/core/error-boundary";

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — thin orchestrator.
// No formatting logic, no sub-component definitions, no hardcoded copy.
// Each concern lives in components/, hooks/, or config/.
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

  const loading          = profileLoading || requestsLoading;
  const kycVerified      = profile?.kycStatus === "verified";
  const hasDossier       = !!profile?.hasDossier;
  const readyToRequest   = kycVerified && hasDossier;
  const activeRequests   = requests.filter((r) => r.status === "open").length;
  const totalNewBids     = requests.reduce((s, r) => s + r.bidCount, 0);
  const name             = profile?.firstName ?? profile?.fullName ?? "there";
  const initial          = name[0]?.toUpperCase() ?? "?";

  const flip       = (id: string) => setFlipped((p) => ({ ...p, [id]: !p[id] }));
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen pb-28 relative">
      <DashboardBackground />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10">

        <DashboardTopBar
          initial={initial} name={name} greeting={getGreeting()}
          totalNewBids={totalNewBids} onSignOut={handleSignOut}
        />

        {profile && (
          <OnboardingBanners kycVerified={kycVerified} hasDossier={hasDossier} />
        )}

        {/* Desktop: two-column hero + coach; mobile: stacked */}
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-5">
          <div>
            <NetWorthHero
              netWorth={profile?.totalNetWorth ?? 0}
              hidden={hidden}
              onToggle={() => setHidden((h) => !h)}
            />
            <FlipCards
              loading={loading}
              healthScore={profile?.healthScore ?? null}
              bankReadiness={bankReadiness ?? null}
              activeRequests={activeRequests}
              totalNewBids={totalNewBids}
              flipped={flipped}
              onFlip={flip}
            />
          </div>
          <div className="mb-5 lg:mb-0 lg:self-start lg:sticky lg:top-6">
            <AIFinancialCoach />
          </div>
        </div>

        {/* ── Cream zone ── */}

        <ErrorBoundary name="Smart Insights">
          <SmartInsightsFeed insights={insights} activeIdx={activeIdx} onNext={next} />
        </ErrorBoundary>

        {/* Quick access */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">Quick access</div>
            <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
              What do you <span className="text-ficium">need today?</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickCard to="/requests/new" label="I need a"  title="Credit facility"  color="text-ficium"     bg="bg-ficium/10"  icon={<HandCoins size={20} className="text-ficium" />} />
            <QuickCard to="/requests/new" label="I need an" title="Investment"        color="text-amber-600"  bg="bg-amber-50"   icon={<LineChart size={20}  className="text-amber-600" />} />
          </div>
        </div>

        {/* Marketplace */}
        <ErrorBoundary name="Marketplace Tiles">
          <div className="mb-8">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">Marketplace</div>
                <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
                  Banks compete <span className="text-ficium">for you</span>
                </h2>
              </div>
              <Link to="/requests" className="text-[13px] text-muted font-semibold no-underline flex items-center gap-0.5 hover:text-ink pb-1">
                All <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <MarketTile icon={<HandCoins size={17} />} label="Personal"    title="Loans that compete for you"   metric="Best rate"    metricValue="8.2%" bg="bg-ficium"      href="/requests/new" />
              <MarketTile icon={<CreditCard size={17} />} label="Credit Card" title="Card offers tailored to you"  metric="Top cashback" metricValue="3.5%" bg="bg-violet-600"  href="/requests/new" />
              <MarketTile icon={<PiggyBank size={17} />}  label="Deposits"   title="Deposits with real yield"     metric="Top yield"    metricValue="5.4%" bg="bg-amber-400"   dark href="/requests/new" />
              <MarketTile icon={<LineChart size={17} />}  label="Wealth"     title="Investments that find you"    metric="Fee saving"   metricValue="0.4%" bg="bg-emerald-300" dark href="/requests/new" />
            </div>
          </div>
        </ErrorBoundary>

        <ErrorBoundary name="Financial Tools">
          <FinancialToolsSection />
        </ErrorBoundary>

        {actions.length > 0 && (
          <ErrorBoundary name="Next Actions">
            <NextActions actions={actions} />
          </ErrorBoundary>
        )}
      </div>

      {readyToRequest && (
        <Link to="/requests/new" className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline">
          <Plus size={18} /> New Request
        </Link>
      )}

      <BottomNav />
    </div>
  );
}

// ── Inline micro-component (too small to warrant its own file) ────────────────
function QuickCard({ to, label, title, color, bg, icon }: {
  to: string; label: string; title: string; color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <Link to={to} className="no-underline group">
      <div className="bg-white rounded-2xl border border-ink/[0.06] p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className={["w-10 h-10 rounded-xl grid place-items-center mb-3", bg].join(" ")}>{icon}</div>
        <div className="text-[13px] text-muted font-medium mb-1">{label}</div>
        <div className="font-display text-[18px] font-bold text-ink leading-tight">{title}</div>
        <div className={["flex items-center gap-1 mt-3 text-[12px] font-semibold", color].join(" ")}>
          Get offers <span className="text-xs">→</span>
        </div>
      </div>
    </Link>
  );
}
