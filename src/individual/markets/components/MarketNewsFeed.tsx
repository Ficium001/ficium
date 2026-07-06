import { useMemo, useState } from "react";
import { Newspaper, Sparkles, ExternalLink, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_BG } from "../config/tickers";
import { filterByScope } from "../lib/ranking";
import type { NewsItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// MarketNewsFeed — personalised, scope-filterable headline feed.
//   - Scope chips: All / Mauritius / World
//   - "For you" badge on items matching the user's saved preferences
//   - Expandable detail body with real publisher attribution + link
// Items arrive pre-ranked (lib/ranking via useMarketNews).
// ─────────────────────────────────────────────────────────────────────────────

type ScopeFilter = "all" | "local" | "global";

const SCOPE_CHIPS: { id: ScopeFilter; label: string }[] = [
  { id: "all",    label: "All" },
  { id: "local",  label: "Mauritius" },
  { id: "global", label: "World" },
];

interface Props {
  news:           NewsItem[];
  forYouIds?:     Set<string>;
  onPersonalise?: () => void;
  /** Whether the user has saved preferences — drives the button label. */
  personalised?:  boolean;
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MarketNewsFeed({ news, forYouIds, onPersonalise, personalised }: Props) {
  const [scope, setScope]           = useState<ScopeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = useMemo(() => filterByScope(news, scope), [news, scope]);

  if (!news.length) return null;

  return (
    <section aria-label="Market news">
      {/* Section head */}
      <div className="flex items-center gap-3 mb-1">
        <Newspaper size={14} className="text-muted shrink-0" />
        <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
          Market News
        </span>
        <div className="flex-1 h-px bg-ink/[0.07]" />
        {onPersonalise && (
          <button
            onClick={onPersonalise}
            className="flex items-center gap-1.5 text-[11px] font-bold text-ficium hover:text-ficium-deep transition-colors"
          >
            <SlidersHorizontal size={12} />
            {personalised ? "Edit preferences" : "Personalise"}
          </button>
        )}
      </div>
      <p className="text-[12px] text-muted/70 mb-3 ml-[26px]">
        Real headlines from Mauritius and world markets, explained in plain English
      </p>

      {/* Scope chips */}
      <div className="flex gap-1.5 mb-3" role="radiogroup" aria-label="News coverage">
        {SCOPE_CHIPS.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={scope === c.id}
            onClick={() => setScope(c.id)}
            className={[
              "px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all border",
              scope === c.id
                ? "bg-ink text-white border-transparent"
                : "bg-white text-muted border-ink/10 hover:text-ink",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink/6 px-4 py-6 text-center text-[12px] text-muted">
          No {scope === "local" ? "Mauritius" : "world"} headlines right now — check back after the next refresh.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink/6 divide-y divide-ink/4">
          {visible.map((item) => {
            const tagColor = NEWS_CATEGORY_COLORS[item.category] ?? "#64748b";
            const tagBg    = NEWS_CATEGORY_BG[item.category]    ?? "#f1f5f9";
            const isForYou = forYouIds?.has(item.id) ?? false;
            const isOpen   = expandedId === item.id;
            const hasMore  = Boolean(item.body || item.sourceUrl);

            return (
              <div key={item.id} className="px-4 py-3.5">
                <button
                  onClick={() => hasMore && setExpandedId((p) => (p === item.id ? null : item.id))}
                  aria-expanded={hasMore ? isOpen : undefined}
                  className="w-full text-left flex items-start gap-3"
                >
                  {/* Emoji icon */}
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: tagBg }}
                    aria-hidden="true"
                  >
                    {item.emoji}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: tagBg, color: tagColor }}
                      >
                        {item.category}
                      </span>
                      {item.scope === "global" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ink/5 text-ink/60">
                          World
                        </span>
                      )}
                      {isForYou && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ficium/10 text-ficium">
                          <Sparkles size={9} /> For you
                        </span>
                      )}
                      <span className="text-[11px] text-muted">
                        {timeAgo(item.publishedAt)}
                        {item.sourceName ? ` · ${item.sourceName}` : ""}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-ink leading-snug">
                      {item.headline}
                    </p>
                    <p className="text-[12px] text-muted mt-1 leading-relaxed">
                      {item.plainEnglish}
                    </p>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="mt-2.5 pt-2.5 border-t border-ink/6">
                        {item.body && (
                          <p className="text-[12px] text-ink/80 leading-relaxed">
                            {item.body}
                          </p>
                        )}
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-ficium hover:text-ficium-deep transition-colors"
                          >
                            Read at {item.sourceName ?? "source"} <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    )}

                    {hasMore && (
                      <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted/60">
                        {isOpen
                          ? <><ChevronUp size={11} /> Tap to close</>
                          : <><ChevronDown size={11} /> Tap for detail</>
                        }
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
