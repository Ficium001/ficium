import { TickerCard }  from "./TickerCard";
import type { Ticker, TickerId } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// TickerStrip — scrollable on mobile, responsive grid on desktop.
// 4 cols on sm, 8 cols on lg (one ticker per column at full width).
// ─────────────────────────────────────────────────────────────────────────────

interface TickerStripProps {
  tickers: Ticker[];
  activeId: TickerId | null;
  onSelect: (id: TickerId | null) => void;
}

export function TickerStrip({ tickers, activeId, onSelect }: TickerStripProps) {
  return (
    <>
      {/* Mobile: horizontal scroll */}
      <div
        className="flex lg:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {tickers.map((t) => (
          <TickerCard
            key={t.id}
            ticker={t}
            isActive={activeId === t.id}
            onClick={() => onSelect(activeId === t.id ? null : t.id)}
          />
        ))}
      </div>

      {/* Desktop: full-width grid */}
      <div className="hidden lg:grid grid-cols-8 gap-3">
        {tickers.map((t) => (
          <TickerCard
            key={t.id}
            ticker={t}
            isActive={activeId === t.id}
            onClick={() => onSelect(activeId === t.id ? null : t.id)}
          />
        ))}
      </div>
    </>
  );
}
