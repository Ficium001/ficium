import { useState }         from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, HandCoins, CreditCard, PiggyBank, LineChart,
  Calculator, Wallet, ShieldCheck,
  Bell, LogOut,
} from "lucide-react";
import { useAuth }           from "@/features/auth/context/AuthContext";
import { useProfile, useMyRequests, useNextActions, useBankReadiness } from "@/individual/dashboard/hooks/useDashboard";
import { useDashboardInsights }  from "@/individual/dashboard/hooks/useDashboardInsights";
import { useSnapshot }           from "@/individual/networth/hooks/useSnapshot";
import { useUnreadCount }        from "@/individual/alerts/hooks/useAlerts";
import { getGreeting, formatAmount, healthLabel, SPARK_NETWORTH, SPARK_REQUESTS } from "@/individual/dashboard/config/dashboard";
import {
  OnboardingBanners,
  NetWorthHero, FlipCards,
  SmartInsightsFeed, MarketTile, NextActions,
  LiveOffersSection,
} from "@/individual/dashboard/components";
import { WhatAreYouPlanningSection } from "@/individual/dashboard/components/WhatAreYouPlanningSection";
import { ActiveRequestCard } from "@/individual/requests/components/ActiveRequestCard";
import { BottomNav } from "@/shared/ui";
import { Hero, HeroButton, GradText, type HeroStat } from "@/shared/ui/dashboard";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";
import { ErrorBoundary } from "@/core/error-boundary";

/** Compact formatter for tight spaces (hero tile breakdown on mobile) —
 *  e.g. "Rs 1.2M" instead of "Rs 12,00,000", which overflows a narrow
 *  half-width grid cell. The full Net Worth card below keeps full numbers. */
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `Rs ${(n / 1_000).toFixed(0)}k`;
  return `Rs ${n}`;
}

export default function Dashboard() {
  const { signOut }  = useAuth();
  const navigate     = useNavigate();
  const [hidden,  setHidden]  = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [requestFilter, setRequestFilter] = useState<"open" | "accepted" | "closed">("open");

  const { data: profile,  isLoading: profileLoading  } = useProfile();
  const { data: requests = [], isLoading: requestsLoading } = useMyRequests();
  const { data: snapshot } = useSnapshot();
  const { actions }      = useNextActions();
  const { score: bankReadiness } = useBankReadiness();
  const { insights, activeIdx, next } = useDashboardInsights();
  const { user }         = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id ?? null);

  const loading        = profileLoading || requestsLoading;
  const kycVerified    = profile?.kycStatus === "verified";
  const hasDossier     = !!profile?.hasDossier;
  const readyToRequest = kycVerified && hasDossier;
  const activeRequests = requests.filter((r) => r.status === "open").length;
  const totalNewBids   = requests.reduce((s, r) => s + r.bidCount, 0);
  const name           = profileLoading ? "" : (profile?.firstName ?? profile?.fullName ?? "");

  // Real financial numbers from snapshot — zero if not entered yet
  const netWorth       = snapshot?.netWorth      ?? profile?.totalNetWorth ?? null;
  const totalAssets    = snapshot?.totalAssets    ?? 0;
  const totalLiabs     = snapshot?.totalLiabilities ?? 0;

  // Health label from real score
  const hl = healthLabel(profile?.healthScore ?? null);

  const flip          = (id: string) => setFlipped((p) => ({ ...p, [id]: !p[id] }));
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  // Net worth: show the figure only when the user has actually entered
  // financial data (a real snapshot row, or a profile net-worth value).
  // Otherwise show a prompt — never a misleading "Rs 0".
  const hasNetWorth = (snapshot?.exists ?? false) || profile?.totalNetWorth != null;
  // Health score is always shown as a ring tile — the ring's color-coding
  // (green ≥70, amber ≥50, red below) already softens a low score visually,
  // so there's no need to hide the tile entirely like a flat-text number would.
  const healthScore = profile?.healthScore ?? null;

  const heroStats: HeroStat[] = [
    hasNetWorth
      ? {
          label: "Net worth", value: netWorth ?? 0, prefix: "Rs ", format: "comma", accounting: true,
          sparkline: SPARK_NETWORTH, sparklineColor: "#A78BFA",
          breakdown: [
            { label: "Assets",      value: totalAssets > 0 ? fmtCompact(totalAssets) : "—" },
            { label: "Liabilities", value: totalLiabs  > 0 ? fmtCompact(totalLiabs)  : "—" },
          ],
        }
      : { label: "Net worth", display: "—", hint: "Add finances" },
    { label: "Active requests", value: activeRequests, sparkline: SPARK_REQUESTS, sparklineColor: "#60A5FA" },
    { label: "New bids", value: totalNewBids, badge: totalNewBids > 0 ? "Live" : undefined, sparkline: SPARK_REQUESTS, sparklineColor: "#4ADE80", trendTone: "good" },
    healthScore != null
      ? { label: "Health score", value: healthScore, suffix: "/100", ring: healthScore, ringMax: 100, link: { label: "Full report →", onClick: () => navigate("/health") } }
      : { label: "Health score", display: "—", hint: "Complete profile" },
  ];

  return (
    <div className="min-h-screen bg-paper pb-28">

      {/* Storytelling hero header */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-4">
        {/* top chrome row: logo + actions */}
        <div className="flex items-center justify-between mb-4">
          <FiciumLogo heightPx={24} withWordmark wordmarkClassName="text-[18px] text-ink" />
          <div className="flex items-center gap-2">
            <Link
              to="/alerts"
              className="relative w-10 h-10 rounded-full bg-white border border-line grid place-items-center text-ink/70 hover:bg-ink/[0.03] transition-colors no-underline"
              aria-label="Alerts"
            >
              <Bell size={16} />
              {totalNewBids > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold grid place-items-center"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#C026D3)" }}
                >
                  {totalNewBids}
                </span>
              )}
            </Link>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="w-10 h-10 rounded-full bg-white border border-line grid place-items-center text-ink/70 hover:text-bad hover:bg-ink/[0.03] transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <Hero
          eyebrow={`${getGreeting().toUpperCase()} · ${new Date().toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}`}
          live={totalNewBids > 0}
          headline={
            name ? (
              totalNewBids > 0 ? (
                <>Hi {name}.<br /><GradText>{totalNewBids} new bid{totalNewBids > 1 ? "s" : ""}</GradText> {totalNewBids > 1 ? "are" : "is"} in.</>
              ) : (
                <>Hi {name}.<br />Let's get providers <GradText>competing for you.</GradText></>
              )
            ) : (
              <>Welcome back.<br />Let's get providers <GradText>competing for you.</GradText></>
            )
          }
          subline={
            !readyToRequest
              ? "Finish your profile to unlock competitive offers from providers."
              : activeRequests > 0
              ? "Your requests are live and providers are bidding. Track them below."
              : "Post what you need and let providers come to you with their best rates."
          }
          actions={
            <>
              <HeroButton onClick={() => navigate(readyToRequest ? "/requests/new" : "/onboarding/kyc")}>
                {readyToRequest ? "New request" : "Complete profile"}
              </HeroButton>
              <HeroButton variant="ghost" onClick={() => navigate("/markets")}>View markets</HeroButton>
            </>
          }
          stats={heroStats}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">

        {profile && (
          <OnboardingBanners kycVerified={kycVerified} hasDossier={hasDossier} />
        )}

        {/* 1 — Live offers (highest priority when bids exist) */}
        {requests.some(r => r.status === "open") && (
          <ErrorBoundary name="Live Offers">
            <LiveOffersSection />
          </ErrorBoundary>
        )}

        {/* 2 — Post a need */}
        <ErrorBoundary name="Planning">
          <WhatAreYouPlanningSection />
        </ErrorBoundary>

        {/* 2 — Active requests */}
        {requests.length > 0 && (() => {
          const FILTERS = [
            { key: "open",     label: "Open"     },
            { key: "accepted", label: "Accepted" },
            { key: "closed",   label: "Closed"   },
          ] as const;
          const filtered = requests.filter(r => r.status === requestFilter);
          return (
            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h2 className="font-display text-[20px] sm:text-[24px] font-bold text-ink leading-tight">
                    Your Active <span className="text-ficium">Requests</span>
                  </h2>
                </div>
                <Link to="/requests" className="text-[12px] sm:text-[13px] text-muted font-semibold no-underline hover:text-ink pb-1 flex-shrink-0 ml-4">
                  View all →
                </Link>
              </div>
              {/* Filter pills — segmented control */}
              <div className="flex items-center gap-2 mb-4 p-1 bg-ink/[0.04] rounded-[16px] w-fit">
                {FILTERS.map(f => {
                  const count = requests.filter(r => r.status === f.key).length;
                  const active = requestFilter === f.key;
                  const META = {
                    open:     { dot: "#356EF4", activeBg: "linear-gradient(135deg,#356EF4,#8231EC)" },
                    accepted: { dot: "#10b981", activeBg: "linear-gradient(135deg,#059669,#10b981)" },
                    closed:   { dot: "#9ca3af", activeBg: "linear-gradient(135deg,#4b5563,#9ca3af)" },
                  } as const;
                  const m = META[f.key];
                  return (
                    <button
                      key={f.key}
                      onClick={() => setRequestFilter(f.key)}
                      className="flex items-center gap-2 px-4 py-2 rounded-[12px] transition-all duration-200 font-semibold text-[13px]"
                      style={
                        active
                          ? { background: m.activeBg, color: "#fff", boxShadow: "0 2px 8px rgba(53,110,244,0.25)" }
                          : { background: "transparent", color: "#6b7280" }
                      }
                    >
                      {!active && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.dot, opacity: 0.5 }} />}
                      {f.label}
                      {count > 0 && (
                        <span
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                          style={active ? { background: "rgba(255,255,255,0.25)", color: "#fff" } : { background: "rgba(0,0,0,0.08)", color: "#374151" }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filtered.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
                  {filtered.map(r => (
                    <div key={r.id} className="flex-shrink-0 w-[260px]">
                      <ActiveRequestCard request={r} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted py-3">No {requestFilter} requests.</p>
              )}
            </div>
          );
        })()}

        {/* 3 — Net Worth + Financial Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Net Worth — all real data */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink/[0.05]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Net Worth</span>
                <span className="text-[10px] font-bold bg-ink/[0.06] text-muted px-2 py-0.5 rounded-pill">MUR</span>
              </div>
              <button
                onClick={() => navigate("/networth")}
                className="text-[11px] font-semibold text-ficium hover:underline"
              >
                View breakdown →
              </button>
            </div>
            <NetWorthHero
              netWorth={netWorth ?? 0}
              hidden={hidden}
              onToggle={() => setHidden((h) => !h)}
            />
            <div className="grid grid-cols-2 divide-x divide-ink/[0.05] border-t border-ink/[0.05]">
              {[
                { label: "Assets",      value: totalAssets > 0 ? `Rs ${formatAmount(totalAssets)}` : "—" },
                { label: "Liabilities", value: totalLiabs  > 0 ? `Rs ${formatAmount(totalLiabs)}`  : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3">
                  <div className="text-[10px] text-muted font-semibold mb-0.5">{label}</div>
                  <div className="text-[12px] sm:text-[13px] font-bold text-ink">{value}</div>
                </div>
              ))}
            </div>
            {totalAssets === 0 && (
              <div className="px-5 py-3 border-t border-ink/[0.05]">
                <button onClick={() => navigate("/networth")}
                  className="text-[12px] text-ficium font-semibold hover:underline">
                  + Add your assets &amp; liabilities to see real numbers
                </button>
              </div>
            )}
          </div>

          {/* Financial Health — real score */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink/[0.05]">
              <span className="font-display text-[15px] font-bold text-ink">Financial Health</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold" style={{ color: hl.color }}>{hl.label}</span>
                <button onClick={() => navigate("/health")}
                  className="text-[11px] font-semibold text-ficium hover:underline">
                  Full report →
                </button>
              </div>
            </div>
            <div className="p-4">
              <FlipCards
                loading={loading}
                healthScore={profile?.healthScore ?? null}
                bankReadiness={bankReadiness ?? null}
                activeRequests={activeRequests}
                totalNewBids={unreadCount}
                flipped={flipped}
                onFlip={flip}
              />
              {/* Dynamic encouragement based on real score */}
              <div className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2.5"
                   style={{ background: "rgba(42,31,230,0.04)", border: "1px solid rgba(42,31,230,0.10)" }}>
                <span className="text-[18px]">
                  {(profile?.healthScore ?? 0) >= 70 ? "✨" : (profile?.healthScore ?? 0) >= 50 ? "📈" : "💡"}
                </span>
                <span className="text-[12px] sm:text-[13px] text-ink/80 font-medium leading-snug">
                  {(profile?.healthScore ?? 0) >= 70
                    ? "Great financial health — you qualify for competitive provider offers."
                    : (profile?.healthScore ?? 0) >= 50
                    ? "Good progress — completing your profile will unlock better rates."
                    : profile?.healthScore == null
                    ? "Complete your financial profile to get your health score."
                    : "Focus on reducing liabilities to improve your eligibility."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 — Smart Insights */}
        <ErrorBoundary name="Smart Insights">
          <SmartInsightsFeed insights={insights} activeIdx={activeIdx} onNext={next} />
        </ErrorBoundary>

        {/* 5 — Banks Compete */}
        <div>
          <SectionHeader
            eyebrow="Marketplace"
            title="Providers compete"
            highlight="for you"
            action={{ label: "View all offers →", to: "/requests" }}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MarketTile icon={<HandCoins size={18} />} label="Personal Loan"  title="Loans that compete for you"   metric="Best rate"    metricValue="8.2% from 6 providers"      bg="bg-ficium"      href="/requests/new" />
            <MarketTile icon={<CreditCard size={18} />} label="Credit Card"   title="Card offers tailored to you"  metric="Top cashback" metricValue="3.5% from 4 providers"      bg="bg-violet-600"  href="/requests/new" />
            <MarketTile icon={<PiggyBank size={18} />}  label="Deposit"       title="Deposits with real yield"     metric="Top yield"    metricValue="5.4% from 3 providers"      bg="bg-amber-400"   dark href="/requests/new" />
            <MarketTile icon={<LineChart size={18} />}  label="Wealth"        title="Investments that find you"    metric="Fee saving"   metricValue="0.4% potential saving"      bg="bg-emerald-400" dark href="/requests/new" />
          </div>
        </div>

        {/* 7 — Tools */}
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

const TOOLS = [
  { icon: <Calculator  size={20} className="text-ficium"      />, bg: "bg-ficium/10",  title: "Loan Calculator",      desc: "Estimate your monthly repayments", to: "/tools#credit"     },
  { icon: <LineChart   size={20} className="text-emerald-600" />, bg: "bg-emerald-50", title: "Investment Calculator", desc: "Project your future wealth",       to: "/tools#investment" },
  { icon: <Wallet      size={20} className="text-amber-600"   />, bg: "bg-amber-50",   title: "Affordability Check",  desc: "Find what you can afford",         to: "/networth"         },
  { icon: <ShieldCheck size={20} className="text-violet-600"  />, bg: "bg-violet-50",  title: "Debt Analyser",        desc: "Understand your debt better",      to: "/health"           },
];
