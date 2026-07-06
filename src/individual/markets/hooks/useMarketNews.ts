import { useEffect, useMemo, useState } from "react";
import { fetchMarketNews } from "../api";
import { rankNews } from "../lib/ranking";
import {
  DEFAULT_MARKET_PREFERENCES,
  type NewsItem, type StoryItem, type MarketPreferences,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// useMarketNews — fetches headlines + stories once, then ranks headlines
// client-side against the user's preferences (pure lib/ranking). Fetching
// and ranking are decoupled so preference edits re-rank instantly with no
// network round-trip.
// ─────────────────────────────────────────────────────────────────────────────

interface UseMarketNewsReturn {
  /** Headlines, most relevant to this user first. */
  news: NewsItem[];
  /** IDs of items that specifically match the user's saved preferences. */
  forYouIds: Set<string>;
  stories: StoryItem[];
  isLoading: boolean;
  error: string | null;
}

export function useMarketNews(
  preferences: MarketPreferences = DEFAULT_MARKET_PREFERENCES,
): UseMarketNewsReturn {
  const [raw, setRaw]             = useState<NewsItem[]>([]);
  const [stories, setStories]     = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMarketNews()
      .then((r) => { if (!cancelled) { setRaw(r.items); setStories(r.stories); } })
      .catch(() => { if (!cancelled) setError("Could not load news."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { ranked, forYouIds } = useMemo(
    () => rankNews(raw, preferences),
    [raw, preferences],
  );

  return { news: ranked, forYouIds, stories, isLoading, error };
}
