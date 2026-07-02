/**
 * api/_lib/intelligence-service.ts
 * ─────────────────────────────────────────────────────────────
 * The Intelligence Service is the single source of truth for
 * all market data consumed by Claude and the frontend.
 *
 * Architecture:
 *   App DB view (v_request_patterns)         ─┐
 *   Portal DB via portal-api                  ├─→ IntelligenceService.fetch() → ServerCache → Claude prompts
 *   (/public/market-intelligence: rates,       │                                             → /api/intelligence
 *    acceptance, competitiveness)             ─┘
 *
 * Request-demand data (v_request_patterns) is still computed as an App DB
 * view — request rows live there. Rate/acceptance/competitiveness data is
 * NOT: bids live in the Portal DB's marketplace.bid table since the
 * institution-portal migration, so those three aggregates are computed by
 * portal-api and fetched over the same service-secret channel used by
 * /api/request-bids-bulk.
 */
import { ServerCache, CacheKeys } from "./cache.js";
import { getServiceDb } from "./db.js";
import { Env } from "./env.js";
import type {
  FiciumIntelligence,
  MarketRate,
  RequestPattern,
  AcceptanceIntel,
  MarketCompetitiveness,
} from "../../src/shared/lib/intelligence-types.js";

const CACHE_TTL_SECS = 300; // 5 minutes

// Rates/acceptance/competitiveness now live entirely in the Portal DB
// (marketplace.bid), not the App DB — the App-side v_market_rates,
// v_acceptance_intelligence, and v_market_competitiveness views were
// written against a legacy institution.institution_bids table that no
// longer exists post the institution-portal migration, and were never
// repointed. Rather than resurrect App DB views for data that isn't
// there, fetch the equivalent aggregate from portal-api's
// GET /public/market-intelligence, same service-secret pattern already
// used by /api/request-bids-bulk. v_request_patterns is unaffected —
// request demand data is still local to the App DB — so that stays a
// direct query.
async function _fetchMarketplaceIntel(): Promise<{
  marketRates: MarketRate[];
  acceptanceIntel: AcceptanceIntel[];
  competitiveness: MarketCompetitiveness[];
}> {
  const portalUrl = Env.portalApiUrl();
  const secret    = Env.appServiceSecret();
  const empty     = { marketRates: [], acceptanceIntel: [], competitiveness: [] };
  if (!portalUrl || !secret) return empty;

  try {
    const res = await fetch(`${portalUrl}/public/market-intelligence`, {
      headers: { "X-Service-Secret": secret },
    });
    if (!res.ok) return empty;
    const data = await res.json() as {
      marketRates?: MarketRate[];
      acceptanceIntel?: AcceptanceIntel[];
      competitiveness?: MarketCompetitiveness[];
    };
    return {
      marketRates:     (data.marketRates     ?? []) as MarketRate[],
      acceptanceIntel: (data.acceptanceIntel ?? []) as AcceptanceIntel[],
      competitiveness: (data.competitiveness ?? []) as MarketCompetitiveness[],
    };
  } catch {
    return empty; // degrade gracefully — request patterns still work
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
