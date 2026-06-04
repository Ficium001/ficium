import { useState }       from "react";
import { Newspaper }      from "lucide-react";
import { BottomNav }      from "../../../shared/ui";
import { useMarketData }  from "../hooks";
import { useMarketNews }  from "../hooks";
import {
  MarketHeader,
  TickerStrip,
  StoryCallout,
  NewsCard,
  FiciumCTA,
}                         from "../components";
import type { TickerId }  from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Markets page — thin orchestrator only.
// No data fetching. No formatting logic. No hardcoded values.
// All domain logic lives in hooks; all UI atoms live in components.
// ─────────────────────────────────────────────────────────────────────────────

export default function Markets() {
  const { tickers, isRefreshing, lastUpdated, refresh } = useMarketData();
  const { news } = useMarketNews();
  const [activeId, setActiveId] = useState<TickerId | null>(null);

  const activeTicker = activeId
    ? tickers.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <div className="min-h-screen pb-28 relative">

      {/* Background gradient */}
      <div className="absolute top-0 left-0 right-0 h-[300px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.45) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(8,145,178,0.25) 0%, transparent 55%)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cream to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[680px] px-4 pt-6 space-y-5">

        <MarketHeader
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />

        <TickerStrip
          tickers={tickers}
          activeId={activeId}
          onSelect={setActiveId}
        />

        {activeTicker && <StoryCallout ticker={activeTicker} />}

        {/* News section */}
        <div className="flex items-center gap-3">
          <Newspaper size={14} className="text-muted flex-shrink-0" />
          <span className="text-[12px] font-bold text-muted uppercase tracking-widest">
            Financial Stories
          </span>
          <div className="flex-1 h-px bg-ink/[0.07]" />
        </div>

        <div className="space-y-3">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>

        <FiciumCTA />

      </div>

      <BottomNav />

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
