import { ArrowRight } from "lucide-react";
import type { FxRate } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// FxBestRates — "Best exchange rate today across all Mauritius banks".
// The most differentiated feature on the page: no other Mauritian app shows this.
// Pure presentational — receives FxRate[] from the hook.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  rates: FxRate[];
}

export function FxBestRates({ rates }: Props) {
  if (!rates.length) return null;
  return (
    <section aria-label="Best FX rates across Mauritius banks">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
          Best exchange rates today
        </span>
        <div className="flex-1 h-px bg-ink/[0.07]" />
        <span className="text-[11px] text-muted">All Mauritius banks</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rates.map((r) => (
          <div
            key={r.currencyCode}
            className="bg-white rounded-2xl border border-ink/[0.06] p-3.5"
          >
            <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">
              {r.currency}
            </p>
            <p className="text-[11px] font-semibold text-mint-700 mb-0.5 text-green-700">
              {r.bestBank}
            </p>
            <p className="text-[22px] font-bold text-ink tabular-nums leading-none mb-1">
              {r.bestRate.toFixed(2)}
            </p>
            <p className="text-[11px] font-semibold text-green-600">
              Save {r.savingPer1000}
            </p>
          </div>
        ))}
      </div>
      <button className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-ficium hover:text-ficium-deep transition-colors">
        Compare all rates <ArrowRight size={12} />
      </button>
    </section>
  );
}
