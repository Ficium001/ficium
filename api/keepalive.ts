import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * Lightweight DB keepalive — called by Vercel Cron every 5 minutes.
 * Prevents Supabase free-plan auto-pause which causes 2-3 min cold starts on login.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const { error } = await supabase.from("kyc_settings").select("id").limit(1);
  const ms = Date.now() - start;
  if (error) {
    return res.status(500).json({ ok: false, error: error.message, ms });
  }
  return res.status(200).json({ ok: true, ms });
}
