import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Activity, ShieldAlert, Sparkles,
  BookOpen, ChevronRight, TrendingUp, Zap, Bell, Eye, EyeOff,
  HandCoins, Building2, PiggyBank, LineChart,
  FileText, ArrowRight,
} from "lucide-react";
import { useAuth } from "../../../features/auth/context/AuthContext";
import {
  useProfile, useMyRequests, useNextActions,
  useBankReadiness, useHealthRecommendations,
} from "../hooks/useDashboard";
import { formatMUR, formatProductType } from "../api/profile";
import type { RequestSummary, NextAction } from "../api/profile";
import { Card, BottomNav } from "../../../shared/ui";

const SPARK_HEALTH = [30, 35, 32, 40, 38, 44, 46];
const SPARK_NETWORTH = [20, 22, 21, 24, 25, 27, 28];
const SPARK_REQUESTS = [0, 0, 0, 1, 1, 1, 1];

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: requests = [], isLoading: requestsLoading } = useMyRequests();
  const { actions } = useNextActions();
  const { score: bankReadiness } = useBankReadiness();
  const { recommendations } = useHealthRecommendations();

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

      <div className="relative z-10 mx-auto w-full max-w-[640px] px-5">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/15 text-white grid place-items-center font-bold text-lg backdrop-blur-sm border border-white/10">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white/50">{greeting},</div>
              <div className="text-base font-semibold text-white truncate">
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
          <div className="flex items-start gap-3 px-4 py-3 mb-4 bg-amber-500/15 backdrop-blur-sm border border-amber-400/25 rounded-2xl">
            <ShieldAlert size={16} className="text-amber-300 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Finish verifying your identity</div>
              <div className="text-[12px] text-white/50 mt-0.5">Banks can't bid until KYC is complete.</div>
            </div>
            <Link to="/onboarding/kyc" className="text-xs font-bold text-amber-300 no-underline flex-shrink-0">Resume →</Link>
          </div>
        )}
        {profile && kycVerified && !hasDossier && (
          <div className="flex items-start gap-3 px-4 py-3 mb-4 bg-ficium/15 backdrop-blur-sm border border-ficium/25 rounded-2xl">
            <BookOpen size={16} className="text-indigo-300 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Complete your financial profile</div>
              <div className="text-[12px] text-white/50 mt-0.5">Banks need this to bid accurately.</div>
            </div>
            <Link to="/onboarding/dossier" className="text-xs font-bold text-indigo-300 no-underline flex-shrink-0">Start →</Link>
          </div>
        )}

        {/* ── NET WORTH HERO ── */}
        <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden bg-white/[0.08] backdrop-blur-xl border border-white/[0.12]">
          <div className="absolute -right-10 -top-14 w-48 h-48 rounded-full bg-ficium/30 blur-[50px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-white/60 font-medium">Total net worth</span>
                <span className="text-[10px] font-semibold bg-white/10 text-white/70 px-2 py-0.5 rounded-pill">MUR</span>
              </div>
              <button onClick={() => setHidden((h) => !h)} className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 transition-colors">
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-white/50 text-lg font-semibold">Rs</span>
              {hidden ? (
                <span className="text-white/50 text-4xl font-extrabold tracking-wide">•• •• ••</span>
              ) : (
                <span className="text-white text-4xl font-extrabold tracking-tight">{formatAmount(netWorth)}</span>
              )}
            </div>
            {!hidden && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 px-2.5 py-1 rounded-pill text-[11px] font-bold">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 text-emerald-900 grid place-items-center text-[8px] font-black">↑</span>
                  +1.7%
                </span>
                <span className="text-[11px] text-white/40">this month</span>
              </div>
            )}
          </div>
          {/* Sparkline */}
          <div className="absolute right-4 bottom-3 w-28 h-9 opacity-60">
            <MiniSparkline points={SPARK_NETWORTH} color="#9CE5C0" />
          </div>
        </div>

        {/* ── FLIP CARDS ── */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {/* Health */}
          <div className="cursor-pointer" onClick={() => flip("health")} style={{ perspective: "800px" }}>
            <div className={["relative transition-transform duration-500", flipped.health ? "[transform:rotateY(180deg)]" : ""].join(" ")} style={{ transformStyle: "preserve-3d", minHeight: "165px" }}>
              {/* Front */}
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
                <div className="font-display text-[26px] font-extrabold text-white leading-none">
                  {loading ? "—" : profile?.healthScore ?? "—"}
                  <span className="text-[11px] font-semibold text-white/40 ml-0.5">/100</span>
                </div>
                <div className="text-[10px] text-white/50 font-semibold mt-1">Financial Health</div>
                <div className="mt-auto -mx-3.5 -mb-3.5">
                  <MiniSparkline points={SPARK_HEALTH} color="#dc2626" />
                </div>
              </div>
              {/* Back */}
              <div className="absolute inset-0 rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col justify-center gap-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div><div className="text-[15px] font-extrabold text-red-400">↓ 3 pts</div><div className="text-[9px] text-white/40 font-semibold">vs last month</div></div>
                <div className="h-px bg-white/10" />
                <div><div className="text-[15px] font-extrabold text-white">2 flags</div><div className="text-[9px] text-white/40 font-semibold">need action</div></div>
              </div>
            </div>
          </div>

          {/* Net Worth tile */}
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
                <div className="font-display text-[26px] font-extrabold text-white leading-none">
                  {loading ? "—" : bankReadiness ?? "—"}
                  <span className="text-[11px] font-semibold text-white/40 ml-0.5">%</span>
                </div>
                <div className="text-[10px] text-white/50 font-semibold mt-1">Readiness</div>
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
                <div className="font-display text-[26px] font-extrabold text-white leading-none">
                  {loading ? "—" : activeRequests}
                  <span className="text-[11px] font-semibold text-white/40 ml-1">active</span>
                </div>
                <div className="text-[10px] text-white/50 font-semibold mt-1">Requests</div>
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

        {/* ═══════ CREAM ZONE (below gradient) ═══════ */}

        {/* ── I NEED SECTION ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/requests/new" className="no-underline group">
            <div className="bg-white rounded-2xl border border-ink/[0.06] p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-xl bg-ficium/10 grid place-items-center mb-3">
                <HandCoins size={18} className="text-ficium" />
              </div>
              <div className="text-[12px] text-muted font-medium mb-1">I need a</div>
              <div className="font-display text-[15px] font-bold text-ink leading-tight">Credit facility</div>
              <div className="flex items-center gap-1 mt-2.5 text-[11px] text-ficium font-semibold">
                Get offers <ArrowRight size={11} />
              </div>
            </div>
          </Link>
          <Link to="/requests/new" className="no-underline group">
            <div className="bg-white rounded-2xl border border-ink/[0.06] p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 grid place-items-center mb-3">
                <TrendingUp size={18} className="text-amber-600" />
              </div>
              <div className="text-[12px] text-muted font-medium mb-1">I need an</div>
              <div className="font-display text-[15px] font-bold text-ink leading-tight">Investment</div>
              <div className="flex items-center gap-1 mt-2.5 text-[11px] text-amber-600 font-semibold">
                Get offers <ArrowRight size={11} />
              </div>
            </div>
          </Link>
        </div>

        {/* ── BANKS COMPETE FOR YOU ── */}
        <div className="mb-6">
          <div className="flex items-end justify-between mb-3.5">
            <h2 className="font-display text-xl font-bold">Banks compete for <span className="text-ficium">you</span></h2>
            <Link to="/requests" className="text-[12px] text-muted font-semibold no-underline flex items-center gap-0.5 hover:text-ink transition-colors">
              All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <MarketTile
              icon={<HandCoins size={17} />}
              label="Personal"
              title="Loans that compete for you"
              metric="Best rate"
              metricValue="8.2%"
              bg="bg-ficium"
              href="/requests/new"
            />
            <MarketTile
              icon={<Building2 size={17} />}
              label="Business"
              title="SME funding, on demand"
              metric="Best rate"
              metricValue="7.9%"
              bg="bg-ink"
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

        {/* ── FINANCIAL HEALTH ── */}
        {recommendations.length > 0 && profile?.completion.financialProfileDone && (
          <HealthInsights score={profile?.healthScore ?? null} recommendations={recommendations} />
        )}

        {/* ── YOUR REQUESTS ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Your requests</h2>
            {requests.length > 0 && (
              <Link to="/requests" className="text-[12px] text-ficium font-semibold no-underline flex items-center gap-0.5">
                See all <ChevronRight size={12} />
              </Link>
            )}
          </div>
          {loading ? <SkeletonRequests /> : requests.length === 0 ? (
            <EmptyState kycVerified={kycVerified} hasDossier={hasDossier} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {requests.slice(0, 5).map((r) => <RequestCard key={r.id} request={r} />)}
            </div>
          )}
        </div>

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
   MINI SPARKLINE (used in hero + flip cards)
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
      <div className={[bg, txt, "rounded-[20px] p-4 min-h-[170px] flex flex-col relative overflow-hidden hover:-translate-y-0.5 transition-transform"].join(" ")}>
        <div className={["w-9 h-9 rounded-xl grid place-items-center mb-3", dark ? "bg-black/10" : "bg-white/15"].join(" ")}>{icon}</div>
        <div className={["text-[9px] font-bold uppercase tracking-widest absolute top-4 right-4 px-2 py-1 rounded-pill", dark ? "bg-black/10" : "bg-white/15"].join(" ")}>{label}</div>
        <div className="font-display text-[15px] font-bold leading-tight flex-1">{title}</div>
        <div className={["h-px my-3", dark ? "bg-black/10" : "bg-white/15"].join(" ")} />
        <div>
          <div className={["text-[9px] uppercase tracking-widest font-bold mb-0.5", sub].join(" ")}>{metric}</div>
          <div className="font-display text-lg font-extrabold">{metricValue}</div>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   HEALTH INSIGHTS
   ============================================================ */

function HealthInsights({ score, recommendations }: { score: number | null; recommendations: string[] }) {
  const color = score == null ? "text-muted" : score >= 70 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-500";
  const label = score == null ? "—" : score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Needs attention";
  const bar = score == null ? "bg-ink/20" : score >= 70 ? "bg-green-500" : score >= 50 ? "bg-amber-400" : "bg-red-400";

  return (
    <Card padded={false} className="p-4 sm:p-5 border-l-[3px] border-l-ficium mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-ficium" />
          <span className="font-semibold text-sm">Financial health</span>
        </div>
        <span className={["text-sm font-bold", color].join(" ")}>{label}</span>
      </div>
      <div className="h-2 bg-ink/[0.07] rounded-pill overflow-hidden mb-1">
        <div className={["h-full rounded-pill transition-all duration-700", bar].join(" ")} style={{ width: `${score ?? 0}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted mb-4">
        <span>Risk</span>
        <span className="font-semibold text-ink">{score ?? "—"} / 100</span>
        <span>Strong</span>
      </div>
      <div className="flex flex-col gap-2">
        {recommendations.map((r, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-ficium/[0.04] rounded-lg">
            <TrendingUp size={12} className="text-ficium mt-0.5 flex-shrink-0" />
            <span className="text-[12px] text-ink/80 leading-relaxed">{r}</span>
          </div>
        ))}
      </div>
    </Card>
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
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-ficium" />
        <span className="font-semibold text-sm">Next steps</span>
        <span className="ml-auto text-[10px] font-bold bg-ficium/10 text-ficium px-2 py-0.5 rounded-pill">{actions.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <Link key={a.id} to={a.href} className="no-underline group">
            <div className={["flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all hover:shadow-sm", ps[a.priority]].join(" ")}>
              <div className={["w-2 h-2 rounded-full flex-shrink-0", dc[a.priority]].join(" ")} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold leading-snug">{a.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{a.description}</div>
              </div>
              <ChevronRight size={14} className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   REQUEST CARD
   ============================================================ */

function RequestCard({ request }: { request: RequestSummary }) {
  return (
    <Link to={`/requests/${request.id}`} className="no-underline">
      <Card padded={false} className="p-4 hover:border-ink/20 transition-colors cursor-pointer">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-ficium/10 text-ficium grid place-items-center flex-shrink-0">
              <FileText size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-muted font-medium">{formatProductType(request.productType)}</div>
              <div className="font-display text-lg font-bold mt-0.5">{formatMUR(request.amount)}</div>
            </div>
          </div>
          <span className={[
            "text-[10px] font-bold px-2.5 py-1 rounded-pill uppercase tracking-wide flex-shrink-0",
            request.status === "open" ? "bg-emerald-50 text-emerald-700" : request.status === "accepted" ? "bg-ficium text-white" : "bg-ink/10 text-muted",
          ].join(" ")}>
            {request.status}
          </span>
        </div>
      </Card>
    </Link>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({ kycVerified, hasDossier }: { kycVerified: boolean; hasDossier: boolean }) {
  const ready = kycVerified && hasDossier;
  return (
    <Card className="text-center py-8">
      <div className="w-12 h-12 rounded-2xl bg-ficium/10 text-ficium grid place-items-center mx-auto mb-3">
        <Sparkles size={20} />
      </div>
      <div className="font-display text-lg font-bold mb-1.5">
        {ready ? "Post your first request" : "Complete your profile first"}
      </div>
      <div className="text-[12px] text-muted mb-5 max-w-[260px] mx-auto">
        {ready ? "Banks across Mauritius will bid against each other for your business." : "Verify your identity and financial profile so banks can bid."}
      </div>
      <Link to={ready ? "/requests/new" : !kycVerified ? "/onboarding/kyc" : "/onboarding/dossier"}
        className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-2.5 rounded-pill text-sm font-semibold no-underline shadow-ficium">
        <Plus size={14} />
        {ready ? "New Request" : !kycVerified ? "Verify identity" : "Complete profile"}
      </Link>
    </Card>
  );
}

function SkeletonRequests() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((i) => (
        <Card key={i} padded={false} className="p-4">
          <div className="h-3 w-20 bg-ink/10 rounded mb-2 animate-pulse" />
          <div className="h-5 w-32 bg-ink/10 rounded animate-pulse" />
        </Card>
      ))}
    </div>
  );
}

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