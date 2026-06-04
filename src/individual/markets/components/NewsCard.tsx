import { useState } from "react";
import { NEWS_CATEGORY_COLORS } from "../config/tickers";
import type { NewsItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// NewsCard — one expandable news story.
// Manages its own expanded state (local UI concern, no need to lift).
// ─────────────────────────────────────────────────────────────────────────────

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tagColor = NEWS_CATEGORY_COLORS[item.category] ?? "#64748b";

  return (
    <button
      onClick={() => setExpanded((p) => !p)}
      aria-expanded={expanded}
      className="w-full text-left bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-4 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ficium/30"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
          {item.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white mb-2"
            style={{ background: tagColor }}
          >
            {item.category}
          </span>
          <p className="text-[14px] font-semibold text-ink leading-snug">
            {item.headline}
          </p>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-ink/[0.06]">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">
                What this means for you
              </div>
              <p className="text-[13px] text-muted leading-relaxed">
                {item.plainEnglish}
              </p>
            </div>
          )}

          <div className="text-[11px] text-muted/50 mt-2 font-medium">
            {expanded ? "Tap to close ↑" : "Tap to learn more ↓"}
          </div>
        </div>
      </div>
    </button>
  );
}
