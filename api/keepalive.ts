import { Env } from "./_lib/env.js";
import { Response } from "./_lib/response.js";

export const config = { runtime: "nodejs" };

/**
 * Lightweight DB keepalive — called by Vercel Cron every 5 minutes.
 * Prevents Supabase free-plan auto-pause which causes 2-3 min cold starts on login.
 * Uses raw fetch against Supabase REST — no SDK import needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(_req: any, res: any): Promise<void> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();

  if (!url || !key) {
    return Response.error(res, "Supabase not configured", 503, "NOT_CONFIGURED");
  }

  const start = Date.now();
  try {
    const r = await fetch(`${url}/rest/v1/kyc_settings?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const ms = Date.now() - start;
    if (!r.ok) return Response.error(res, "DB ping failed", 502, "PING_FAILED");
    return Response.ok(res, { ok: true, ms });
  } catch (e) {
    return Response.error(res, `Ping error: ${String(e)}`, 502, "PING_ERROR");
  }
}
