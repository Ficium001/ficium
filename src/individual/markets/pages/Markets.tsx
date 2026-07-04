import { useState }           from "react";
import { RefreshCw }          from "lucide-react";
import { BottomNav }          from "@/shared/ui";
import {
  Hero, HeroButton, GradText, Reveal, SectionHead, type HeroStat,
}                             from "@/shared/ui/dashboard";
import { FiciumLogo }         from "@/shared/ui/FiciumLogo";
import { useNavigate }        from "react-router-dom";
import {
  useMarketData,
  useMarketNews,
  useAiMarketSummary,
}                             from "@/individual/markets/hooks";
import {
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
// Markets page — thin orchestrator. 2026 revamp: storytelling Hero header
// (replaces the bespoke gradient + MarketHeader), Reveal section entrances.
// All market components and data hooks preserved.
// ─────────────────────────────────────────────────────────────────────────────

export default function Markets() {
  const navigate = useNavigate();
  const {
    tickers, fxRates, _rawResult,
    isRefreshing, lastUpdated, refresh,
  } = useMarketData();

  const { news, stories }                     = useMarketNews();
  const { summary, isStreaming: aiStreaming }  = useAiMarketSummary(_rawResult);

  const [activeId,  setActiveId]  = useState<TickerId | null>(null);
  const [storyMode, setStoryMode] = useState<StoryMode>("everyday");

  const activeTicker = activeId
    ? tickers.find((t) => t.id === activeId) ?? null
    : null;

  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const heroStats: HeroStat[] = [
    { label: "Indicators tracked", value: tickers.length },
    { label: "Banks compared",     value: fxRates.length },
    { label: "Stories today",      value: news.length },
  ];

  return (
    <div className="min-h-screen bg-paper pb-28 relative">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-4 space-y-5">

        {/* Chrome row: logo + live refresh control */}
        <div className="flex items-center justify-between">
          <FiciumLogo heightPx={24} withWordmark wordmarkClassName="text-[18px] text-ink" />
          <button
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="Refresh market data"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-line text-ink/70 text-[12px] font-semibold hover:bg-ink/3 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            Updated {timeLabel}
          </button>
        </div>

        {/* Storytelling hero */}
        <Hero
          eyebrow="LIVE MARKET DATA"
          live
          headline={<>The market,<br /><GradText>in plain language.</GradText></>}
          subline="Live rates and news for Mauritius — explained by AI, grounded in real numbers, so you know exactly how it affects your money."
          actions={
            <>
              <HeroButton onClick={() => navigate("/requests/new")}>Compare provider rates</HeroButton>
              <HeroButton variant="ghost" onClick={() => navigate("/advisor")}>Ask the AI</HeroButton>
            </>
          }
          stats={heroStats}
        />

        {/* Ticker strip */}
        <Reveal>
          <TickerStrip tickers={tickers} activeId={activeId} onSelect={setActiveId} />
        </Reveal>

        {/* Ticker story callout */}
        {activeTicker && <StoryCallout ticker={activeTicker} />}

        {/* AI streaming market summary */}
        <Reveal>
          <RatesSummaryBar summary={summary} isStreaming={aiStreaming} />
        </Reveal>

        {/* AI market Q&A — grounded in live data */}
        <Reveal>
          <AiMarketChat marketData={_rawResult} />
        </Reveal>

        {/* Best FX rates across all Mauritius banks */}
        <Reveal>
          <FxBestRates rates={fxRates} />
        </Reveal>

        {/* Market news */}
        <Reveal>
          <MarketNewsFeed news={news} />
        </Reveal>

        {/* Financial stories with mode toggle */}
        <Reveal>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <SectionHead
                title="Financial stories"
                subtitle="Understand how the market affects your money"
              />
              <StoryModeToggle mode={storyMode} onChange={setStoryMode} />
            </div>
            <StoriesGrid stories={stories} mode={storyMode} />
          </div>
        </Reveal>

        {/* CTA */}
        <FiciumCTA />

      </div>

      <BottomNav />
    </div>
  );
}
