import { Sparkles, ArrowRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// RatesSummaryBar — AI-generated one-liner summary beneath the rate panels.
// Pure presentational; summary text fed in as prop (generated server-side).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  summary: string;
  onReadMore?: () => void;
}

export function RatesSummaryBar({ summary, onReadMore }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-ficium/20 bg-ficium/[0.04] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Sparkles size={16} className="text-ficium flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-ficium uppercase tracking-widest mb-0.5">
            Ficium Market Summary
          </p>
          <p className="text-[13px] text-ink/80 truncate">{summary}</p>
        </div>
      </div>
      {onReadMore && (
        <button
          onClick={onReadMore}
          className="flex items-center gap-1 text-[12px] font-semibold text-ficium whitespace-nowrap hover:text-ficium-deep transition-colors flex-shrink-0"
        >
          Read full summary <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
