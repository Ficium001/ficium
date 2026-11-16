import { Env } from "./_lib/env.js";
import { Response } from "./_lib/response.js";
import { readDrift } from "./_lib/schema-drift.js";

export const config = { runtime: "nodejs" };

/**
 * Lightweight DB keepalive — called by Vercel Cron every 5 minutes.
 * Prevents Supabase free-plan auto-pause which causes 2-3 min cold starts on login.
 * Uses raw fetch against Supabase REST — no SDK import needed.
 *
 * It also checks that every migration this deployment was built with is applied to the database
 * (_lib/schema-drift.ts). If one is missing it answers 503 SCHEMA_DRIFT, which fails the scheduled
 * GitHub keepalive check. The names of the missing migrations go to the server log only.
 */
// Public on purpose (the GitHub keepalive workflow calls it without credentials), so it must give
// nothing away and must not let a flood of requests turn into a flood of database calls.
const CACHE_MS = 60_000;
let last: { at: number; ok: boolean; ms: number; drift: boolean } | null = null;

export default async function handler(_req: any, res: any): Promise<void> {
  if (last && Date.now() - last.at < CACHE_MS) {
    if (!last.ok) return Response.error(res, "DB ping failed", 502, "PING_FAILED");
    if (last.drift) return Response.error(res, "A database migration has not been applied", 503, "SCHEMA_DRIFT");
    return Response.ok(res, { ok: true, ms: last.ms, cached: true });
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
  // Only when the database answered: not being able to ask is not drift.
  const missing = ok ? await readDrift(url, key) : null;
  if (missing?.length) console.error("ALERT schema drift: merged but not applied:", missing.join(", "));
  last = { at: Date.now(), ok, ms: Date.now() - start, drift: Boolean(missing?.length) };
  if (!ok) return Response.error(res, "DB ping failed", 502, "PING_FAILED");
  if (last.drift) return Response.error(res, "A database migration has not been applied", 503, "SCHEMA_DRIFT");
  return Response.ok(res, { ok: true, ms: last.ms });
}
