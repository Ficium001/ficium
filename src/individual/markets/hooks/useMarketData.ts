import { useState, useEffect, useCallback } from "react";
import { fetchMarketData } from "../api";
import { TICKER_CONFIGS, TICKER_ORDER } from "../config/tickers";
import type { Ticker, MarketDataResult, FxRate, DepositRateRow, LendingRateRow } from "../types";

interface UseMarketDataReturn {
  tickers:      Ticker[];
  fxRates:      FxRate[];
  depositRates: DepositRateRow[];
  lendingRates: LendingRateRow[];
  isLoading:    boolean;
  isRefreshing: boolean;
  error:        string | null;
  lastUpdated:  Date | null;
  refresh:      () => void;
}

export function useMarketData(): UseMarketDataReturn {
  const [result, setResult]             = useState<MarketDataResult | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const data = await fetchMarketData();
      setResult(data);
      setError(null);
    } catch {
      setError("Could not load market data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMarketData();
        if (!cancelled) { setResult(data); setError(null); }
      } catch {
        if (!cancelled) setError("Could not load market data. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => void load(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const tickers: Ticker[] = TICKER_ORDER.map((id) => ({
    ...TICKER_CONFIGS[id],
    reading: result?.readings[id] ?? null,
  }));

  return {
    tickers,
    fxRates:      result?.fxRates      ?? [],
    depositRates: result?.depositRates ?? [],
    lendingRates: result?.lendingRates ?? [],
    isLoading,
    isRefreshing,
    error,
    lastUpdated: result?.fetchedAt ?? null,
    refresh: () => load(true),
  };
}
