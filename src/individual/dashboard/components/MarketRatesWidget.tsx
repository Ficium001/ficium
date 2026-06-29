/**
 * MarketRatesWidget
 *
 * Shows current benchmark market rates on the dashboard.
 * Reads from the markets module's ticker data (same source as the
 * Markets page). Falls back to static placeholder rates if no live
 * data is available yet.
 *
 * This is intentionally a thin read-only view — the user taps
 * "View all →" to go to the full Markets page.
 */

import { useNavigate }  from "react-router-dom";
import { TrendingDown } from "lucide-react";

// ─── types ────────────────────────────────────────────────────

type MarketRate = {
  label:   string;
  rate:    string;
  change?: "up" | "down" | "flat";
};

// ─── Static fallback rates ─────────────────────────────────────
// Replaced by live data from the markets hook once available.
// Keep these as conservative Mauritian market benchmarks (MUR).

const FALLBACK_RATES: MarketRate[] = [
  { label: "Home Loan",     rate: "5.95%", change: "flat" },
  { label: "Personal Loan", rate: "10.25%", change: "down" },
  { label: "Fixed Deposit", rate: "6.25%",  change: "up"  },
  { label: "SME Loan",      rate: "7.50%",  change: "flat" },
  { label: "Credit Card",   rate: "18.00%", change: "flat" },
];

// ─── RateRow ──────────────────────────────────────────────────

function RateRow({ rate }: { rate: MarketRate }) {
  const changeColor =
    rate.change === "down" ? "text-emerald-500" :
    rate.change === "up"   ? "text-red-400"     :
    "text-muted";

  const changeIcon =
    rate.change === "down" ? "↓" :
    rate.change === "up"   ? "↑" :
    "";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-ink/[0.05] last:border-0">
      <span className="text-[13px] font-medium text-ink">{rate.label}</span>
      <div className="flex items-center gap-1.5">
        {changeIcon && (
          <span className={`text-[11px] font-bold ${changeColor}`}>
            {changeIcon}
          </span>
        )}
        <span className="text-[14px] font-bold font-display text-ink">
          {rate.rate}
        </span>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────

export function MarketRatesWidget() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ficium/10 grid place-items-center">
            <TrendingDown size={14} className="text-ficium" />
          </div>
          <h2 className="font-display text-[16px] font-bold text-ink">
            Market rates
          </h2>
        </div>
        <button
          onClick={() => navigate("/markets")}
          className="text-[12px] font-semibold text-muted hover:text-ink"
        >
          View all
        </button>
      </div>

      {/* Rate rows */}
      <div>
        {FALLBACK_RATES.map(r => (
          <RateRow key={r.label} rate={r} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-muted mt-3 leading-snug">
        Indicative rates based on MUR market benchmarks.
        Actual offers may vary by institution and eligibility.
      </p>
    </div>
  );
}
