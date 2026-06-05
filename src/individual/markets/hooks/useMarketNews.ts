import { useState, useEffect } from "react";
import { fetchMarketNews } from "../api";
import type { NewsItem, StoryItem } from "../types";

interface UseMarketNewsReturn {
  news:      NewsItem[];
  stories:   StoryItem[];
  isLoading: boolean;
  error:     string | null;
}

export function useMarketNews(): UseMarketNewsReturn {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [stories, setStories]     = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMarketNews()
      .then((r) => { if (!cancelled) { setNews(r.items); setStories(r.stories); } })
      .catch(() => { if (!cancelled) setError("Could not load news."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { news, stories, isLoading, error };
}
