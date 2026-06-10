/**
 * api/intelligence.ts
 * ─────────────────────────────────────────────────────────────
 * GET /api/intelligence
 * Returns anonymised market intelligence for frontend consumption.
 * Cached at the edge via Cache-Control headers + in-process TTL cache.
 */
import { IntelligenceService } from "./_lib/intelligence-service.js";
import { Response }       from "./_lib/response.js";
import { requireUser, asAuthError } from "./_lib/auth.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.methodNotAllowed(res, ["GET", "POST"]);
  }

  // Verify caller — anonymised data, but login-gated (no anon access).
  try {
    await requireUser(req);
  } catch (e) {
    const ae = asAuthError(e);
    if (ae) return Response.error(res, ae.message, ae.status, ae.code);
    throw e;
  }

  // CDN / browser cache: 5 min fresh, serve stale for 1 min while revalidating
  res.setHeader("Cache-Control", "private, max-age=300, stale-while-revalidate=60");

  try {
    const data = await IntelligenceService.fetch();
    return Response.ok(res, data);
  } catch (e: unknown) {
    
    // Return empty shell — never a 500, frontend degrades gracefully
    return Response.ok(res, {
      generatedAt:     new Date().toISOString(),
      marketRates:     [],
      requestPatterns: [],
      acceptanceIntel: [],
      competitiveness: [],
      summary:         "Market intelligence temporarily unavailable.",
    });
  }
}
