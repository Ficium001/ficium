import { Sparkles } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// RatesSummaryBar — AI-generated one-liner market summary.
// Shows a skeleton while streaming, then renders the completed sentence.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  summary:    string;
  isStreaming?: boolean;
}

export function RatesSummaryBar({ summary, isStreaming }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ficium/20 bg-ficium/4 px-4 py-3.5">
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        <Sparkles size={14} className="text-ficium" />
        {isStreaming && (
          <span className="w-1.5 h-1.5 rounded-full bg-ficium animate-pulse" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-ficium uppercase tracking-widest mb-1">
          Ficium AI — Market Summary
        </p>
        {summary ? (
          <p className="text-[13px] text-ink/80 leading-relaxed">{summary}</p>
        ) : (
          <div className="flex gap-1.5 items-center mt-1">
            <div className="h-3 w-48 bg-ink/8 rounded-sm animate-pulse" />
            <div className="h-3 w-24 bg-ink/5 rounded-sm animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
