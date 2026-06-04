import { RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MarketHeader — the top bar of the Markets page.
// Pure presentational — receives all state and callbacks as props.
// ─────────────────────────────────────────────────────────────────────────────

interface MarketHeaderProps {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function MarketHeader({ lastUpdated, isRefreshing, onRefresh }: MarketHeaderProps) {
  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="text-[12px] font-bold text-white/40 uppercase tracking-widest mb-1">
          Live
        </div>
        <h1 className="text-[26px] font-bold text-white leading-tight">Markets</h1>
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh market data"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-[12px] font-semibold hover:bg-white/15 disabled:opacity-50 transition-colors"
      >
        <RefreshCw
          size={13}
          className={isRefreshing ? "animate-spin" : ""}
        />
        {timeLabel}
      </button>
    </div>
  );
}
