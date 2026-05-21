import { Link, useNavigate } from "react-router-dom";
import {
  Plus, LogOut, FileText, Activity, ShieldAlert,
  Sparkles, BookOpen, ChevronRight, TrendingUp, Zap,
} from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import {
  useProfile, useMyRequests, useNextActions,
  useBankReadiness, useHealthRecommendations,
} from "../hooks/useDashboard";
import { formatMUR, formatProductType } from "../api/profile";
import type { RequestSummary, NextAction } from "../api/profile";
import { Card, BottomNav } from "../../../shared/ui";

/* ============================================================
   PAGE
   ============================================================ */

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8 flex flex-col gap-5">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-ficium text-white grid place-items-center font-bold text-lg">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">{greeting},</div>
              <div className="text-base font-semibold truncate">
                {profile?.firstName ?? profile?.fullName ?? "there"}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {/* ── BANNERS ── */}
        {profile && !kycVerified && (
          <div className="flex items-start gap-3 px-4 py-3 bg-accent/20 border border-accent/40 rounded-xl">
            <ShieldAlert size={18} className="text-ink mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Finish verifying your identity</div>
              <div className="text-[13px] text-muted mt-0.5">Banks can't bid until KYC is complete.</div>
            </div>
            <Link to="/onboarding/kyc" className="text-sm font-semibold text-ficium no-underline flex-shrink-0">
              Resume →
            </Link>
          </div>
        )}
        {profile && kycVerified && !hasDossier && (
          <div className="flex items-start gap-3 px-4 py-3 bg-ficium/[0.06] border border-ficium/20 rounded-xl">
            <BookOpen size={18} className="text-ficium mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Complete your financial profile</div>
              <div className="text-[13px] text-muted mt-0.5">Banks need this to bid accurately.</div>
            </div>
            <Link to="/onboarding/dossier" className="text-sm font-semibold text-ficium no-underline flex-shrink-0">
              Start →
            </Link>
          </div>
        )}

        {/* ── SCORE TILES ── */}
        <div className="grid grid-cols-3 gap-3">
          <ScoreTile
            label="Health"
            value={loading ? null : profile?.healthScore ?? null}
            icon={<Activity size={16} />}
            color="ficium"
            suffix="/100"
          />
          <ScoreTile
            label="Bank Readiness"
            value={loading ? null : bankReadiness}
            icon={<Zap size={16} />}
            color="mint"
            suffix="%"
          />
          <ScoreTile
            label="Requests"
            value={loading ? null : activeRequests}
            icon={<FileText size={16} />}
            color="neutral"
            badge={totalNewBids > 0 ? `${totalNewBids} bids` : undefined}
          />
        </div>

        {/* ── HEALTH INSIGHTS ── */}
        {recommendations.length > 0 && profile?.completion.financialProfileDone && (
          <HealthInsights score={profile?.healthScore ?? null} recommendations={recommendations} />
        )}

        {/* ── NEXT ACTIONS ── */}
        {actions.length > 0 && <NextActions actions={actions} />}

        {/* ── REQUESTS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-bold">Your requests</h2>
            {requests.length > 0 && (
              <Link to="/requests" className="text-sm text-ficium font-semibold no-underline flex items-center gap-0.5">
                See all <ChevronRight size={14} />
              </Link>
            )}
          </div>
          {loading ? <SkeletonRequests /> : requests.length === 0 ? (
            <EmptyState kycVerified={kycVerified} hasDossier={hasDossier} />
          ) : (
            <div className="flex flex-col gap-3">
              {requests.slice(0, 5).map((r) => <RequestCard key={r.id} request={r} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      {readyToRequest && (
        <Link to="/requests/new" className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline">
          <Plus size={18} /> New Request
        </Link>
      )}
      {!readyToRequest && requests.length > 0 && (
        <Link
          to={!kycVerified ? "/onboarding/kyc" : "/onboarding/dossier"}
          className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-accent text-ink px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline"
        >
          <ShieldAlert size={18} /> Complete profile
        </Link>
      )}

      <BottomNav />
    </div>
  );
}

/* ============================================================
   SCORE TILE
   ============================================================ */

function ScoreTile({ label, value, icon, color, suffix, badge }: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  color: "ficium" | "mint" | "neutral";
  suffix?: string;
  badge?: string;
}) {
  const colorMap = {
    ficium: "bg-ficium text-white",
    mint: "bg-mint/20 text-ink",
    neutral: "bg-white text-ink",
  };
  const iconColorMap = {
    ficium: "text-white/80",
    mint: "text-ink/60",
    neutral: "text-muted",
  };

  return (
    <Card padded={false} className={["p-4 flex flex-col gap-1.5 relative overflow-hidden", colorMap[color]].join(" ")}>
      <div className={iconColorMap[color]}>{icon}</div>
      <div className="font-display text-2xl font-bold leading-none">
        {value === null ? "—" : value}
        {suffix && value !== null && (
          <span className="text-sm font-normal opacity-70">{suffix}</span>
        )}
      </div>
      <div className={["text-[11px]", color === "ficium" ? "text-white/70" : "text-muted"].join(" ")}>
        {label}
      </div>
      {badge && (
        <span className="absolute top-2 right-2 bg-ficium text-white text-[9px] font-bold px-1.5 py-0.5 rounded-pill">
          {badge}
        </span>
      )}
    </Card>
  );
}

/* ============================================================
   HEALTH INSIGHTS
   ============================================================ */

function HealthInsights({ score, recommendations }: { score: number | null; recommendations: string[] }) {
  const scoreColor = score === null ? "text-muted"
    : score >= 70 ? "text-green-600"
    : score >= 50 ? "text-amber-600"
    : "text-red-500";

  const scoreLabel = score === null ? "—"
    : score >= 70 ? "Strong"
    : score >= 50 ? "Moderate"
    : "Needs attention";

  const barColor = score === null ? "bg-ink/20"
    : score >= 70 ? "bg-green-500"
    : score >= 50 ? "bg-amber-400"
    : "bg-red-400";

  return (
    <Card padded={false} className="p-4 sm:p-5 border-l-4 border-l-ficium">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-ficium" />
          <span className="font-semibold text-sm">Financial Health Score</span>
        </div>
        <span className={["text-sm font-bold", scoreColor].join(" ")}>{scoreLabel}</span>
      </div>

      {/* Score bar */}
      <div className="relative h-2.5 bg-ink/[0.07] rounded-pill overflow-hidden mb-1">
        <div
          className={["h-full rounded-pill transition-all duration-700", barColor].join(" ")}
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted mb-4">
        <span>0</span>
        <span className="font-semibold text-ink">{score ?? "—"} / 100</span>
        <span>100</span>
      </div>

      {/* Recommendations */}
      <div className="flex flex-col gap-2">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-ficium/[0.04] rounded-lg">
            <TrendingUp size={13} className="text-ficium mt-0.5 flex-shrink-0" />
            <span className="text-[12px] text-ink/80 leading-relaxed">{rec}</span>
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
  const priorityStyles = {
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-ficium/15 bg-ficium/[0.04] text-ficium",
  };
  const dotColor = {
    high: "bg-red-500",
    medium: "bg-amber-400",
    low: "bg-ficium",
  };

  return (
    <Card padded={false} className="p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={15} className="text-ficium" />
        <span className="font-semibold text-sm">Next steps</span>
        <span className="ml-auto text-[11px] font-bold bg-ficium/10 text-ficium px-2 py-0.5 rounded-pill">
          {actions.length} remaining
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <Link key={a.id} to={a.href} className="no-underline group">
            <div className={["flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all hover:shadow-sm", priorityStyles[a.priority]].join(" ")}>
              <div className={["w-2 h-2 rounded-full flex-shrink-0", dotColor[a.priority]].join(" ")} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold leading-snug">{a.label}</div>
                <div className="text-[11px] opacity-70 mt-0.5">{a.description}</div>
              </div>
              <ChevronRight size={15} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
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
          <div className="min-w-0">
            <div className="text-xs text-muted">{formatProductType(request.productType)}</div>
            <div className="font-display text-xl font-bold mt-0.5">{formatMUR(request.amount)}</div>
            <div className="text-xs text-muted mt-1.5">
              {request.bidCount === 0 ? "Awaiting bids…"
                : request.bestRate !== null ? (
                  <>
                    <span className="font-semibold text-ink">
                      {request.bidCount} bid{request.bidCount === 1 ? "" : "s"}
                    </span>
                    <span className="mx-1.5">·</span>
                    Best {request.bestRate.toFixed(2)}% APR
                  </>
                ) : `${request.bidCount} bid${request.bidCount === 1 ? "" : "s"}`}
            </div>
          </div>
          <span className={[
            "text-[11px] font-bold px-2.5 py-1 rounded-pill uppercase tracking-wide flex-shrink-0",
            request.status === "open" ? "bg-mint/30 text-ink"
              : request.status === "accepted" ? "bg-ficium text-white"
              : "bg-ink/10 text-muted",
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
    <Card className="text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-ficium/10 text-ficium grid place-items-center mx-auto mb-4">
        <Sparkles size={24} />
      </div>
      <div className="font-display text-2xl font-bold mb-2">
        {ready ? "Post your first request" : "Complete your profile first"}
      </div>
      <div className="text-sm text-muted mb-6 max-w-[280px] mx-auto">
        {ready
          ? "Tell us what you need. Banks across Mauritius will bid against each other for your business."
          : "Verify your identity and complete your financial profile so banks can bid accurately."}
      </div>
      <Link
        to={ready ? "/requests/new" : !kycVerified ? "/onboarding/kyc" : "/onboarding/dossier"}
        className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-3 rounded-pill text-sm font-semibold no-underline shadow-ficium"
      >
        <Plus size={16} />
        {ready ? "New Request" : !kycVerified ? "Verify identity" : "Complete profile"}
      </Link>
    </Card>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */

function SkeletonRequests() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <Card key={i} padded={false} className="p-4">
          <div className="h-3 w-20 bg-ink/10 rounded mb-2 animate-pulse" />
          <div className="h-6 w-32 bg-ink/10 rounded mb-2 animate-pulse" />
          <div className="h-3 w-40 bg-ink/10 rounded animate-pulse" />
        </Card>
      ))}
    </div>
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