import { Link, useNavigate } from "react-router-dom";
import {
  Plus, LogOut, FileText, Activity, ShieldAlert, Sparkles,
  BookOpen, ChevronRight, CheckCircle2, Circle, TrendingUp,
  ArrowUpRight, Zap,
} from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { useProfile, useMyRequests, useNextActions, useBankReadiness, useHealthRecommendations } from "../hooks/useDashboard";
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

        {/* ── PROFILE COMPLETION RING ── */}
        {!profileLoading && (
          <CompletionRing percent={profile?.completion.percent ?? 20} profile={profile} />
        )}

        {/* ── ALERT BANNERS ── */}
        {profile && !kycVerified && (
          <div className="flex items-start gap-3 px-4 py-3 bg-accent/20 border border-accent/40 rounded-xl">
            <ShieldAlert size={18} className="text-ink mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Finish verifying your identity</div>
              <div className="text-[13px] text-muted mt-0.5">Banks can't bid until KYC is complete.</div>
            </div>
            <Link to="/onboarding/kyc" className="text-sm font-semibold text-ficium no-underline flex-shrink-0">Resume →</Link>
          </div>
        )}
        {profile && kycVerified && !hasDossier && (
          <div className="flex items-start gap-3 px-4 py-3 bg-ficium/[0.06] border border-ficium/20 rounded-xl">
            <BookOpen size={18} className="text-ficium mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Complete your financial profile</div>
              <div className="text-[13px] text-muted mt-0.5">Banks need this to bid accurately.</div>
            </div>
            <Link to="/onboarding/dossier" className="text-sm font-semibold text-ficium no-underline flex-shrink-0">Start →</Link>
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

        {/* ── HEALTH SCORE INSIGHTS ── */}
        {recommendations.length > 0 && profile?.completion.financialProfileDone && (
          <HealthInsights score={profile?.healthScore ?? null} recommendations={recommendations} />
        )}

        {/* ── NEXT BEST ACTIONS ── */}
        {actions.length > 0 && (
          <NextActions actions={actions} />
        )}

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

          {loading ? (
            <SkeletonRequests />
          ) : requests.length === 0 ? (
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
        <Link
          to="/requests/new"
          className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline"
        >
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
   COMPLETION RING
   ============================================================ */

function CompletionRing({ percent, profile }: { percent: number; profile: any }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (percent / 100) * circ;

  const milestones = [
    { label: "Account created", done: true },
    { label: "Identity verified", done: profile?.completion.kycVerified ?? false },
    { label: "Proof of address", done: profile?.completion.proofOfAddressDone ?? false },
    { label: "Financial profile", done: profile?.completion.financialProfileDone ?? false },
    { label: "Source of wealth", done: profile?.completion.sourceOfWealthDone ?? false },
  ];

  const nextIncomplete = milestones.find((m) => !m.done);

  return (
    <Card padded={false} className="p-4 sm:p-5">
      <div className="flex items-center gap-5">
        {/* SVG Ring */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="7"
              className="text-ink/[0.07]" />
            <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="7"
              strokeDasharray={`${filled} ${circ}`}
              strokeLinecap="round"
              strokeDashoffset={circ / 4}
              className="text-ficium transition-all duration-700"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="font-display text-xl font-bold leading-none">{percent}%</div>
              <div className="text-[9px] text-muted mt-0.5">complete</div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold mb-2">Profile completion</div>
          <div className="flex flex-col gap-1.5">
            {milestones.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                {m.done
                  ? <CheckCircle2 size={14} className="text-ficium flex-shrink-0" />
                  : <Circle size={14} className="text-ink/20 flex-shrink-0" />}
                <span className={["text-[12px]", m.done ? "text-ink" : "text-muted"].join(" ")}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
          {nextIncomplete && (
            <Link
              to={nextIncomplete.label.includes("Identity") || nextIncomplete.label.includes("address") ? "/onboarding/kyc" : "/onboarding/dossier"}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ficium no-underline"
            >
              Complete next step <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </Card>
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
        {value === null ? "—" : value}{suffix && value !== null ? <span className="text-sm font-normal opacity-70">{suffix}</span> : null}
      </div>
      <div className={["text-[11px]", color === "ficium" ? "text-white/70" : "text-muted"].join(" ")}>{label}</div>
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
  const color = score === null ? "text-muted" : score >= 70 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  const label = score === null ? "—" : score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Needs work";

  return (
    <Card padded={false} className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">Financial Health</div>
        <div className={["text-sm font-bold", color].join(" ")}>{label}</div>
      </div>
      {/* Bar */}
      <div className="h-2 bg-ink/[0.07] rounded-pill overflow-hidden mb-3">
        <div
          className="h-full rounded-pill transition-all duration-700 bg-ficium"
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {recommendations.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px] text-muted">
            <TrendingUp size={12} className="text-ficium mt-0.5 flex-shrink-0" />
            {r}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   NEXT BEST ACTIONS
   ============================================================ */

function NextActions({ actions }: { actions: NextAction[] }) {
  const priorityColor = {
    high: "bg-red-50 border-red-200 text-red-700",
    medium: "bg-amber-50 border-amber-200 text-amber-700",
    low: "bg-ficium/[0.05] border-ficium/15 text-ficium",
  };

  return (
    <Card padded={false} className="p-4 sm:p-5">
      <div className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Zap size={14} className="text-ficium" /> Next steps
      </div>
      <div className="flex flex-col gap-2.5">
        {actions.map((a) => (
          <Link key={a.id} to={a.href} className="no-underline">
            <div className={["flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-colors hover:opacity-80", priorityColor[a.priority]].join(" ")}>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold">{a.label}</div>
                <div className="text-[11px] opacity-75 mt-0.5">{a.description}</div>
              </div>
              <ChevronRight size={16} className="mt-0.5 flex-shrink-0" />
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
              {request.bidCount === 0 ? "Awaiting bids…" : request.bestRate !== null ? (
                <><span className="font-semibold text-ink">{request.bidCount} bid{request.bidCount === 1 ? "" : "s"}</span>
                  <span className="mx-1.5">·</span>Best {request.bestRate.toFixed(2)}% APR</>
              ) : `${request.bidCount} bid${request.bidCount === 1 ? "" : "s"}`}
            </div>
          </div>
          <span className={[
            "text-[11px] font-bold px-2.5 py-1 rounded-pill uppercase tracking-wide flex-shrink-0",
            request.status === "open" ? "bg-mint/30 text-ink" :
            request.status === "accepted" ? "bg-ficium text-white" : "bg-ink/10 text-muted",
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