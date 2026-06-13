// =============================================================
// Ficium — Requests page (/requests)
// 2026 revamp: storytelling Hero + shared dashboard kit.
// Core content (goal/request card scroller) and data wiring preserved.
// NOTE: the Activity feed still renders MOCK_ACTIVITY — pre-existing
// placeholder, not yet wired to a real source.
// =============================================================
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Target, Building2, FileText,
  ArrowRight, ChevronRight, Zap, Bell,
  Home, Car, Plane, TrendingUp as TrendUp, GraduationCap, Briefcase, PiggyBank,
} from "lucide-react";
import { useGoals, goalProgress, type Goal, type GoalType } from "@/individual/dashboard/hooks/useGoals";
import { useMyRequests, useBankReadiness } from "../../dashboard/hooks/useDashboard";
import { ActiveRequestCard } from "@/individual/requests/components/ActiveRequestCard";
import { BottomNav } from "@/shared/ui";
import {
  Hero, HeroButton, GradText, type HeroStat,
  Reveal, SectionHead, Panel, PanelHead, Feed, FeedItem, DarkCallout, Tag,
} from "@/shared/ui/dashboard";

/* ── Goal card styles ── */
const GOAL_STYLE: Record<GoalType, { icon: React.ElementType; imgFrom: string; imgTo: string }> = {
  mortgage:   { icon: Home,          imgFrom: "#c47b2b", imgTo: "#7a4a1e" },
  vehicle:    { icon: Car,           imgFrom: "#4b5563", imgTo: "#1f2937" },
  personal:   { icon: Plane,         imgFrom: "#0ea5e9", imgTo: "#0369a1" },
  investment: { icon: TrendUp,       imgFrom: "#0f0c29", imgTo: "#2A1FE6" },
  education:  { icon: GraduationCap, imgFrom: "#059669", imgTo: "#065f46" },
  business:   { icon: Briefcase,     imgFrom: "#7c3aed", imgTo: "#4c1d95" },
  savings:    { icon: PiggyBank,     imgFrom: "#d97706", imgTo: "#92400e" },
  other:      { icon: Target,        imgFrom: "#6b7280", imgTo: "#374151" },
};

const STATUS_TONE: Record<Goal["status"], "green" | "amber" | "blue"> = {
  "on-track":        "green",
  "needs-attention": "amber",
  "ahead":           "blue",
};
const STATUS_LABEL: Record<Goal["status"], string> = {
  "on-track":        "On track",
  "needs-attention": "Needs attention",
  "ahead":           "Ahead",
};

// Pre-existing placeholder — not yet wired to a real activity source.
const MOCK_ACTIVITY = [
  { id: 1, text: "MCB submitted a new offer on your Personal Loan", time: "2 mins ago", tone: "violet" as const },
  { id: 2, text: "SBM reviewed your application",                   time: "1 hour ago", tone: "warn"   as const },
  { id: 3, text: "Your request entered bidding stage",              time: "Today, 09:14", tone: "good"  as const },
  { id: 4, text: "ABSA placed a competitive offer",                 time: "Yesterday",  tone: "blue"   as const },
];

export default function Requests() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: requests = [], isLoading: reqLoading } = useMyRequests();
  const { score: readiness } = useBankReadiness();

  const isLoading     = goalsLoading || reqLoading;
  const openRequests  = requests.filter(r => r.status === "open");
  const totalOffers   = requests.reduce((s, r) => s + r.bidCount, 0);

  const fmt = (n: number) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

  const heroStats: HeroStat[] = [
    { label: "Active requests",    value: openRequests.length },
    { label: "Providers offering", value: totalOffers, trend: totalOffers > 0 ? "live" : undefined, trendTone: "good" },
    { label: "Best rate",          value: 8.2, decimals: 1, suffix: "%" },
    { label: "Readiness",          value: readiness ?? 72, suffix: "%" },
  ];

  const empty = !isLoading && goals.length === 0 && requests.length === 0;

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
          <Reveal>
            <SectionHead
              title="Your requests"
              subtitle="Goals and live requests — providers bid on each"
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
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">

                {/* Goal cards */}
                {goals.map(g => {
                  const style = GOAL_STYLE[g.type] ?? GOAL_STYLE.other;
                  const Icon  = style.icon;
                  const pct   = goalProgress(g);
                  const typeMap: Record<string, string> = {
                    mortgage: "mortgage", vehicle: "vehicle", personal: "personal",
                    investment: "savings", education: "education", business: "business",
                    savings: "deposit", other: "personal",
                  };
                  return (
                    <div key={g.id} className="flex-shrink-0 w-[260px]">
                      <div
                        onClick={() => navigate(`/requests/new?type=${typeMap[g.type] ?? "personal"}`)}
                        className="bg-white rounded-card border border-line shadow-card overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-1 transition-all duration-300 ease-swift h-full"
                      >
                        <div className="h-[140px] flex items-center justify-center"
                             style={{ background: `linear-gradient(135deg, ${style.imgFrom}, ${style.imgTo})` }}>
                          <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center">
                            <Icon size={28} className="text-white" />
                          </div>
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                          <div className="font-bold text-[13px] text-ink">{g.title}</div>
                          <div className="font-display text-[28px] font-extrabold text-ficium leading-none tracking-display">
                            {pct}<span className="text-[13px] font-semibold text-muted ml-0.5">%</span>
                          </div>
                          <div className="h-[3px] bg-line rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#356EF4,#8231EC)" }} />
                          </div>
                          <div className="text-[11px] text-ink/70 font-semibold">{fmt(g.savedAmount)} / {fmt(g.targetAmount)}</div>
                          <span className="self-start"><Tag tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</Tag></span>
                          <div className="text-[10px] font-bold text-ficium flex items-center gap-1">
                            <Building2 size={10} /> {g.banksReady} providers ready
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/requests/new?type=${typeMap[g.type] ?? "personal"}`); }}
                            className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white mt-1 transition-transform active:scale-[.98]"
                            style={{ background: "linear-gradient(92deg,#1E6CF5,#7C3AED 90%)" }}
                          >
                            Post a request →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

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
              </div>
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
                <Feed>
                  {MOCK_ACTIVITY.map((a, i) => (
                    <FeedItem
                      key={a.id}
                      tone={a.tone}
                      title={a.text}
                      time={a.time}
                      last={i === MOCK_ACTIVITY.length - 1}
                    />
                  ))}
                </Feed>
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
