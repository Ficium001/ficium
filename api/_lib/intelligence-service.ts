/**
 * api/_lib/intelligence-service.ts
 * ─────────────────────────────────────────────────────────────
 * The Intelligence Service is the single source of truth for
 * all market data consumed by Claude and the frontend.
 *
 * Architecture:
 *   DB views → IntelligenceService.fetch() → ServerCache → Claude prompts
 *                                                        → /api/intelligence
 *
 * To upgrade to pre-computed (pg_cron + materialised table):
 *   Replace the DB view queries in _fetchFromDb() with a single
 *   `SELECT * FROM platform_intelligence ORDER BY created_at DESC LIMIT 1`
 *   Zero other changes needed.
 */
import { ServerCache, CacheKeys } from "./cache";
import { getServiceDb } from "./db";
import type {
  FiciumIntelligence,
  MarketRate,
  RequestPattern,
  AcceptanceIntel,
  MarketCompetitiveness,
} from "../../src/lib/intelligence-types";

const CACHE_TTL_SECS = 300; // 5 minutes

async function _fetchFromDb(): Promise<FiciumIntelligence> {
  const db = getServiceDb();

  // All 4 queries run in parallel — one DB round-trip total
  const [
    { data: rates       = [] },
    { data: patterns    = [] },
    { data: acceptances = [] },
    { data: competition = [] },
  ] = await Promise.all([
    db.from("v_market_rates").select("*"),
    db.from("v_request_patterns").select("*"),
    db.from("v_acceptance_intelligence").select("*"),
    db.from("v_market_competitiveness").select("*"),
  ]);

  return {
    generatedAt:     new Date().toISOString(),
    marketRates:     (rates        ?? []) as MarketRate[],
    requestPatterns: (patterns     ?? []) as RequestPattern[],
    acceptanceIntel: (acceptances  ?? []) as AcceptanceIntel[],
    competitiveness: (competition  ?? []) as MarketCompetitiveness[],
    summary:         _buildSummary(
      (rates        ?? []) as MarketRate[],
      (patterns     ?? []) as RequestPattern[],
      (acceptances  ?? []) as AcceptanceIntel[],
      (competition  ?? []) as MarketCompetitiveness[],
    ),
  };
}

function _buildSummary(
  rates:         MarketRate[],
  patterns:      RequestPattern[],
  acceptances:   AcceptanceIntel[],
  competitiveness: MarketCompetitiveness[],
): string {
  if (!rates.length && !patterns.length) {
    return "Market data: platform is early stage — insufficient data yet.";
  }

  const lines: string[] = [
    "=== FICIUM LIVE MARKET INTELLIGENCE (anonymised, last 90 days) ===",
  ];

  if (rates.length) {
    lines.push("\nCURRENT MARKET RATES:");
    for (const r of rates) {
      const pt = r.product_type.replace(/_/g, " ");
      lines.push(
        `  ${pt}: avg ${r.avg_rate_pct}% APR | range ${r.min_rate_pct}–${r.max_rate_pct}%` +
        ` | IQR ${r.p25_rate_pct}–${r.p75_rate_pct}% | ${r.bid_count} bids / ${r.request_count} requests`
      );
    }
  }

  if (patterns.length) {
    lines.push("\nDEMAND PATTERNS:");
    for (const p of patterns) {
      const pt = p.product_type.replace(/_/g, " ");
      lines.push(
        `  ${pt}: avg MUR ${Number(p.avg_amount).toLocaleString()} | ` +
        `${p.avg_term_months}mo avg | ${p.close_rate_pct ?? 0}% close rate | ${p.open_requests} open now`
      );
    }
  }

  if (acceptances.length) {
    lines.push("\nWINNING BID PATTERNS:");
    for (const a of acceptances) {
      const diff    = a.rate_vs_market_avg_pct;
      const diffStr = diff < 0
        ? `${Math.abs(diff)}% below market avg`
        : `${diff}% above market avg`;
      lines.push(
        `  ${a.product_type.replace(/_/g, " ")}: wins avg ${a.avg_winning_rate_pct}% (${diffStr}) | ${a.total_acceptances} deals`
      );
    }
  }

  if (competitiveness.length) {
    lines.push("\nCOMPETITIVENESS:");
    for (const c of competitiveness) {
      lines.push(
        `  ${c.product_type.replace(/_/g, " ")}: ${c.active_institutions} institutions | avg ${c.avg_bids_per_request} bids/request`
      );
    }
  }

  lines.push("\nUse this data. Do not invent rates. If no data for a product, say so.");
  return lines.join("\n");
}

// ── Public API ────────────────────────────────────────────────

export const IntelligenceService = {
  /**
   * Fetch intelligence with caching.
   * Subsequent calls within 5 min return cached data — zero DB queries.
   */
  async fetch(): Promise<FiciumIntelligence> {
    return ServerCache.get(CacheKeys.INTELLIGENCE, CACHE_TTL_SECS, _fetchFromDb);
  },

  /**
   * Returns just the Claude-ready summary string.
   * Most callers only need this — avoids deserialising the full payload.
   */
  async getSummary(): Promise<string> {
    const intel = await this.fetch();
    return intel.summary;
  },

  /** Force-refresh the cache (call after new bids/acceptances if needed) */
  invalidate(): void {
    ServerCache.invalidate(CacheKeys.INTELLIGENCE);
  },
} as const;
