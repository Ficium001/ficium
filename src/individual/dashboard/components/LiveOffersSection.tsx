/**
 * LiveOffersSection
 *
 * Shows the best live bids across all the user's open requests —
 * the core value-prop of Ficium made visible on the home screen.
 *
 * Layout mirrors the design reference:
 *   - Section header with "View all →"
 *   - Active request selector (if multiple)
 *   - Ranked bid rows: logo | name | rate | "Best Offer" badge | "View" CTA
 *
 * Data: reads from the requests + bids already cached by React Query
 * so there are no extra network calls on mount.
 */

import { useState }                  from "react";
import { useNavigate }               from "react-router-dom";
import { TrendingDown, Zap, Clock }  from "lucide-react";
import { useMyRequests, useMyOpenRequestBids } from "@/individual/requests/hooks/useRequests";
import type { RequestSummary }       from "@/individual/requests/api/requests";
import type { Bid }                  from "@/individual/requests/api/requests";

// ─── helpers ──────────────────────────────────────────────────

const PRODUCT_LABELS: Record<string, string> = {
  mortgage:           "Home Loan",
  personal_loan:      "Personal Loan",
  credit_card:        "Credit Card",
  leasing:            "Vehicle Loan",
  business_loan:      "Business Loan",
  sme_loan:           "SME Loan",
  fixed_deposit:      "Fixed Deposit",
  investment_account: "Investment",
  overdraft:          "Overdraft",
};

function productLabel(type: string) {
  return PRODUCT_LABELS[type] ?? "Request";
}

function fmtAmt(n: number) {
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `Rs ${(n / 1_000).toFixed(0)}k`;
  return `Rs ${n}`;
}

/** Full comma-grouped amount, e.g. "Rs 32,450" — used in the hero row
 *  where precision reads as trustworthy rather than cluttered. */
function fmtComma(n: number) {
  return `Rs ${Math.round(n).toLocaleString("en-US")}`;
}

/** Standard amortizing monthly payment. Falls back gracefully if the
 *  bid is missing amount/term data. */
function monthlyPayment(amount: number, ratePct: number, termMonths: number): number | null {
  if (!amount || !termMonths) return null;
  const r = ratePct / 100 / 12;
  if (r === 0) return amount / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (amount * r * factor) / (factor - 1);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)    return "Just now";
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1)  return "Yesterday";
  return `${days}d ago`;
}

/** Derive an initials avatar from an institution name */
function institutionInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

/** Deterministic pastel bg from institution name */
function institutionColor(name: string): string {
  const PALETTES = [
    { bg: "#dbeafe", text: "#1d4ed8" },
    { bg: "#ede9fe", text: "#6d28d9" },
    { bg: "#d1fae5", text: "#065f46" },
    { bg: "#fce7f3", text: "#9d174d" },
    { bg: "#fef9c3", text: "#854d0e" },
    { bg: "#fee2e2", text: "#991b1b" },
  ];
  const idx = name.charCodeAt(0) % PALETTES.length;
  return PALETTES[idx]!.bg;
}
function institutionTextColor(name: string): string {
  const PALETTES = [
    { bg: "#dbeafe", text: "#1d4ed8" },
    { bg: "#ede9fe", text: "#6d28d9" },
    { bg: "#d1fae5", text: "#065f46" },
    { bg: "#fce7f3", text: "#9d174d" },
    { bg: "#fef9c3", text: "#854d0e" },
    { bg: "#fee2e2", text: "#991b1b" },
  ];
  const idx = name.charCodeAt(0) % PALETTES.length;
  return PALETTES[idx]!.text;
}

// ─── sub-components ───────────────────────────────────────────

/** Avatar: logo image with initials fallback */
function InstitutionAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        className="w-10 h-10 rounded-xl object-contain border border-ink/6 bg-white"
      />
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{
        background: institutionColor(name),
        color:      institutionTextColor(name),
      }}
    >
      {institutionInitials(name)}
    </div>
  );
}

/** Hero row for the #1 ranked bid — mirrors the reference layout:
 *  logo/name/badge on the left, then Interest rate | Monthly payment |
 *  Term stat columns, then a prominent View offer CTA. Collapses to a
 *  stacked 2-col stat grid on mobile. */
function HeroBidRow({
  bid,
  requestId,
}: {
  bid:       Bid;
  requestId: string;
}) {
  const navigate = useNavigate();
  const payment  = monthlyPayment(bid.amountOffered, Number(bid.rate), bid.termMonths);

  return (
    <div
      className="rounded-[16px] bg-emerald-50 border border-emerald-100 p-4 cursor-pointer hover:bg-emerald-100/50 transition-colors"
      onClick={() => navigate(`/requests/${requestId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && navigate(`/requests/${requestId}`)}
      aria-label={`View ${bid.institutionName} offer at ${bid.rate}%`}
    >
      <div className="flex items-center gap-3 mb-3 sm:mb-0">
        <InstitutionAvatar name={bid.institutionName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-ink truncate">{bid.institutionName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Zap size={9} />
              Best Offer
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
            <Clock size={10} />
            {timeAgo(bid.submittedAt)}
            {bid.rateType === "variable" && (
              <span className="ml-1 text-amber-600 font-medium">· variable</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-[70px]">
          <div className="text-[10px] text-muted font-medium mb-0.5">Interest rate</div>
          <div className="text-[16px] sm:text-[18px] font-extrabold font-display text-emerald-700 leading-none">
            {Number(bid.rate).toFixed(2)}% <span className="text-[10px] font-medium text-muted">p.a.</span>
          </div>
        </div>

        {payment != null && (
          <div className="flex-1 min-w-[90px]">
            <div className="text-[10px] text-muted font-medium mb-0.5">Monthly payment</div>
            <div className="text-[16px] sm:text-[18px] font-extrabold font-display text-ink leading-none">
              {fmtComma(payment)}
            </div>
          </div>
        )}

        {bid.termMonths > 0 && (
          <div className="flex-1 min-w-[70px]">
            <div className="text-[10px] text-muted font-medium mb-0.5">Term</div>
            <div className="text-[16px] sm:text-[18px] font-extrabold font-display text-ink leading-none">
              {bid.termMonths >= 12 ? `${Math.round(bid.termMonths / 12)} yrs` : `${bid.termMonths} mo`}
            </div>
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); navigate(`/requests/${requestId}`); }}
          className="shrink-0 text-[12px] sm:text-[13px] font-bold px-4 py-2.5 rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700 transition-colors w-full sm:w-auto"
          aria-label={`View offer from ${bid.institutionName}`}
        >
          View offer
        </button>
      </div>
    </div>
  );
}

/** Single bid row */
function BidRow({
  bid,
  isBest,
  requestId,
}: {
  bid:       Bid;
  isBest:    boolean;
  requestId: string;
}) {
  const navigate = useNavigate();

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3.5 rounded-[14px] transition-colors cursor-pointer",
        isBest
          ? "bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/60"
          : "bg-white border border-ink/6 hover:bg-ink/2",
      ].join(" ")}
      onClick={() => navigate(`/requests/${requestId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && navigate(`/requests/${requestId}`)}
      aria-label={`View ${bid.institutionName} offer at ${bid.rate}%`}
    >
      {/* Logo */}
      <InstitutionAvatar name={bid.institutionName} />

      {/* Name + time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-ink truncate">
            {bid.institutionName}
          </span>
          {isBest && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Zap size={9} />
              Best Offer
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
          <Clock size={10} />
          {timeAgo(bid.submittedAt)}
          {bid.rateType === "variable" && (
            <span className="ml-1 text-amber-600 font-medium">· variable</span>
          )}
        </div>
      </div>

      {/* Rate */}
      <div className="text-right shrink-0">
        <div
          className={[
            "text-[18px] font-extrabold font-display leading-none",
            isBest ? "text-emerald-700" : "text-ink",
          ].join(" ")}
        >
          {Number(bid.rate).toFixed(2)}%
        </div>
        <div className="text-[10px] text-muted font-medium">p.a.</div>
      </div>

      {/* View CTA */}
      <button
        onClick={e => { e.stopPropagation(); navigate(`/requests/${requestId}`); }}
        className={[
          "shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-[8px] transition-colors",
          isBest
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border border-ink/12 text-ink hover:bg-ink/4",
        ].join(" ")}
        aria-label={`View offer from ${bid.institutionName}`}
      >
        View
      </button>
    </div>
  );
}

/** Bids panel for one request — receives bids from the shared bulk fetch */
function RequestBidPanel({
  request,
  bids,
  isLoading,
  maxRows,
}: {
  request:   RequestSummary;
  bids:      Bid[];
  isLoading: boolean;
  maxRows:   number;
}) {
  const navigate = useNavigate();

  // Sort ascending by rate (lower = better for borrower products)
  const sorted = [...bids].sort((a, b) => Number(a.rate) - Number(b.rate));
  const visible = sorted.slice(0, maxRows);
  const hidden  = sorted.length - visible.length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-[62px] rounded-[14px] bg-ink/4 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Clock size={28} className="text-ink/20" />
        <p className="text-[13px] font-semibold text-muted">
          Waiting for providers to bid
        </p>
        <p className="text-[12px] text-muted/70">
          Usually within 24 hours of posting
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((bid, i) =>
        i === 0 ? (
          <HeroBidRow key={bid.id} bid={bid} requestId={request.id} />
        ) : (
          <BidRow key={bid.id} bid={bid} isBest={false} requestId={request.id} />
        ),
      )}
      {hidden > 0 && (
        <button
          onClick={() => navigate(`/requests/${request.id}`)}
          className="w-full text-center text-[12px] font-semibold text-ficium hover:underline py-2"
        >
          See all {sorted.length} offers →
        </button>
      )}
    </div>
  );
}

/** Request selector tab (when user has multiple open requests) */
function RequestTab({
  request,
  bidCount,
  active,
  onClick,
}: {
  request:  RequestSummary;
  bidCount: number;
  active:   boolean;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-3.5 py-2 rounded-[12px] transition-all text-[12px] font-semibold shrink-0",
        active
          ? "bg-ficium text-white shadow-ficium"
          : "bg-ink/4 text-muted hover:bg-ink/8",
      ].join(" ")}
    >
      <span>{productLabel(request.productType)}</span>
      <span
        className={[
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          active
            ? "bg-white/25 text-white"
            : "bg-ink/8 text-ink/60",
        ].join(" ")}
      >
        {bidCount}
      </span>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────

const MAX_VISIBLE_ROWS = 5;

export function LiveOffersSection() {
  const navigate = useNavigate();
  const { data: requests = [], isLoading: requestsLoading } = useMyRequests();

  const openRequestIds = requests.filter(r => r.status === "open").map(r => r.id);
  const { data: bidsByRequest = {}, isLoading: bidsLoading } = useMyOpenRequestBids(openRequestIds);

  const isLoading = requestsLoading || (openRequestIds.length > 0 && bidsLoading);

  // Only show open requests that have at least 1 bid (use live bulk-fetched
  // count, not the possibly-stale bidCount from the requests list query)
  const liveRequests = requests.filter(
    r => r.status === "open" && (bidsByRequest[r.id]?.length ?? 0) > 0,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to first live request, or the one with the most bids
  const bestDefault = liveRequests.reduce<RequestSummary | null>((best, r) => {
    const count = bidsByRequest[r.id]?.length ?? 0;
    const bestCount = best ? (bidsByRequest[best.id]?.length ?? 0) : -1;
    return !best || count > bestCount ? r : best;
  }, null);

  const activeId     = selectedId ?? bestDefault?.id ?? null;
  const activeRequest = liveRequests.find(r => r.id === activeId) ?? liveRequests[0];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-card p-5 space-y-3">
        <div className="h-4 w-32 bg-ink/6 rounded-sm animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[62px] rounded-[14px] bg-ink/4 animate-pulse" />
        ))}
      </div>
    );
  }

  // No live bids at all
  if (liveRequests.length === 0) {
    // Only render something if there are open requests (bidding pending)
    const openCount = requests.filter(r => r.status === "open").length;
    if (openCount === 0) return null;

    return (
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-0.5">
              Live Offers
            </p>
            <h2 className="font-display text-[18px] font-bold text-ink">
              Waiting for providers
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-[14px] bg-amber-50 border border-amber-100">
          <Clock size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">
              {openCount} request{openCount > 1 ? "s" : ""} live — providers are reviewing
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Bids typically arrive within 24 hours
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalBids = liveRequests.reduce((s, r) => s + (bidsByRequest[r.id]?.length ?? 0), 0);
  const activeBids = activeRequest ? (bidsByRequest[activeRequest.id] ?? []) : [];
  const activeBestRate = activeBids.length
    ? Math.min(...activeBids.map(b => Number(b.rate)))
    : null;

  return (
    <div className="bg-white rounded-[22px] border border-ink/6 shadow-card p-5">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-0.5">
            Marketplace
          </p>
          <h2 className="font-display text-[18px] sm:text-[20px] font-bold text-ink leading-tight">
            Live offers{" "}
            <span className="text-ficium">for you</span>
          </h2>
          <p className="text-[12px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
            <TrendingDown size={12} />
            {totalBids} bid{totalBids !== 1 ? "s" : ""} across {liveRequests.length} request{liveRequests.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          {activeBestRate !== null && (
            <p className="text-[13px] font-extrabold font-display text-emerald-600 leading-none mb-1.5">
              Best {activeBestRate.toFixed(2)}% p.a.
            </p>
          )}
          <button
            onClick={() => navigate("/requests")}
            className="text-[12px] font-semibold text-muted hover:text-ink"
          >
            View all →
          </button>
        </div>
      </div>

      {/* Request selector — only if multiple live requests */}
      {liveRequests.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1">
          {liveRequests.map(r => (
            <RequestTab
              key={r.id}
              request={r}
              bidCount={bidsByRequest[r.id]?.length ?? 0}
              active={r.id === activeId}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
        </div>
      )}

      {/* Context line for the selected request */}
      {activeRequest && (
        <p className="text-[12px] text-muted font-medium mb-3">
          {productLabel(activeRequest.productType)} · {fmtAmt(activeRequest.amount)}
        </p>
      )}

      {/* Bid rows */}
      {activeRequest && (
        <RequestBidPanel
          request={activeRequest}
          bids={activeBids}
          isLoading={false}
          maxRows={MAX_VISIBLE_ROWS}
        />
      )}
    </div>
  );
}
