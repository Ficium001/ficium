import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, LogOut, FileText, TrendingUp, Activity, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { getProfileSummary, getMyRequests, formatMUR, formatProductType } from "../../dashboard/api/profile";
import type { ProfileSummary, RequestSummary } from "../../dashboard/api/profile";
import { Button, Card, BottomNav } from "../../../shared/ui";

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [p, r] = await Promise.all([getProfileSummary(), getMyRequests()]);
      if (cancelled) return;
      setProfile(p);
      setRequests(r);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const greeting = getGreeting();
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? "?";

  const activeRequests = requests.filter((r) => r.status === "open").length;
  const totalNewBids = requests.reduce((s, r) => s + r.bidCount, 0);

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-ficium text-white grid place-items-center font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">{greeting},</div>
              <div className="text-base font-semibold truncate">
                {profile?.firstName ?? profile?.fullName ?? "there"}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<LogOut size={16} />} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        {/* KYC status banner (if not verified) */}
        {profile && profile.kycStatus !== "verified" && (
          <div className="flex items-start gap-3 px-4 py-3 mb-5 bg-accent/20 border border-accent/40 rounded-xl">
            <ShieldAlert size={18} className="text-ink mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Finish verifying your identity</div>
              <div className="text-[13px] text-muted mt-0.5">
                Banks can't bid on your requests until KYC is complete.
              </div>
            </div>
            <Link
              to="/onboarding/kyc"
              className="text-sm font-semibold text-ficium no-underline flex-shrink-0"
            >
              Resume →
            </Link>
          </div>
        )}

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatTile
            icon={<FileText size={18} />}
            value={loading ? "—" : activeRequests.toString()}
            label="Requests"
          />
          <StatTile
            icon={<TrendingUp size={18} />}
            value={loading ? "—" : totalNewBids.toString()}
            label="New bids"
          />
          <StatTile
            icon={<Activity size={18} />}
            value={loading ? "—" : profile?.healthScore?.toString() ?? "—"}
            label="Health"
            highlight
          />
        </div>

        {/* Requests section */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl sm:text-2xl font-bold">Your requests</h2>
          {requests.length > 0 && (
            <Link to="/requests" className="text-sm text-ficium font-semibold no-underline">
              See all
            </Link>
          )}
        </div>

        {loading ? (
          <SkeletonRequests />
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {requests.slice(0, 5).map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}

{/* Primary CTA — only when there's at least one request (otherwise empty-state CTA is enough) */}
        {requests.length > 0 && (
          <Link
            to="/requests/new"
            className="fixed bottom-20 right-5 sm:right-8 z-30 inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-pill shadow-ficium font-semibold no-underline"
          >
            <Plus size={18} /> New Request
          </Link>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- Pieces ---------- */

function StatTile({
  icon, value, label, highlight,
}: { icon: React.ReactNode; value: string; label: string; highlight?: boolean }) {
  return (
    <Card padded={false} className={[
      "p-4 flex flex-col gap-1.5 items-start",
      highlight ? "bg-ficium text-white border-ficium" : "",
    ].join(" ")}>
      <div className={highlight ? "text-white/80" : "text-muted"}>{icon}</div>
      <div className="font-display text-2xl sm:text-[28px] font-bold leading-none">{value}</div>
      <div className={["text-xs", highlight ? "text-white/80" : "text-muted"].join(" ")}>{label}</div>
    </Card>
  );
}

function RequestCard({ request }: { request: RequestSummary }) {
  return (
    <Card padded={false} className="p-4 hover:border-ink/15 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted">{formatProductType(request.productType)}</div>
          <div className="font-display text-xl sm:text-2xl font-bold mt-0.5">
            {formatMUR(request.amount)}
          </div>
          <div className="text-xs text-muted mt-1.5">
            {request.bidCount === 0 ? (
              <span>Awaiting bids…</span>
            ) : request.bestRate !== null ? (
              <>
                <span className="font-semibold text-ink">{request.bidCount} bid{request.bidCount === 1 ? "" : "s"}</span>
                <span className="mx-1.5">·</span>
                <span>Best {request.bestRate.toFixed(2)}% APR</span>
              </>
            ) : (
              <span>{request.bidCount} bid{request.bidCount === 1 ? "" : "s"}</span>
            )}
          </div>
        </div>
        <span className={[
          "text-[11px] font-bold px-2.5 py-1 rounded-pill uppercase tracking-wide",
          request.status === "open" ? "bg-mint/30 text-ink" :
          request.status === "accepted" ? "bg-ficium text-white" :
          "bg-ink/10 text-muted",
        ].join(" ")}>
          {request.status}
        </span>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-ficium/10 text-ficium grid place-items-center mx-auto mb-4">
        <Sparkles size={24} />
      </div>
      <div className="font-display text-2xl font-bold mb-2">Post your first request</div>
      <div className="text-sm text-muted mb-6 max-w-[280px] mx-auto">
        Tell us what you need. Banks across Mauritius will bid against each other for your business.
      </div>
      <Link
        to="/requests/new"
        className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-3 rounded-pill text-sm font-semibold no-underline shadow-ficium"
      >
        <Plus size={16} /> New Request
      </Link>
    </Card>
  );
}

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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}