import { Sparkline }    from "./Sparkline";
import { ChangeBadge }  from "./ChangeBadge";
import type { Ticker }  from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// TickerCard — one scrollable market tile.
// Owns its own skeleton state when reading is null.
// ─────────────────────────────────────────────────────────────────────────────

interface TickerCardProps {
  ticker: Ticker;
  isActive: boolean;
  onClick: () => void;
}

export function TickerCard({ ticker, isActive, onClick }: TickerCardProps) {
  const { reading, label, color, icon: Icon } = ticker;

  const isLoading = reading === null;

  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`${label}: ${reading?.displayValue ?? "loading"}`}
      className="flex-shrink-0 bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-4 w-[148px] lg:w-full text-left transition-all hover:shadow-md focus:outline-none"
      style={
        isActive
          ? { borderColor: color, boxShadow: `0 0 0 2px ${color}22` }
          : undefined
      }
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        {!isLoading && reading && (
          <ChangeBadge change={reading.change} direction={reading.direction} />
        )}
        {isLoading && (
          <div className="w-12 h-3 bg-ink/[0.07] rounded animate-pulse" />
        )}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="w-16 h-5 bg-ink/[0.07] rounded animate-pulse mb-1" />
      ) : (
        <div className="text-[20px] font-bold text-ink leading-none mb-0.5 tabular-nums">
          {reading?.displayValue}
        </div>
      )}

      {/* Label */}
      <div className="text-[10px] font-semibold text-muted leading-tight mb-2.5">
        {label}
      </div>

      {/* Sparkline */}
      {isLoading ? (
        <div className="w-16 h-7 bg-ink/[0.04] rounded animate-pulse" />
      ) : (
        reading?.history && (
          <Sparkline
            data={reading.history}
            color={color}
            width={68}
            height={28}
          />
        )
      )}
    </button>
  );
}
