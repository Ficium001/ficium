import { Newspaper } from "lucide-react";
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_BG } from "../config/tickers";
import type { NewsItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// MarketNewsFeed — full-width news list below the rates panels.
// Each item is expandable with the plain-English "what this means for you".
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  news: NewsItem[];
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MarketNewsFeed({ news }: Props) {
  if (!news.length) return null;
  return (
    <section aria-label="Market news">
      <div className="flex items-center gap-3 mb-1">
        <Newspaper size={14} className="text-muted shrink-0" />
        <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
          Market News
        </span>
        <div className="flex-1 h-px bg-ink/[0.07]" />
      </div>
      <p className="text-[12px] text-muted/70 mb-3 ml-[26px]">
        Today's headlines from Mauritius and global markets
      </p>

      <div className="bg-white rounded-2xl border border-ink/6 divide-y divide-ink/4 lg:grid lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
        {news.map((item) => {
          const tagColor = NEWS_CATEGORY_COLORS[item.category] ?? "#64748b";
          const tagBg    = NEWS_CATEGORY_BG[item.category]    ?? "#f1f5f9";
          return (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-ink/4 last:border-0 lg:border-b lg:odd:border-b lg:even:border-b">
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
                  <span className="text-[11px] text-muted">
                    {timeAgo(item.publishedAt)}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-ink leading-snug">
                  {item.headline}
                </p>
                <p className="text-[12px] text-muted mt-1 leading-relaxed">
                  {item.plainEnglish}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
