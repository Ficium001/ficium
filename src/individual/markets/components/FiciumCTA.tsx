import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// FiciumCTA — conversion banner at the bottom of Markets.
// Isolated so copy/styling can be A/B tested independently.
// ─────────────────────────────────────────────────────────────────────────────

export function FiciumCTA() {
  return (
    <div className="rounded-2xl overflow-hidden bg-hero">
      <div className="p-5">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
          Ficium Tip
        </div>
        <p className="text-[15px] font-semibold text-white leading-snug mb-4">
          Banks on Ficium are competing right now — lending rates are easing.
          Lock in a great deal before they rise again.
        </p>
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 bg-ficium text-white text-[13px] font-bold px-5 py-2.5 rounded-xl no-underline hover:opacity-90 transition-opacity"
        >
          Post a Request
          <TrendingUp size={14} />
        </Link>
      </div>
    </div>
  );
}
