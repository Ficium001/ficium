import { useState }          from "react";
import { BottomNav }         from "@/shared/ui";
import { useMarketData }     from "@/individual/markets/hooks";
import { useMarketNews }     from "@/individual/markets/hooks";
import {
  MarketHeader,
  TickerStrip,
  StoryCallout,
  RatesPanel,
  RatesSummaryBar,
  FxBestRates,
  MarketNewsFeed,
  StoryModeToggle,
  StoriesGrid,
  FiciumCTA,
}                            from "@/individual/markets/components";
import type { TickerId, StoryMode } from "@/individual/markets/types";

// ─────────────────────────────────────────────────────────────────────────────
// Markets page — thin orchestrator only.
// Layout (top → bottom):
//   1. Gradient header + MarketHeader bar
//   2. TickerStrip (horizontal scroll)
//   3. StoryCallout (appears when a ticker is active)
//   4. RatesPanel — deposit & lending side by side
//   5. RatesSummaryBar — AI one-liner
//   6. FxBestRates — best rate across all Mauritius banks
//   7. MarketNewsFeed — full-width expandable news
//   8. StoryModeToggle + StoriesGrid — everyday / finance stories
//   9. FiciumCTA
// ─────────────────────────────────────────────────────────────────────────────

export default function Markets() {
  const {
    tickers, fxRates, depositRates, lendingRates,
    isRefreshing, lastUpdated, refresh,
  } = useMarketData();

  const { news, stories } = useMarketNews();

  const [activeId,   setActiveId]   = useState<TickerId | null>(null);
  const [storyMode,  setStoryMode]  = useState<StoryMode>("everyday");

  const activeTicker = activeId
    ? tickers.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <div className="min-h-screen pb-28 relative">

      {/* ── Background gradient (header only) ────────────────────────────── */}
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

      <div className="relative z-10 mx-auto w-full max-w-[720px] px-4 pt-6 space-y-5">

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

        {/* 3 ── Story callout (conditional) */}
        {activeTicker && <StoryCallout ticker={activeTicker} />}

        {/* 4 ── Rates panels */}
        <RatesPanel depositRates={depositRates} lendingRates={lendingRates} />

        {/* 5 ── AI summary bar */}
        <RatesSummaryBar
          summary="Rates are stable. Repo rate unchanged. Best time to refinance and optimise your debt."
        />

        {/* 6 ── FX best rates */}
        <FxBestRates rates={fxRates} />

        {/* 7 ── Market news (full-width, below rates) */}
        <MarketNewsFeed news={news} />

        {/* 8 ── Stories: mode toggle + grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                Financial Stories
              </span>
              <div className="h-px w-12 bg-ink/[0.07]" />
            </div>
            <StoryModeToggle mode={storyMode} onChange={setStoryMode} />
          </div>
          <StoriesGrid stories={stories} mode={storyMode} />
        </div>

        {/* 9 ── CTA */}
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
