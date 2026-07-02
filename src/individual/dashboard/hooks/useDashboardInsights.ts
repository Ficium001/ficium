import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, BarChart2 } from "lucide-react";
import { useIntelligence }    from "@/shared/lib/intelligence";
import { FALLBACK_INSIGHTS }  from "@/individual/dashboard/config/dashboard";
import type { InsightItem }   from "@/individual/dashboard/config/dashboard";

// ── useDashboardInsights ──────────────────────────────────────────────────────
// Builds the rotating insight cards from live market intelligence data.
// Falls back to static copy while intel loads or when no data is available.
// Owns the rotation timer so the page doesn't need to know about it.

export function useDashboardInsights() {
  const { intel }     = useIntelligence();
  const [idx, setIdx] = useState(0);

  const hasLiveData = Boolean(
    intel?.marketRates?.length || intel?.acceptanceIntel?.length || intel?.requestPatterns?.length
  );

  const live: InsightItem[] = hasLiveData
    ? [
        ...(intel?.marketRates?.slice(0, 2).map((r) => ({
          icon:  BarChart2,
          color: "#4f46e5",
          bg:    "rgba(79,70,229,0.12)",
          text:  `${r.product_type.replace(/_/g, " ")} on Ficium: avg ${r.avg_rate_pct}% APR — ${r.bid_count} competing bids across ${r.request_count} requests`,
          type:  "info" as const,
        })) ?? []),
        ...(intel?.acceptanceIntel?.slice(0, 1).map((a) => ({
          icon:  TrendingUp,
          color: "#16a34a",
          bg:    "rgba(22,163,74,0.12)",
          text:  `Winning bids for ${a.product_type.replace(/_/g, " ")} average ${a.avg_winning_rate_pct}% — ${a.total_acceptances} deals closed in the last 90 days`,
          type:  "positive" as const,
        })) ?? []),
        ...(intel?.requestPatterns?.slice(0, 2).map((p) => ({
          icon:  AlertTriangle,
          color: "#d97706",
          bg:    "rgba(217,119,6,0.12)",
          text:  `${p.open_requests} ${p.product_type.replace(/_/g, " ")} request${p.open_requests === 1 ? "" : "s"} open now — avg amount MUR ${Number(p.avg_amount).toLocaleString()}`,
          type:  "warning" as const,
        })) ?? []),
      ]
    : FALLBACK_INSIGHTS;

  const insights = live.length ? live : FALLBACK_INSIGHTS;

  // Rotate every 5 seconds
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % insights.length), 5000);
    return () => clearInterval(t);
  }, [insights.length]);

  return {
    insights,
    activeIdx: idx,
    next: () => setIdx((i) => (i + 1) % insights.length),
  };
}
