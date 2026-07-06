import { useState } from "react";
import { X, Info, Check } from "lucide-react";
import type { FxRate } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// FxCompareSheet — full per-bank buy/sell breakdown for a currency, opened
// from the "Compare all rates" action in FxBestRates. Currency tabs across
// the top, one bank per row below, best rate highlighted.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  rates: FxRate[];
  open: boolean;
  onClose: () => void;
}

export function FxCompareSheet({ rates, open, onClose }: Props) {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  if (!open || !rates.length) return null;

  const active = rates.find((r) => r.currencyCode === activeCode) ?? rates[0];
  const anyIndicative = rates.some((r) => r.isIndicative);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Compare all bank exchange rates"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-ink/8 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-5 pb-3 flex items-start justify-between border-b border-ink/6">
          <div>
            <h2 className="text-[16px] font-bold text-ink">Compare all rates</h2>
            <p className="text-[12px] text-muted mt-1">
              Every Mauritius bank we track, side by side
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 -mt-1 rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Currency tabs */}
        <div className="flex gap-1.5 px-5 pt-4">
          {rates.map((r) => (
            <button
              key={r.currencyCode}
              onClick={() => setActiveCode(r.currencyCode)}
              aria-pressed={active.currencyCode === r.currencyCode}
              className={[
                "px-3 py-1.5 rounded-pill text-[12px] font-bold transition-all border",
                active.currencyCode === r.currencyCode
                  ? "bg-ink text-white border-transparent"
                  : "bg-white text-muted border-ink/10 hover:text-ink",
              ].join(" ")}
            >
              {r.currencyCode}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {/* Indicative disclaimer */}
          {anyIndicative && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <Info size={13} className="text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Rates shown are <span className="font-semibold">indicative</span> — estimated
                from the live market rate plus each bank's typical spread, not each bank's
                own live counter quote. Confirm the exact rate with the bank before transacting.
              </p>
            </div>
          )}

          {/* Bank rows */}
          <div className="rounded-2xl border border-ink/6 overflow-hidden">
            <div className="grid grid-cols-[1fr,auto,auto] gap-2 px-3.5 py-2 bg-ink/[0.03] text-[10px] font-bold text-muted uppercase tracking-wide">
              <span>Bank</span>
              <span className="text-right">You get (buy)</span>
              <span className="text-right">You pay (sell)</span>
            </div>
            <div className="divide-y divide-ink/4">
              {active.banks.map((b) => {
                const isBest = b.bank === active.bestBank;
                return (
                  <div
                    key={b.bank}
                    className={[
                      "grid grid-cols-[1fr,auto,auto] gap-2 px-3.5 py-2.5 items-center",
                      isBest ? "bg-ficium/[0.04]" : "",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {b.bank}
                      {isBest && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-ficium">
                          <Check size={11} /> Best
                        </span>
                      )}
                    </span>
                    <span className="text-right text-[13px] font-bold tabular-nums text-ink">
                      {b.buyRate.toFixed(active.currencyCode === "ZAR" ? 4 : 2)}
                    </span>
                    <span className="text-right text-[12px] tabular-nums text-muted">
                      {b.sellRate.toFixed(active.currencyCode === "ZAR" ? 4 : 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-muted mt-3">
            Choosing {active.bestBank} over {active.worstBank} saves you{" "}
            <span className="font-semibold text-ink">{active.savingPer1000}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
