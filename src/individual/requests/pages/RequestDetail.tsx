import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, TrendingDown, Building2, AlertCircle } from "lucide-react";
import { useRequest, useRequestBids, useAcceptBid } from "../hooks/useRequests";
import { formatProductType } from "../api/requests";
import type { Bid } from "../api/requests";
import { Button, Card, BottomNav } from "../../../shared/ui";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: request, isLoading: requestLoading } = useRequest(id!);
  const { data: bids = [], isLoading: bidsLoading } = useRequestBids(id!);
  const { mutate: accept, isPending: accepting, variables: acceptingBidId } = useAcceptBid(id!);

  const loading = requestLoading || bidsLoading;

  const handleAccept = (bidId: string) => {
    accept(bidId, {
      onSuccess: () => navigate("/dashboard"),
    });
  };

  if (loading) return <LoadingSkeleton />;
  if (!request) return <NotFound />;

  const isClosed = request.status !== "open";
  const acceptedBid = bids.find((b) => b.status === "accepted");


  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">

        {/* Back */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <div className="text-xs text-muted mb-1">{formatProductType(request.productType)}</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">
              {formatMUR(request.amount)}
            </h1>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Request details card */}
        <Card className="mb-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <DetailRow label="Purpose" value={request.purpose} />
            <DetailRow label="Term" value={`${request.preferredTermMonths} months`} />
            {request.maxRate && (
              <DetailRow label="Max rate" value={`${request.maxRate}% APR`} />
            )}
            {request.decisionDeadline && (
              <DetailRow label="Deadline" value={formatDate(request.decisionDeadline)} />
            )}
            <DetailRow label="Posted" value={formatDate(request.createdAt)} />
          </div>
        </Card>

        {/* Accepted bid highlight */}
        {acceptedBid && (
          <div className="flex items-start gap-3 px-4 py-4 mb-5 bg-ficium/[0.06] border border-ficium/20 rounded-xl">
            <CheckCircle size={20} className="text-ficium flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Bid accepted</div>
              <div className="text-[13px] text-muted mt-0.5">
                You accepted {acceptedBid.institutionName}'s offer at {acceptedBid.rate.toFixed(2)}% APR.
              </div>
            </div>
          </div>
        )}

        {/* Bids section */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">
            {isClosed ? "Bids received" : `Bids (${bids.length})`}
          </h2>
          {!isClosed && bids.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <TrendingDown size={13} />
              Sorted by rate
            </div>
          )}
        </div>

        {bids.length === 0 ? (
          <Card className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-ink/5 grid place-items-center mx-auto mb-3">
              <Clock size={22} className="text-muted" />
            </div>
            <div className="font-semibold mb-1">Awaiting bids</div>
            <div className="text-sm text-muted max-w-[240px] mx-auto">
              Banks will start bidding once they review your request.
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {bids.map((bid, i) => (
              <BidCard
                key={bid.id}
                bid={bid}
                rank={i + 1}
                isBest={i === 0 && !isClosed}
                canAccept={!isClosed}
                isAccepting={accepting && acceptingBidId === bid.id}
                onAccept={() => handleAccept(bid.id)}
              />
            ))}
          </div>
        )}

        {/* Closed notice */}
        {isClosed && !acceptedBid && (
          <div className="flex items-start gap-3 mt-5 px-4 py-3 bg-ink/[0.04] border border-ink/10 rounded-xl">
            <AlertCircle size={18} className="text-muted flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-muted">This request is closed.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- BidCard ---------- */

function BidCard({
  bid, rank, isBest, canAccept, isAccepting, onAccept,
}: {
  bid: Bid;
  rank: number;
  isBest: boolean;
  canAccept: boolean;
  isAccepting: boolean;
  onAccept: () => void;
}) {
  const isAccepted = bid.status === "accepted";

  return (
    <Card
      padded={false}
      className={[
        "p-4",
        isBest ? "border-ficium/30 bg-ficium/[0.02]" : "",
        isAccepted ? "border-green-300 bg-green-50/50" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div className={[
            "w-8 h-8 rounded-full grid place-items-center text-xs font-bold flex-shrink-0",
            isBest ? "bg-ficium text-white" :
            isAccepted ? "bg-green-500 text-white" :
            "bg-ink/10 text-muted",
          ].join(" ")}>
            {isAccepted ? "✓" : `#${rank}`}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-muted flex-shrink-0" />
              <span className="text-[13px] font-semibold truncate">{bid.institutionName}</span>
              {isBest && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-ficium text-white rounded-pill">
                  Best rate
                </span>
              )}
            </div>
            <div className="font-display text-2xl font-bold mt-0.5">
              {bid.rate.toFixed(2)}%
              <span className="text-sm font-normal text-muted ml-1">APR</span>
            </div>
            {bid.terms && (
              <p className="text-xs text-muted mt-1 leading-relaxed">{bid.terms}</p>
            )}
            <div className="text-xs text-muted mt-1">{formatDate(bid.createdAt)}</div>
          </div>
        </div>

        {/* Accept button */}
        {canAccept && !isAccepted && (
          <Button
            size="sm"
            onClick={onAccept}
            loading={isAccepting}
            className="flex-shrink-0"
          >
            Accept
          </Button>
        )}

        {isAccepted && (
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-pill flex-shrink-0">
            Accepted
          </span>
        )}
      </div>
    </Card>
  );
}

/* ---------- Pieces ---------- */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "open" ? "bg-mint/30 text-ink" :
    status === "closed" ? "bg-ficium text-white" :
    "bg-ink/10 text-muted";

  return (
    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-pill uppercase tracking-wide flex-shrink-0 ${styles}`}>
      {status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6">
        <div className="h-4 w-16 bg-ink/10 rounded mb-6 animate-pulse" />
        <div className="h-8 w-40 bg-ink/10 rounded mb-2 animate-pulse" />
        <div className="h-5 w-24 bg-ink/10 rounded mb-6 animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-ink/10 rounded-xl mb-3 animate-pulse" />
        ))}
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
        <Link to="/dashboard" className="text-sm text-ficium font-semibold no-underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

/* ---------- Formatters ---------- */

function formatMUR(amount: number): string {
  return new Intl.NumberFormat("en-MU", {
    style: "currency",
    currency: "MUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}