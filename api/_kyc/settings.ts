/**
 * api/kyc-settings.ts
 * GET  /api/kyc-settings        — read current settings
 * POST /api/kyc-settings        — update a single toggle { key, value }
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

async function supabase(method: "GET" | "PATCH", body?: object) {
  const url  = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const key  = getEnv("SUPABASE_SERVICE_ROLE_KEY")
            || getEnv("SUPABASE_SERVICE_KEY")
            || getEnv("VITE_SUPABASE_SERVICE_ROLE_KEY");
  console.log("[kyc-settings] url:", url?.slice(0,40), "key:", key ? key.slice(0,12)+"…" : "MISSING");
  const res  = await fetch(`${url}/rest/v1/kyc_settings?id=eq.1`, {
    method,
    headers: {
      "apikey":        key,
      "Authorization": `Bearer ${key}`,
      "Content-Type":  "application/json",
      "Prefer":        method === "PATCH" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function settingsHandler(req: any, res: any) {
  if (req.method === "GET") {
    const r = await supabase("GET");
    if (!r.ok) return res.status(500).json({ error: "Failed to load settings", detail: r.data });
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    return res.status(200).json(row ?? null);
  }

  if (req.method === "POST") {
    const { key, value } = req.body as { key: string; value: boolean };
    if (!key || typeof value !== "boolean") {
      return res.status(400).json({ error: "key and value required" });
    }
    const r = await supabase("PATCH", { [key]: value, updated_at: new Date().toISOString() });
    if (!r.ok) return res.status(500).json({ error: "Failed to update setting" });
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    return res.status(200).json(row ?? { ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
