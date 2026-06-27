// =============================================================
// Ficium — Requests page (/requests)
// 2026 revamp: storytelling Hero + shared dashboard kit.
// Activity feed wired to real notifications DB.
// Best rate computed from live bids.
// =============================================================
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, FileText, ArrowRight, ChevronRight, Zap, Bell,
} from "lucide-react";
import { useMyRequests, useBankReadiness } from "../../dashboard/hooks/useDashboard";
import { useNotifications } from "@/individual/alerts/hooks/useAlerts";
import { timeAgo } from "@/individual/alerts/api/notifications";
import type { NotificationKind } from "@/individual/alerts/api/notifications";
import { ActiveRequestCard } from "@/individual/requests/components/ActiveRequestCard";
import { BottomNav, CardScroller } from "@/shared/ui";
import {
  Hero, HeroButton, GradText, type HeroStat,
  Reveal, SectionHead, Panel, PanelHead, Feed, FeedItem, DarkCallout,
} from "@/shared/ui/dashboard";

// Map notification kind → Feed tone
const KIND_TONE: Record<NotificationKind, "good" | "warn" | "bad" | "blue" | "violet"> = {
  kyc_verified:     "good",
  kyc_rejected:     "bad",
  request_created:  "blue",
  request_expiring: "warn",
  bid_received:     "violet",
  bid_accepted:     "good",
  bid_expired:      "warn",
  system:           "blue",
};

export default function Requests() {
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useMyRequests();
  const { score: readiness } = useBankReadiness();
  const { data: notifications = [] } = useNotifications();

  const openRequests  = requests.filter(r => r.status === "open");
  const totalOffers   = requests.reduce((s, r) => s + r.bidCount, 0);

  // Compute best rate from real bids across all requests
  const bestRate = requests.reduce<number | null>((best, r) => {
    if (r.bestRate === null) return best;
    const rate = r.bestRate > 1 ? r.bestRate : r.bestRate * 100; // normalise decimal vs percent
    if (best === null || rate < best) return rate;
    return best;
  }, null);

  const heroStats: HeroStat[] = [
    { label: "Active requests",    value: openRequests.length },
    { label: "Providers offering", value: totalOffers, trend: totalOffers > 0 ? "live" : undefined, trendTone: "good" },
    ...(bestRate !== null
      ? [{ label: "Best rate", value: bestRate, decimals: 2, suffix: "%" } as HeroStat]
      : [{ label: "Best rate", display: "—" } as HeroStat]),
    { label: "Readiness",          value: readiness ?? 72, suffix: "%" },
  ];

  const empty = !isLoading && requests.length === 0;

  return (
    <div className="min-h-screen bg-paper pb-28 lg:pb-10">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pt-4">

        <Hero
          eyebrow="YOUR MARKETPLACE"
          live={totalOffers > 0}
          headline={
            totalOffers > 0
              ? <>Providers are <GradText>competing for you.</GradText></>
              : <>Post a need.<br /><GradText>Let providers compete.</GradText></>
          }
          subline="You post what you need — banks, fintechs and insurers come to you with their best rates."
          actions={
            <>
              <HeroButton onClick={() => navigate("/requests/new")}>Post a need</HeroButton>
              <HeroButton variant="ghost" onClick={() => navigate("/markets")}>Market rates</HeroButton>
            </>
          }
          stats={heroStats}
        />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-10">

          {/* Card scroller */}
          {/* min-w-0: without it, this grid item defaults to min-width:auto
              and expands to fit the request-cards row's full content width,
              blowing out the 1fr column (and the whole grid) instead of
              containing the row — which silently breaks both the bounded
              scroll container and the visible sidebar next to it. */}
          <Reveal className="min-w-0">
            <SectionHead
              title="Your requests"
              subtitle="Live requests — providers bid on each"
              to="/requests/new"
              toLabel="Post a need"
            />

            {isLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[1,2,3].map(i => <div key={i} className="flex-shrink-0 w-[260px] bg-white rounded-card h-[440px] animate-pulse border border-line" />)}
              </div>
            ) : empty ? (
              <Panel className="text-center py-12">
                <div className="w-16 h-16 rounded-[22px] bg-ficium/10 text-ficium grid place-items-center mx-auto mb-4">
                  <FileText size={28} />
                </div>
                <div className="font-display text-[22px] font-bold mb-2 text-ink">No requests yet</div>
                <p className="text-[14px] text-muted mb-6 max-w-[300px] mx-auto leading-relaxed">
                  Post your financing need and let providers compete for you.
                </p>
                <HeroButton onClick={() => navigate("/requests/new")}>Post a need</HeroButton>
              </Panel>
            ) : (
              <CardScroller className="gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">

                {/* DB request cards */}
                {requests.map(r => (
                  <div key={r.id} className="flex-shrink-0 w-[260px]">
                    <ActiveRequestCard request={r} />
                  </div>
                ))}

                {/* Post new card */}
                <div className="flex-shrink-0 w-[200px]">
                  <button
                    onClick={() => navigate("/requests/new")}
                    className="bg-white rounded-card border-2 border-dashed border-line w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-3 hover:border-ficium/40 hover:bg-ficium/[0.02] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full grid place-items-center shadow-ficium group-hover:scale-110 transition-transform"
                         style={{ background: "linear-gradient(135deg,#356EF4,#8231EC)" }}>
                      <Plus size={22} className="text-white" />
                    </div>
                    <span className="text-[12px] font-bold text-ink text-center px-4">Post New Request</span>
                  </button>
                </div>
              </CardScroller>
            )}
          </Reveal>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">

            <Reveal delay={80}>
              <Panel className="!p-6">
                <PanelHead
                  title="Activity"
                  subtitle="Latest across your requests"
                  action={<span className="w-2 h-2 rounded-full bg-good animate-pulse-ring-green" aria-hidden />}
                />
                {notifications.length === 0 ? (
                  <p className="text-[13px] text-muted text-center py-6">No activity yet.</p>
                ) : (
                  <Feed>
                    {notifications.slice(0, 6).map((n, i) => (
                      <FeedItem
                        key={n.id}
                        tone={KIND_TONE[n.kind] ?? "blue"}
                        title={n.title}
                        time={timeAgo(n.createdAt)}
                        last={i === Math.min(notifications.length, 6) - 1}
                      />
                    ))}
                  </Feed>
                )}
              </Panel>
            </Reveal>

            <Reveal delay={160}>
              <DarkCallout
                title="Your profile is strong."
                body="Based on your financial profile, you're likely to receive competitive offers within 24 hours of posting."
                action={
                  <div className="w-full">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-2 bg-white/10 rounded-pill overflow-hidden">
                        <div className="h-2 rounded-pill" style={{ width: `${readiness ?? 72}%`, background: "linear-gradient(90deg,#356EF4,#8231EC)" }} />
                      </div>
                      <span className="text-[13px] font-bold text-white">{readiness ?? 72}%</span>
                    </div>
                    <Link
                      to="/advisor"
                      className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-[13px] font-bold px-4 py-3 rounded-xl no-underline"
                    >
                      Open AI analysis <ArrowRight size={13} />
                    </Link>
                  </div>
                }
              />
            </Reveal>

            <Reveal delay={240}>
              <Panel className="!p-5">
                <div className="font-display text-[16px] font-bold mb-3 text-ink">Quick actions</div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Update financial profile", to: "/onboarding/dossier", icon: FileText },
                    { label: "Check notifications",      to: "/alerts",             icon: Bell    },
                    { label: "View market rates",        to: "/markets",            icon: Zap     },
                  ].map(q => (
                    <Link key={q.label} to={q.to} className="no-underline flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink/[0.04] transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-ficium/10 grid place-items-center flex-shrink-0">
                        <q.icon size={14} className="text-ficium" />
                      </div>
                      <span className="text-[13px] font-semibold text-ink/80">{q.label}</span>
                      <ChevronRight size={13} className="text-muted ml-auto group-hover:text-ink transition-colors" />
                    </Link>
                  ))}
                </div>
              </Panel>
            </Reveal>

          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
