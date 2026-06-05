import { useState, useEffect, useRef } from "react";
import { streamClaude }                from "@/shared/lib/claude";
import type { MarketDataResult }       from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// useAiMarketSummary — streams an AI-generated one-sentence market summary.
// Re-generates when market data changes meaningfully.
// Caches result for 30 min to avoid redundant API calls.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000;
let cachedSummary   = "";
let cacheTimestamp  = 0;

interface UseAiMarketSummaryReturn {
  summary:     string;
  isStreaming: boolean;
  error:       string | null;
}

export function useAiMarketSummary(
  marketData: MarketDataResult | null,
): UseAiMarketSummaryReturn {
  const [summary,     setSummary]     = useState(cachedSummary);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!marketData) return;

    // Use cache if fresh
    if (cachedSummary && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      setSummary(cachedSummary);
      return;
    }

    const { readings } = marketData;
    const snap = {
      repoRate:        readings.repo_rate?.displayValue        ?? "4.00%",
      usdMur:          readings.usd_mur?.displayValue          ?? "—",
      eurMur:          readings.eur_mur?.displayValue          ?? "—",
      gbpMur:          readings.gbp_mur?.displayValue          ?? "—",
      semdex:          readings.semdex?.displayValue           ?? "—",
      inflation:       readings.inflation_yoy?.displayValue    ?? "—",
      usdChange:       readings.usd_mur?.change                ?? 0,
      semdexChange:    readings.semdex?.change                 ?? 0,
      inflationChange: readings.inflation_yoy?.change          ?? 0,
    };

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let streamed = "";
    setIsStreaming(true);
    setError(null);

    streamClaude(
      "/api/market-summary",
      snap,
      {
        onToken: (t) => {
          streamed += t;
          setSummary(streamed);
        },
        onDone: (full) => {
          cachedSummary  = full;
          cacheTimestamp = Date.now();
          setSummary(full);
          setIsStreaming(false);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
          // Fallback to static summary so the bar never appears broken
          if (!streamed) {
            setSummary("Rates are stable. Check the tickers above for today's key numbers.");
          }
        },
      },
    );

    return () => abortRef.current?.abort();
  }, [marketData]);

  return { summary, isStreaming, error };
}
