// =============================================================
// Ficium — Client Request Detail
// Full application view: details, client's own profile stats,
// bids tab, chat tab (fixed layout).
// =============================================================
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, Clock, TrendingDown, Building2,
  AlertCircle, MessageSquare, FileText, User, Percent,
} from "lucide-react";
import { useRequest, useRequestBids, useAcceptBid } from "../hooks/useRequests";
import { formatProductType } from "../api/requests";
import type { Bid } from "../api/requests";
import { Button, Card, BottomNav } from "../../../shared/ui";
import RequestChat from "../../../shared/components/RequestChat";
import { supabase } from "../../../shared/lib/supabase";
import { useProfile } from "../../dashboard/hooks/useDashboard";

export default function RequestDetail() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const [tab, setTab] = useState<"details" | "bids" | "chat">("details");

  const { data: request, isLoading: reqLoading }  = useRequest(id!);
  const { data: bids = [], isLoading: bidsLoading } = useRequestBids(id!);
  const { data: profile }                          = useProfile();
  const { mutate: accept, isPending: accepting, variables: acceptingBidId } = useAcceptBid(id!);

  const loading = reqLoading || bidsLoading;

  if (loading) return <LoadingSkeleton />;
  if (!request) return <NotFound />;

  const isClosed    = request.status !== "open";
  const acceptedBid = bids.find(b => b.status === "accepted");

  const fmt = (v: number) => v >= 1_000_000 ? `MUR ${(v/1_000_000).toFixed(1)}M` : `MUR ${Number(v).toLocaleString()}`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" });

  const tabCls = (t: string) =>
    `flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
      tab === t ? "border-ficium text-ficium" : "border-transparent text-muted hover:text-ink"
    }`;

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[680px] px-5 py-6 sm:px-6 sm:py-8">

        {/* Back */}
        <Link to="/requests" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6">
          <ArrowLeft size={16} /> Back to requests
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="text-xs text-muted mb-1">{formatProductType(request.productType)}</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">{fmt(request.amount)}</h1>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <p className="text-[13px] text-muted mb-6">Submitted {fmtDate(request.createdAt)}</p>

        {/* Accepted bid highlight */}
        {acceptedBid && (
          <div className="flex items-start gap-3 px-4 py-4 mb-5 bg-ficium/[0.06] border border-ficium/20 rounded-2xl">
            <CheckCircle size={20} className="text-ficium flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Bid accepted</div>
              <div className="text-[13px] text-muted mt-0.5">
                You accepted {acceptedBid.institutionName}'s offer at {acceptedBid.source === "institution" ? (acceptedBid.rate * 100).toFixed(2) : acceptedBid.rate.toFixed(2)}% APR.
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-ink/[0.08] mb-5">
          <button onClick={() => setTab("details")} className={tabCls("details")}>
            <FileText size={13} />Details
          </button>
          <button onClick={() => setTab("bids")} className={tabCls("bids")}>
            <TrendingDown size={13} />
            Bids {bids.length > 0 ? `(${bids.length})` : ""}
          </button>
          <button onClick={() => setTab("chat")} className={tabCls("chat")}>
            <MessageSquare size={13} />Chat
          </button>
        </div>

        {/* ── DETAILS TAB ── */}
        {tab === "details" && (
          <div className="space-y-5">

            {/* Full application */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={15} className="text-ficium" />
                <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">Application</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailRow label="Product"  value={formatProductType(request.productType)} />
                <DetailRow label="Amount"   value={fmt(request.amount)} bold />
                <DetailRow label="Term"     value={`${request.preferredTermMonths} months`} />
                {request.maxRate && <DetailRow label="Max rate" value={`${request.maxRate}% APR`} />}
                <DetailRow label="Submitted" value={fmtDate(request.createdAt)} />
                {request.decisionDeadline && <DetailRow label="Deadline" value={fmtDate(request.decisionDeadline)} />}
                <DetailRow label="Status" value={request.status} />
              </div>
              {request.purpose && (
                <div className="mt-4 pt-4 border-t border-ink/[0.06]">
                  <div className="text-[11px] text-muted mb-1.5">Purpose</div>
                  <p className="text-[14px] text-ink/80 leading-relaxed bg-cream rounded-xl px-4 py-3">{request.purpose}</p>
                </div>
              )}
            </Card>

            {/* Client's own financial profile */}
            {profile && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <User size={15} className="text-ficium" />
                  <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">Your Profile</span>
                  <span className="ml-auto text-[10px] text-muted bg-ink/5 px-2 py-1 rounded-full">Shown anonymously to banks</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ProfileStat
                    label="Credit Score"
                    value={profile.healthScore != null ? `${profile.healthScore}/100` : "—"}
                    accent={profile.healthScore != null ? (profile.healthScore >= 70 ? "green" : profile.healthScore >= 50 ? "amber" : "red") : undefined}
                  />
                  <ProfileStat
                    label="Affordability"
                    value={profile.affordabilityScore != null ? `${profile.affordabilityScore}/100` : "—"}
                    accent={profile.affordabilityScore != null ? (profile.affordabilityScore >= 70 ? "green" : profile.affordabilityScore >= 50 ? "amber" : "red") : undefined}
                  />
                  <ProfileStat
                    label="Monthly Income"
                    value={profile.monthlyIncome ? fmt(profile.monthlyIncome) : "—"}
                  />
                  <ProfileStat
                    label="Net Worth"
                    value={profile.totalNetWorth ? fmt(profile.totalNetWorth) : "—"}
                  />
                  <ProfileStat
                    label="Country"
                    value={profile.country ?? "—"}
                  />
                  <ProfileStat
                    label="Employment"
                    value={profile.employmentStatus?.replace(/_/g, " ") ?? "—"}
                  />
                </div>
              </Card>
            )}

            {/* Rate estimator */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Percent size={15} className="text-ficium" />
                <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">What to expect</span>
              </div>
              <div className="bg-cream rounded-xl px-4 py-4 text-[13px] text-ink/70 space-y-2">
                <p>Based on your profile and the amount requested, banks in Mauritius typically offer rates between <strong className="text-ink">7.5% – 12% APR</strong> for this product.</p>
                <p>Your credit score influences the rate — a score above 70 usually attracts the most competitive bids.</p>
              </div>
            </Card>

          </div>
        )}

        {/* ── BIDS TAB ── */}
        {tab === "bids" && (
          <div>
            {bids.length === 0 ? (
              <Card className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-ink/5 grid place-items-center mx-auto mb-3">
                  <Clock size={22} className="text-muted" />
                </div>
                <div className="font-semibold mb-1">Awaiting bids</div>
                <div className="text-sm text-muted max-w-[240px] mx-auto">Banks will start bidding once they review your request.</div>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {bids.map((bid, i) => (
                  <BidCard key={bid.id} bid={bid} rank={i + 1}
                    isBest={i === 0 && !isClosed} canAccept={!isClosed}
                    isAccepting={accepting && acceptingBidId === bid.id}
                    onAccept={() => accept(bid.id, { onSuccess: () => navigate("/dashboard") })}
                  />
                ))}
              </div>
            )}
            {isClosed && !acceptedBid && (
              <div className="flex items-start gap-3 mt-5 px-4 py-3 bg-ink/[0.04] border border-ink/10 rounded-xl">
                <AlertCircle size={18} className="text-muted flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-muted">This request is closed.</p>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === "chat" && (
          <div className="rounded-2xl overflow-hidden border border-ink/[0.08] bg-white" style={{ height: "520px", display: "flex", flexDirection: "column" }}>
            <RequestChat requestId={id!} senderType="client" client={supabase} height="flex-1" />
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

function ProfileStat({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const valueCls = accent === "green" ? "text-green-600 font-bold"
    : accent === "amber" ? "text-amber-600 font-bold"
    : accent === "red"   ? "text-red-500 font-bold"
    : "font-semibold text-ink";
  return (
    <div className="bg-cream rounded-xl px-3 py-2.5">
      <div className="text-[10px] text-muted mb-0.5">{label}</div>
      <div className={`text-[13px] capitalize ${valueCls}`}>{value}</div>
    </div>
  );
}

/* ---------- BidCard ---------- */
function BidCard({ bid, rank, isBest, canAccept, isAccepting, onAccept }: {
  bid: Bid; rank: number; isBest: boolean; canAccept: boolean; isAccepting: boolean; onAccept: () => void;
}) {
  const isAccepted = bid.status === "accepted";
  return (
    <Card padded={false} className={["p-4", isBest ? "border-ficium/30 bg-ficium/[0.02]" : "", isAccepted ? "border-green-300 bg-green-50/50" : ""].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={["w-8 h-8 rounded-full grid place-items-center text-xs font-bold flex-shrink-0", isBest ? "bg-ficium text-white" : isAccepted ? "bg-green-500 text-white" : "bg-ink/10 text-muted"].join(" ")}>
            {isAccepted ? "✓" : `#${rank}`}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-muted flex-shrink-0" />
              <span className="text-[13px] font-semibold truncate">{bid.institutionName}</span>
              {isBest && <span className="text-[10px] font-bold px-2 py-0.5 bg-ficium text-white rounded-pill">Best rate</span>}
            </div>
            <div className="font-display text-2xl font-bold mt-0.5">
              {bid.source === "institution" ? (bid.rate * 100).toFixed(2) : bid.rate.toFixed(2)}%
              <span className="text-sm font-normal text-muted ml-1">{bid.rateType === "variable" ? "variable" : "fixed"} APR</span>
            </div>
            {bid.source === "institution" && bid.amountOffered > 0 && (
              <div className="flex gap-3 mt-2">
                <div className="bg-cream rounded-lg px-3 py-1.5">
                  <div className="text-[9px] text-muted uppercase tracking-wide">Offered</div>
                  <div className="text-[12px] font-bold text-ink">MUR {Number(bid.amountOffered).toLocaleString()}</div>
                </div>
                {bid.termMonths > 0 && (
                  <div className="bg-cream rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-muted uppercase tracking-wide">Term</div>
                    <div className="text-[12px] font-bold text-ink">{bid.termMonths}m</div>
                  </div>
                )}
              </div>
            )}
            {typeof bid.conditions?.notes === "string" && bid.conditions.notes && (
              <p className="text-xs text-muted mt-1 leading-relaxed bg-cream rounded-lg px-3 py-2">{bid.conditions.notes}</p>
            )}
          </div>
        </div>
        {canAccept && !isAccepted && (
          <Button size="sm" onClick={onAccept} loading={isAccepting} className="flex-shrink-0">Accept</Button>
        )}
        {isAccepted && (
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-pill flex-shrink-0">Accepted</span>
        )}
      </div>
    </Card>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted mb-0.5">{label}</div>
      <div className={bold ? "text-sm font-bold" : "text-sm font-semibold capitalize"}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === "open" ? "bg-mint/30 text-ink" : status === "closed" ? "bg-ficium text-white" : "bg-ink/10 text-muted";
  return <span className={`text-[11px] font-bold px-3 py-1.5 rounded-pill uppercase tracking-wide flex-shrink-0 ${styles}`}>{status}</span>;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[680px] px-5 py-6">
        <div className="h-4 w-16 bg-ink/10 rounded mb-6 animate-pulse" />
        <div className="h-8 w-40 bg-ink/10 rounded mb-2 animate-pulse" />
        {[0,1,2].map(i => <div key={i} className="h-24 bg-ink/10 rounded-xl mb-3 animate-pulse" />)}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-display text-xl font-bold mb-2">Request not found</div>
        <Link to="/dashboard" className="text-sm text-ficium font-semibold no-underline">Back to dashboard</Link>
      </div>
    </div>
  );
}
