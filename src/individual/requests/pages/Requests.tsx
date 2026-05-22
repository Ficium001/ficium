import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { useMyRequests } from "../hooks/useRequests";
import { formatMUR, formatProductType } from "../../dashboard/api/profile";
import type { RequestSummary } from "../../dashboard/api/profile";
import { BottomNav, Card } from "../../../shared/ui";

type Filter = "all" | "open" | "accepted" | "closed";

export default function Requests() {
  const { data: requests = [], isLoading } = useMyRequests();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "closed") return r.status === "closed" || r.status === "expired";
    return r.status === filter;
  });

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    closed: requests.filter((r) => r.status === "closed" || r.status === "expired").length,
  };

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Requests</h1>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-1.5 bg-ficium text-white px-4 py-2 rounded-pill text-sm font-semibold no-underline shadow-ficium"
          >
            <Plus size={16} /> New
          </Link>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <FilterChip label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="Open" count={counts.open} active={filter === "open"} onClick={() => setFilter("open")} />
          <FilterChip label="Accepted" count={counts.accepted} active={filter === "accepted"} onClick={() => setFilter("accepted")} />
          <FilterChip label="Closed" count={counts.closed} active={filter === "closed"} onClick={() => setFilter("closed")} />
        </div>

        {isLoading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

/* ---------- Sub-components (unchanged) ---------- */

function FilterChip({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill text-sm font-semibold transition-colors border-[1.5px]",
        active ? "bg-ink text-cream border-ink" : "bg-transparent text-ink border-ink/15 hover:border-ink/30",
      ].join(" ")}
    >
      {label}
      <span className={["text-xs", active ? "opacity-70" : "text-muted"].join(" ")}>{count}</span>
    </button>
  );
}

function RequestRow({ request }: { request: RequestSummary }) {
  return (
    <Link to={`/requests/${request.id}`} className="block no-underline">
      <Card padded={false} className="p-4 hover:border-ink/15 transition-colors">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted">{formatProductType(request.productType)}</div>
            <div className="font-display text-xl font-bold mt-0.5 text-ink">
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
            "text-[11px] font-bold px-2.5 py-1 rounded-pill uppercase tracking-wide flex-shrink-0",
            request.status === "open" ? "bg-mint/30 text-ink" :
            request.status === "accepted" ? "bg-ficium text-white" :
            "bg-ink/10 text-muted",
          ].join(" ")}>
            {request.status}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const isAll = filter === "all";
  return (
    <Card className="text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-ficium/10 text-ficium grid place-items-center mx-auto mb-4">
        <FileText size={24} />
      </div>
      <div className="font-display text-xl font-bold mb-2">
        {isAll ? "No requests yet" : `No ${filter} requests`}
      </div>
      <div className="text-sm text-muted mb-6 max-w-[280px] mx-auto">
        {isAll
          ? "Post your first request and let banks compete for your business."
          : "Try a different filter, or post a new request."}
      </div>
      {isAll && (
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-3 rounded-pill text-sm font-semibold no-underline shadow-ficium"
        >
          <Plus size={16} /> New Request
        </Link>
      )}
    </Card>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} padded={false} className="p-4">
          <div className="h-3 w-20 bg-ink/10 rounded mb-2 animate-pulse" />
          <div className="h-6 w-32 bg-ink/10 rounded mb-2 animate-pulse" />
          <div className="h-3 w-40 bg-ink/10 rounded animate-pulse" />
        </Card>
      ))}
    </div>
  );
}