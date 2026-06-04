import { useState, useEffect } from "react";
import { fetchMarketNews } from "../api";
import type { NewsItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// useMarketNews — isolated from ticker data; could be on a different refresh
// ─────────────────────────────────────────────────────────────────────────────

interface UseMarketNewsReturn {
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
}

export function useMarketNews(): UseMarketNewsReturn {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMarketNews()
      .then((r) => { if (!cancelled) setNews(r.items); })
      .catch(() => { if (!cancelled) setError("Could not load news."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { news, isLoading, error };
}
