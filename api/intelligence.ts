// =============================================================
// Ficium Intelligence API
// Aggregates anonymised market data from DB views and returns
// a structured context object consumed by all Claude endpoints.
// No PII. Service role only (read-only, server-side).
// =============================================================
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

// Types
export type MarketRate = {
  product_type: string;
  bid_count: number;
  request_count: number;
  min_rate_pct: number;
  max_rate_pct: number;
  avg_rate_pct: number;
  p25_rate_pct: number;
  p75_rate_pct: number;
};

export type RequestPattern = {
  product_type: string;
  total_requests: number;
  open_requests: number;
  avg_amount: number;
  median_amount: number;
  avg_term_months: number;
  close_rate_pct: number;
};

export type AcceptanceIntel = {
  product_type: string;
  total_acceptances: number;
  avg_winning_rate_pct: number;
  min_winning_rate_pct: number;
  avg_winning_amount: number;
  avg_winning_term_months: number;
  rate_vs_market_avg_pct: number;
};

export type MarketCompetitiveness = {
  product_type: string;
  active_institutions: number;
  avg_bids_per_request: number;
};

export type FiciumIntelligence = {
  generatedAt: string;
  marketRates: MarketRate[];
  requestPatterns: RequestPattern[];
  acceptanceIntel: AcceptanceIntel[];
  competitiveness: MarketCompetitiveness[];
  summary: string; // Pre-formatted text block for Claude system prompt injection
};

// Build service-role Supabase client (server only, never exposed to client)
function getServiceClient() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase service role env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Format intelligence into a Claude-readable text block
function buildSummary(
  rates: MarketRate[],
  patterns: RequestPattern[],
  acceptances: AcceptanceIntel[],
  competitiveness: MarketCompetitiveness[],
): string {
  if (!rates.length && !patterns.length) {
    return "Market data: insufficient data available yet — platform is early stage.";
  }

  const lines: string[] = ["=== FICIUM LIVE MARKET INTELLIGENCE (anonymised, last 90 days) ===\n"];

  if (rates.length) {
    lines.push("CURRENT MARKET RATES BY PRODUCT:");
    for (const r of rates) {
      const pt = r.product_type.replace(/_/g, " ");
      lines.push(
        `  ${pt}: avg ${r.avg_rate_pct}% APR | range ${r.min_rate_pct}–${r.max_rate_pct}% | ` +
        `IQR ${r.p25_rate_pct}–${r.p75_rate_pct}% | ${r.bid_count} bids on ${r.request_count} requests`
      );
    }
    lines.push("");
  }

  if (patterns.length) {
    lines.push("REQUEST DEMAND PATTERNS:");
    for (const p of patterns) {
      const pt = p.product_type.replace(/_/g, " ");
      lines.push(
        `  ${pt}: avg amount MUR ${Number(p.avg_amount).toLocaleString()} | ` +
        `avg term ${p.avg_term_months}mo | close rate ${p.close_rate_pct ?? 0}% | ${p.open_requests} open now`
      );
    }
    lines.push("");
  }

  if (acceptances.length) {
    lines.push("WINNING BID CHARACTERISTICS:");
    for (const a of acceptances) {
      const pt = a.product_type.replace(/_/g, " ");
      const diff = a.rate_vs_market_avg_pct;
      const diffStr = diff < 0 ? `${Math.abs(diff)}% below market avg` : `${diff}% above market avg`;
      lines.push(
        `  ${pt}: winning rate avg ${a.avg_winning_rate_pct}% (${diffStr}) | ` +
        `${a.total_acceptances} deals closed`
      );
    }
    lines.push("");
  }

  if (competitiveness.length) {
    lines.push("MARKETPLACE COMPETITIVENESS:");
    for (const c of competitiveness) {
      const pt = c.product_type.replace(/_/g, " ");
      lines.push(
        `  ${pt}: ${c.active_institutions} institutions bidding | avg ${c.avg_bids_per_request} bids/request`
      );
    }
    lines.push("");
  }

  lines.push("Use this data to give accurate, grounded advice. Do not invent rates. If a product has no data, say so.");

  return lines.join("\n");
}

export default async function handler(req: any, res: any) {
  // Allow GET (dashboard) or POST (internal)
  if (!["GET", "POST"].includes(req.method)) return res.status(405).end();

  // Cache header — intelligence is valid for 5 minutes
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=60");

  try {
    const db = getServiceClient();

    const [
      { data: rates        = [] },
      { data: patterns     = [] },
      { data: acceptances  = [] },
      { data: competition  = [] },
    ] = await Promise.all([
      db.from("v_market_rates").select("*"),
      db.from("v_request_patterns").select("*"),
      db.from("v_acceptance_intelligence").select("*"),
      db.from("v_market_competitiveness").select("*"),
    ]);

    const intelligence: FiciumIntelligence = {
      generatedAt:     new Date().toISOString(),
      marketRates:     (rates        ?? []) as MarketRate[],
      requestPatterns: (patterns     ?? []) as RequestPattern[],
      acceptanceIntel: (acceptances  ?? []) as AcceptanceIntel[],
      competitiveness: (competition  ?? []) as MarketCompetitiveness[],
      summary:         buildSummary(
        (rates ?? []) as MarketRate[],
        (patterns ?? []) as RequestPattern[],
        (acceptances ?? []) as AcceptanceIntel[],
        (competition ?? []) as MarketCompetitiveness[],
      ),
    };

    return res.status(200).json(intelligence);

  } catch (e: any) {
    console.error("Intelligence API error:", e);
    // Return empty shell — Claude endpoints degrade gracefully
    return res.status(200).json({
      generatedAt:     new Date().toISOString(),
      marketRates:     [],
      requestPatterns: [],
      acceptanceIntel: [],
      competitiveness: [],
      summary:         "Market intelligence: unavailable at this time.",
    } satisfies FiciumIntelligence);
  }
}
