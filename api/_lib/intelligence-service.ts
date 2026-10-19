/**
 * api/_lib/intelligence-service.ts
 * ─────────────────────────────────────────────────────────────
 * The Intelligence Service is the single source of truth for
 * all market data consumed by Claude and the frontend.
 *
 * Architecture:
 *   App DB view (v_request_patterns)                ─┐
 *   market.intelligence snapshot (contract 1.10:     ├─→ IntelligenceService.fetch() → ServerCache → Claude prompts
 *    rates, acceptance, competitiveness)            ─┘                                             → /api/intelligence
 *
 * Request demand is this app's own data. Rate/acceptance/competitiveness data is institution-side (bids), so it
 * arrives as a contract event and is read from this side's snapshot: no direct call to the portal.
 */
import { ServerCache, CacheKeys } from "./cache.js";
import { getServiceDb } from "./db.js";
import type {
  FiciumIntelligence,
  MarketRate,
  RequestPattern,
  AcceptanceIntel,
  MarketCompetitiveness,
} from "../../src/shared/lib/intelligence-types.js";

const CACHE_TTL_SECS = 300; // 5 minutes

// Rates, acceptance and competitiveness are institution-side data (bids). They arrive as the
// market.intelligence contract event (1.10) and are read from this side's snapshot. Request
// demand (v_request_patterns) is this app's own data and stays a direct query.
async function _fetchMarketplaceIntel(): Promise<{
  marketRates: MarketRate[];
  acceptanceIntel: AcceptanceIntel[];
  competitiveness: MarketCompetitiveness[];
}> {
  // The latest market.intelligence snapshot (contract 1.10), received from the institution side.
  // No call to portal-api: that used the shared service secret, a direct link between the apps.
  const empty = { marketRates: [], acceptanceIntel: [], competitiveness: [] };
  try {
    const { data, error } = await (getServiceDb() as any).rpc("integration_market_intelligence");
    if (error || !data) return empty;
    return {
      marketRates:     (data.marketRates     ?? []) as MarketRate[],
      acceptanceIntel: (data.acceptanceIntel ?? []) as AcceptanceIntel[],
      competitiveness: (data.competitiveness ?? []) as MarketCompetitiveness[],
    };
  } catch {
    return empty; // degrade gracefully: request patterns still work
  }
}

async function _fetchFromDb(): Promise<FiciumIntelligence> {
  const db = getServiceDb();

  const [
    { data: patterns = [] },
    marketplaceIntel,
  ] = await Promise.all([
    db.from("v_request_patterns").select("*"),
    _fetchMarketplaceIntel(),
  ]);

  const rates       = marketplaceIntel.marketRates;
  const acceptances = marketplaceIntel.acceptanceIntel;
  const competition = marketplaceIntel.competitiveness;

  return {
    generatedAt:     new Date().toISOString(),
    marketRates:     rates,
    requestPatterns: (patterns     ?? []) as RequestPattern[],
    acceptanceIntel: acceptances,
    competitiveness: competition,
    summary:         _buildSummary(
      rates,
      (patterns ?? []) as RequestPattern[],
      acceptances,
      competition,
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
