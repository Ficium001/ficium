import { ArrowRight } from "lucide-react";
import type { DepositRateRow, LendingRateRow } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// RatesPanel — two-column deposit & lending rate tables.
// Responsive: stacks to single column on mobile.
// Pure presentational.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  depositRates: DepositRateRow[];
  lendingRates: LendingRateRow[];
}

export function RatesPanel({ depositRates, lendingRates }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* ── Deposit rates ── */}
      <div className="bg-white rounded-2xl border border-ink/[0.06] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-ink">Deposit Rates (%)</h3>
          <button className="flex items-center gap-1 text-[11px] font-semibold text-ficium hover:text-ficium-deep transition-colors">
            Compare all banks <ArrowRight size={11} />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 mb-1.5">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Bank</span>
          {["1 Yr", "2 Yr", "3 Yr"].map((h) => (
            <span key={h} className="text-[10px] font-bold text-muted uppercase tracking-wide text-right w-10">
              {h}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {depositRates.map((row) => (
            <div key={row.bank} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-1.5 border-b border-ink/[0.04] last:border-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: row.color }}
                />
                <span className="text-[12px] font-medium text-ink">{row.bank}</span>
              </div>
              {[row.rate1y, row.rate2y, row.rate3y].map((r, i) => (
                <span key={i} className="text-[12px] font-semibold text-ink tabular-nums text-right w-10">
                  {r}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Lending rates ── */}
      <div className="bg-white rounded-2xl border border-ink/[0.06] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-ink">Lending Rates (Best Available)</h3>
          <button className="flex items-center gap-1 text-[11px] font-semibold text-ficium hover:text-ficium-deep transition-colors">
            Compare all <ArrowRight size={11} />
          </button>
        </div>

        <div className="space-y-2">
          {lendingRates.map((row) => (
            <div key={row.product} className="flex items-center justify-between py-1.5 border-b border-ink/[0.04] last:border-0">
              <span className="text-[12px] text-muted">{row.product}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-ink tabular-nums">{row.bestRate}</span>
                {row.isBest && (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">
                    Best
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
