import { useState }           from "react";
import { BottomNav }          from "@/shared/ui";
import {
  useMarketData,
  useMarketNews,
  useAiMarketSummary,
}                             from "@/individual/markets/hooks";
import {
  MarketHeader,
  TickerStrip,
  StoryCallout,
  RatesSummaryBar,
  FxBestRates,
  MarketNewsFeed,
  StoryModeToggle,
  StoriesGrid,
  AiMarketChat,
  FiciumCTA,
}                             from "@/individual/markets/components";
import type { TickerId, StoryMode } from "@/individual/markets/types";

// ─────────────────────────────────────────────────────────────────────────────
// Markets page — thin orchestrator only.
// Layout (top → bottom):
//   1. Gradient header + MarketHeader bar
//   2. TickerStrip (scroll on mobile, 8-col grid on desktop)
//   3. StoryCallout (appears when a ticker is active)
//   4. RatesSummaryBar — live-streaming AI one-liner
//   5. AiMarketChat — inline "Ask AI" Q&A, grounded in live data
//   6. FxBestRates — best rate across all Mauritius banks
//   7. MarketNewsFeed — full-width news, 2-col on desktop
//   8. StoryModeToggle + StoriesGrid — everyday / finance stories
//   9. FiciumCTA
// ─────────────────────────────────────────────────────────────────────────────

export default function Markets() {
  const {
    tickers, fxRates, _rawResult,
    isRefreshing, lastUpdated, refresh,
  } = useMarketData();

  const { news, stories }                    = useMarketNews();
  const { summary, isStreaming: aiStreaming } = useAiMarketSummary(_rawResult);

  const [activeId,  setActiveId]  = useState<TickerId | null>(null);
  const [storyMode, setStoryMode] = useState<StoryMode>("everyday");

  const activeTicker = activeId
    ? tickers.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <div className="min-h-screen pb-28 relative">

      {/* ── Background gradient ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[280px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(42,31,230,0.5) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 80% 30%, rgba(8,145,178,0.2) 0%, transparent 55%)",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cream to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-6 space-y-5">

        {/* 1 ── Header */}
        <MarketHeader
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />

        {/* 2 ── Ticker strip */}
        <TickerStrip
          tickers={tickers}
          activeId={activeId}
          onSelect={setActiveId}
        />

        {/* 3 ── Ticker story callout */}
        {activeTicker && <StoryCallout ticker={activeTicker} />}

        {/* 4 ── AI streaming market summary */}
        <RatesSummaryBar summary={summary} isStreaming={aiStreaming} />

        {/* 5 ── AI market Q&A — grounded in live data */}
        <AiMarketChat marketData={_rawResult} />

        {/* 6 ── Best FX rates across all Mauritius banks */}
        <FxBestRates rates={fxRates} />

        {/* 7 ── Market news — full width, 2-col on desktop */}
        <MarketNewsFeed news={news} />

        {/* 8 ── Financial stories with mode toggle */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                  Financial Stories
                </span>
                <div className="h-px w-12 bg-ink/[0.07]" />
              </div>
              <p className="text-[12px] text-muted/70">
                Understand how the market affects your money
              </p>
            </div>
            <StoryModeToggle mode={storyMode} onChange={setStoryMode} />
          </div>
          <StoriesGrid stories={stories} mode={storyMode} />
        </div>

        {/* 9 ── CTA */}
        <FiciumCTA />

      </div>

      <BottomNav />
    </div>
  );
}
