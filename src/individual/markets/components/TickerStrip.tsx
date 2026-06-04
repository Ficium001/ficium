import { TickerCard }  from "./TickerCard";
import type { Ticker, TickerId } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// TickerStrip — horizontal scrollable row.
// Owns selection state via callbacks (lifted to the page).
// ─────────────────────────────────────────────────────────────────────────────

interface TickerStripProps {
  tickers: Ticker[];
  activeId: TickerId | null;
  onSelect: (id: TickerId | null) => void;
}

export function TickerStrip({ tickers, activeId, onSelect }: TickerStripProps) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
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
  );
}
