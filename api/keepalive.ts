import { Env } from "./_lib/env.js";
import { Response } from "./_lib/response.js";

export const config = { runtime: "nodejs" };

/**
 * Lightweight DB keepalive — called by Vercel Cron every 5 minutes.
 * Prevents Supabase free-plan auto-pause which causes 2-3 min cold starts on login.
 * Uses raw fetch against Supabase REST — no SDK import needed.
 */
// Public on purpose (the GitHub keepalive workflow calls it without credentials), so it must give
// nothing away and must not let a flood of requests turn into a flood of database calls.
const CACHE_MS = 60_000;
let last: { at: number; ok: boolean; ms: number } | null = null;

export default async function handler(_req: any, res: any): Promise<void> {
  if (last && Date.now() - last.at < CACHE_MS) {
    return last.ok ? Response.ok(res, { ok: true, ms: last.ms, cached: true })
                   : Response.error(res, "DB ping failed", 502, "PING_FAILED");
  }
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) return Response.error(res, "Not configured", 503, "NOT_CONFIGURED");

  const start = Date.now();
  let ok = false;
  try {
    // Public, non-personal table: the ping proves the database is awake and reads nothing private.
    const r = await fetch(`${url}/rest/v1/app_features?select=key&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    ok = r.ok;
  } catch (e) {
    console.error("[keepalive] ping error:", e instanceof Error ? e.message : e);
  }
  last = { at: Date.now(), ok, ms: Date.now() - start };
  return ok ? Response.ok(res, { ok: true, ms: last.ms })
            : Response.error(res, "DB ping failed", 502, "PING_FAILED");
}
