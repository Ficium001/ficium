import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_BG } from "../config/tickers";
import type { StoryItem, StoryMode } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// StoriesGrid — 2-column grid of expandable story cards.
// Each card flips between everyday and finance mode based on StoryModeToggle.
// Responsive: single column on mobile.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  stories: StoryItem[];
  mode:    StoryMode;
}

export function StoriesGrid({ stories, mode }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (!stories.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stories.map((s) => {
        const content  = mode === "everyday" ? s.everyday : s.finance;
        const isOpen   = expandedId === s.id;
        const tagColor = NEWS_CATEGORY_COLORS[s.category] ?? "#64748b";
        const tagBg    = NEWS_CATEGORY_BG[s.category]    ?? "#f1f5f9";

        return (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            aria-expanded={isOpen}
            className={[
              "w-full text-left bg-white rounded-2xl border transition-all",
              isOpen
                ? "border-ficium/30 shadow-[0_0_0_2px_rgba(42,31,230,0.08)]"
                : "border-ink/[0.06] hover:border-ink/[0.14]",
            ].join(" ")}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-0">
                <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
                  {s.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2"
                    style={{ background: tagBg, color: tagColor }}
                  >
                    {s.category}
                  </span>
                  <p
                    className={[
                      "text-ink leading-snug",
                      mode === "everyday"
                        ? "text-[14px] font-semibold"
                        : "text-[12px] font-medium tabular-nums",
                    ].join(" ")}
                  >
                    {content.headline}
                  </p>
                </div>
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-ink/[0.06]">
                  <p className="text-[12px] text-muted leading-relaxed">
                    {content.plain}
                  </p>
                  {s.relatedCTA && (
                    <Link
                      to="/requests/new"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-ficium hover:text-ficium-deep transition-colors"
                    >
                      Post a Request on Ficium <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              )}

              {/* Expand hint */}
              <div className="flex items-center gap-1 mt-2.5 text-[11px] text-muted/60">
                {isOpen
                  ? <><ChevronUp size={11} /> Tap to close</>
                  : <><ChevronDown size={11} /> Tap to read more</>
                }
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
