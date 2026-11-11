// bom-fx v2 — real per-bank FX quotes from the Bank of Mauritius
// "Indicative Exchange Rates of Local Banks and FOREX Dealers" page.
//
// Why a custom client: bom.mu does not serve its full certificate chain, so the
// edge runtime rejects it (UnknownIssuer). We trust ONLY the Sectigo CA chain that
// signs bom.mu (intermediate R36 + root R46), scoped to BoM requests. Certificate
// verification stays ON everywhere. (Chain supplied by the owner, 2026-11-11.)
//
// Honesty rules:
//  - Bank identity comes only from a fixed logo-filename -> bank list. Unknown logo = skipped + reported.
//  - Cells are read by column class, never by position (empty cells are common).
//  - A quote > 8% away from the live mid-market rate is rejected.
//  - Only the newest published day is written; nothing is written if it is > 5 days old.
//  - Rows are upserted per (currency, bank); other rows are never fabricated.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CA_INTERMEDIATE = `-----BEGIN CERTIFICATE-----
MIIGSzCCBDOgAwIBAgIQbU98rTNTd8jG4AHd4uLIjjANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRVYgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEApduwxkQH5noeb0k4yRXK47Fd+hVkH8twKWQF3FNm
HHShQrOH7S0L3p8Aaf8P7OqojwyZgyqD5o/Sb95N45P/NfmL+lfAOkQ1Bpvz0OcZ
VmwYhMWFYJe8parkz5w9Bk8mn/AtN65hIQF0NqBI6F+23/jzhlpl3E0zKkkUJSfT
dgvwaJvTiPgLQ7CpYyLJvMpgdPHf+nnvA5YJjhae6olh6BRllvRhzKOq0gd60BrO
Aos9QyOfYhUDG3eQovMA9fyiI2qNclCp6DY8hqt55lERoBS/Whza8Cx1bh6q8rTP
nno2uI6FZb2UavIYblyGDamXAW/jv3qsMB42xz/p2mUHg0wQzn/8KAiyu2ZbDs7E
OOwYx0V2ViNsCXGR/GCmJsUNPmhEEXBclOj6qF7rFf7nkST2bokSt9VF1NB1JgRl
djZin1+v2Vm88UEgFxerQPPrPjAEMqDx44vKl22sGWnl+jOyxf/H59DHKbIezrIY
rJpSnA3WEVaiXs1oIRy1ZziNAgMBAAGjggGAMIIBfDAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQUmC1eHo/rVPS5/1WVrUzHfqSYrnsw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBoGA1UdIAQTMBEwBgYEVR0gADAHBgVngQwBATBU
BgNVHR8ETTBLMEmgR6BFhkNodHRwOi8vY3JsLnNlY3RpZ28uY29tL1NlY3RpZ29Q
dWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYuY3JsMIGEBggrBgEFBQcB
AQR4MHYwTwYIKwYBBQUHMAKGQ2h0dHA6Ly9jcnQuc2VjdGlnby5jb20vU2VjdGln
b1B1YmxpY1NlcnZlckF1dGhlbnRpY2F0aW9uUm9vdFI0Ni5wN2MwIwYIKwYBBQUH
MAGGF2h0dHA6Ly9vY3NwLnNlY3RpZ28uY29tMA0GCSqGSIb3DQEBDAUAA4ICAQA2
LRCehSXiyw56alKt2aqDwDLEDmyu74lUmDG4rI1Jw3+ivLz+OK3NpE466a8yXu7b
f326wkrrOCF2SVu3ItNjXqsgwXdIM9tapVEKjsEwbjcPUcxNeqzSpLSgHZIVhjJJ
+QtdEL2n1NhDxqewlN+ZKWWBLGB0LA/S7SvCl9s7rsppo97uv6J3h//q4b2SgzHu
KUu80Hofpjp2bILGHy4CqzKzyg3wn9sKFcX6Ufkcea/tuiWhIMPkiQCv5tXsRj+H
n3CZql+wRPbjhNqncCkzrwOBrt7Gov46EHhqMUP/Euf8gSw7X+CzWEUJ0Q+Vn8VL
ZDkiKcMSYMJI+6Trc5tVn9LQLI6tTzwagLhgcVtFpom3PVtEJRPN/d05L0ck7S1b
xPaXcQhKUqdzFd09pt6fLx2vMmylBKXjKosSxjB12KRzLvI2CUUVdpl7OTFA32Fk
+zQC2gJPGmPPCzRMRYfVOEIZxbG0nI9lpYZidLkQ/EyTtJ3JVj7cb3KRe/e1s+Xj
rnHqbUwoizicfogtcKm5giwj74f+Rpr0RRy4xum1bC662fNHRJaTt5ErVR6gHjHM
Zhp+tOeOvohq5XxIMCKuetnwcPeBsOzUBzmUPoxQNRVXEYbwV2rS3t2jJ0Zh/Dnn
O96biaAsEnxbQyu4fvMx6D4J4Zbkc7Zp75T3GE/UjQ==
-----END CERTIFICATE-----
`;
const CA_ROOT = `-----BEGIN CERTIFICATE-----
MIIFijCCA3KgAwIBAgIQdY39i658BwD6qSWn4cetFDANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNNDYwMzIxMjM1OTU5WjBfMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQDEy1TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYwggIiMA0GCSqGSIb3DQEB
AQUAA4ICDwAwggIKAoICAQCTvtU2UnXYASOgHEdCSe5jtrch/cSV1UgrJnwUUxDa
ef0rty2k1Cz66jLdScK5vQ9IPXtamFSvnl0xdE8H/FAh3aTPaE8bEmNtJZlMKpnz
SDBh+oF8HqcIStw+KxwfGExxqjWMrfhu6DtK2eWUAtaJhBOqbchPM8xQljeSM9xf
iOefVNlI8JhD1mb9nxc4Q8UBUQvX4yMPFF1bFOdLvt30yNoDN9HWOaEhUTCDsG3X
ME6WW5HwcCSrv0WBZEMNvSE6Lzzpng3LILVCJ8zab5vuZDCQOc2TZYEhMbUjUDM3
IuM47fgxMMxF/mL50V0yeUKH32rMVhlATc6qu/m1dkmU8Sf4kaWD5QazYw6A3OAS
VYCmO2a0OYctyPDQ0RTp5A1NDvZdV3LFOxxHVp3i1fuBYYzMTYCQNFu31xR13NgE
SJ/AwSiItOkcyqex8Va3e0lMWeUgFaiEAin6OJRpmkkGj80feRQXEgyDet4fsZfu
+Zd4KKTIRJLpfSYFplhym3kT2BFfrsU4YjRosoYwjviQYZ4ybPUHNs2iTG7sijbt
8uaZFURww3y8nDnAtOFr94MlI1fZEoDlSfB1D++N6xybVCi0ITz8fAr/73trdf+L
HaAZBav6+CuBQug4urv7qv094PPK306Xlynt8xhW6aWWrL3DkJiy4Pmi1KZHQ3xt
zwIDAQABo0IwQDAdBgNVHQ4EFgQUVnNYZJX5khqwEioEYnmhQBWIIUkwDgYDVR0P
AQH/BAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggIBAC9c
mTz8Bl6MlC5w6tIyMY208FHVvArzZJ8HXtXBc2hkeqK5Duj5XYUtqDdFqij0lgVQ
YKlJfp/imTYpE0RHap1VIDzYm/EDMrraQKFz6oOht0SmDpkBm+S8f74TlH7Kph52
gDY9hAaLMyZlbcp+nv4fjFg4exqDsQ+8FxG75gbMY/qB8oFM2gsQa6H61SilzwZA
Fv97fRheORKkU55+MkIQpiGRqRxOF3yEvJ+M0ejf5lG5Nkc/kLnHvALcWxxPDkjB
JYOcCj+esQMzEhonrPcibCTRAUH4WAP+JWgiH5paPHxsnnVI84HxZmduTILA7rpX
DhjvLpr3Etiga+kFpaHpaPi8TD8SHkXoUsCjvxInebnMMTzD9joiFgOgyY9mpFui
TdaBJQbpdqQACj7LzTWb4OE4y2BThihCQRxEV+ioratF4yUQvNs+ZUH7G6aXD+u5
dHn5HrwdVw1Hr8Mvn4dGp+smWg9WY7ViYG4A++MnESLn/pmPNPW56MORcr3Ywx65
LvKRRFHQV80MNNVIIb/bE/FmJUNS0nAiNs2fxBx1IK1jcmMGDw4nztJqDby1ORrp
0XZ60Vzk50lJLVU3aPAaOpg+VBeHVOmmJ1CJeyAvP/+/oYtKR5j/K3tJPsMpRmAY
QqszKbrAKbkTidOIijlBO8n9pu0f9GBj39ItVQGL
-----END CERTIFICATE-----
`;

const BASE = "https://www.bom.mu/markets/foreign-exchange/indicative-exchange-rate";
const MAX_PAGES = 4;

const BANKS: Record<string, string> = {
  "abc.png": "ABC Banking Corporation Ltd",
  "absa_logo_badge_rgb_passion_png.png": "Absa Bank (Mauritius) Ltd",
  "afbl.jpg": "AfrAsia Bank Limited",
  "baro.jpg": "Bank of Baroda",
  "bankofchina.jpg": "Bank of China",
  "bankone_0.jpg": "Bank One Limited",
  "patronus.png": "Banque Patronus Limitée",
  "bcpm.jpg": "BCP Bank (Mauritius) Ltd",
  "ba.jpg": "British American Exchange Co. Ltd",
  "change-express-rebranded_logo.png": "Change Express Ltd",
  "fxmarket.png": "FX Market Edge Ltd",
  "hsbc.png": "HSBC",
  "investec_0.jpg": "Investec Bank (Mauritius) Limited",
  "maubank.png": "MauBank Ltd",
  "mpfec.png": "Mauritius Post Foreign Exchange Co Ltd",
  "sbi_0.jpg": "SBI (Mauritius) Ltd",
  "shib.jpg": "Shibani Finance",
  "standard_bank_progress_logo_blue_0.jpg": "Standard Bank (Mauritius) Limited",
  "sbm_logo_-_cmyk_.jpg": "State Bank of Mauritius",
  "swan.jpg": "Swan Forex Ltd",
  "mcb-logo.jpg": "The Mauritius Commercial Bank Limited",
  "tcook.jpg": "Thomas Cook",
};

const CURRENCIES: Record<string, string> = { "U.S.A": "USD", "EMU": "EUR", "U.K": "GBP", "SOUTH AFRICA": "ZAR" };
const MID_TICKER: Record<string, string> = { USD: "usd_mur", EUR: "eur_mur", GBP: "gbp_mur" };
const MAX_DEVIATION = 0.08;

interface Quote { date: string; bank: string; code: string; buy: number; sell: number }

// deno-lint-ignore no-explicit-any
const client = (Deno as any).createHttpClient({ caCerts: [CA_INTERMEDIATE, CA_ROOT] });

async function getPage(p: number): Promise<string> {
  const url = p === 0 ? BASE : `${BASE}?page=${p}`;
  // deno-lint-ignore no-explicit-any
  const r = await fetch(url, { client, headers: { "User-Agent": "Ficium/1.0 (+https://ficium.net)" }, signal: AbortSignal.timeout(20000) } as any);
  if (!r.ok) throw new Error(`bom.mu ${r.status} on page ${p}`);
  return await r.text();
}

const cell = (row: string, cls: string): number | null => {
  // Read strictly inside this column's own <td> (empty cells must stay empty).
  const td = row.match(new RegExp(`<td class="field-${cls}">([\\s\\S]*?)</td>`));
  const m = td ? td[1].match(/field-item (?:even|odd)">\s*([\d.]+)\s*</) : null;
  const v = m ? parseFloat(m[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
};

function iso(d: string): string { const [dd, mm, yy] = d.split("."); return `${yy}-${mm}-${dd}`; }

/** Bank rows of one page in document order. BoM prints ONE date per page (the date of the
 *  page's first row) and lists days newest-first, so a bank repeating means the next day began. */
function parseRows(html: string): { logo: string; quotes: Omit<Quote, "date">[] }[] {
  const starts = [...html.matchAll(/class="views-row [^"]*"/g)].map(m => m.index!);
  const rows: { logo: string; quotes: Omit<Quote, "date">[] }[] = [];
  for (let i = 0; i < starts.length; i++) {
    const row = html.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : html.length);
    const logo = (row.match(/banks\/([^?"]+)/) ?? [])[1]?.toLowerCase();
    if (!logo) continue;
    const bank = BANKS[logo];
    const quotes: Omit<Quote, "date">[] = [];
    if (bank) {
      for (const tr of row.match(/<tr class="field-collection-item">[\s\S]*?<\/tr>/g) ?? []) {
        const name = (tr.match(/field-name-field-curr-code[\s\S]*?field-item (?:even|odd)">([^<]+)</) ?? [])[1]?.trim();
        const code = name ? CURRENCIES[name] : undefined;
        if (!code) continue;
        const buy = cell(tr, "buy-tt"), sell = cell(tr, "sell-ttddtc");
        if (buy === null || sell === null || sell < buy) continue;
        quotes.push({ bank, code, buy, sell });
      }
    }
    rows.push({ logo, quotes });
  }
  return rows;
}

const headerDate = (html: string): string | null => {
  const m = html.match(/Date:\s*(\d{2}\.\d{2}\.\d{4})/);
  return m ? iso(m[1]) : null;
};

async function authorised(req: Request): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (!secret) return false;
  const { data, error } = await sb.rpc("verify_market_refresh_secret", { p_secret: secret });
  return !error && data === true;
}

Deno.serve(async (req: Request) => {
  if (!(await authorised(req))) return new Response(JSON.stringify({ error: "unauthorised" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const log: Record<string, unknown> = { version: "v2", started_at: new Date().toISOString() };
  try {
    const unknown = new Set<string>();
    const all: Quote[] = [];
    const seen = new Set<string>();
    let newest = "";
    let done = false;
    for (let p = 0; p < MAX_PAGES && !done; p++) {
      const html = await getPage(p);
      const hd = headerDate(html);
      if (p === 0) newest = hd ?? "";
      else if (!hd || hd < newest) break; // whole page is an older day
      for (const row of parseRows(html)) {
        if (seen.has(row.logo)) { done = true; break; } // bank repeated => previous day starts here
        seen.add(row.logo);
        if (!BANKS[row.logo]) { unknown.add(row.logo); continue; }
        for (const q of row.quotes) all.push({ date: newest, ...q });
      }
    }
    log.rows_seen = seen.size;
    log.newest_date = newest || null;
    log.unknown_logos = [...unknown];
    if (!newest) return new Response(JSON.stringify({ ok: false, log: { ...log, error: "no quotes parsed — nothing written" } }), { headers: { "Content-Type": "application/json" } });
    const ageDays = (Date.now() - Date.parse(newest + "T00:00:00Z")) / 86400000;
    if (ageDays > 5) return new Response(JSON.stringify({ ok: false, log: { ...log, error: `BoM data is ${Math.round(ageDays)}d old — nothing written` } }), { headers: { "Content-Type": "application/json" } });

    // Sanity: compare with our own mid-market tickers.
    const { data: mids } = await sb.from("market_data").select("ticker_id,value");
    const mid: Record<string, number> = Object.fromEntries((mids ?? []).map((r: Record<string, unknown>) => [r.ticker_id, parseFloat(String(r.value))]));
    const rejected: string[] = [];
    const latest = all.filter(q => q.date === newest).filter(q => {
      const m = mid[MID_TICKER[q.code] ?? ""];
      if (!m) return true; // no mid for this currency (ZAR): rely on parse checks only
      const ok = Math.abs(q.buy - m) / m <= MAX_DEVIATION && Math.abs(q.sell - m) / m <= MAX_DEVIATION;
      if (!ok) rejected.push(`${q.bank} ${q.code} ${q.buy}/${q.sell} vs mid ${m}`);
      return ok;
    });
    log.rejected = rejected;

    const dedup = new Map<string, Quote>();
    for (const q of latest) dedup.set(`${q.code}|${q.bank}`, q);
    const ts = new Date().toISOString();
    const rows = [...dedup.values()].map(q => ({
      currency_code: q.code, currency_pair: `${q.code}/MUR`, bank_name: q.bank,
      buy_rate: q.buy, sell_rate: q.sell, rate_basis: "live", fetched_at: ts,
    }));
    if (rows.length === 0) return new Response(JSON.stringify({ ok: false, log: { ...log, error: "all quotes rejected — nothing written" } }), { headers: { "Content-Type": "application/json" } });

    const { error } = await sb.from("market_fx_rates").upsert(rows, { onConflict: "currency_code,bank_name" });
    if (error) throw new Error(error.message);
    // Drop live rows that were not in this publication (a bank that stopped quoting must not linger).
    const keep = new Set(rows.map(r => `${r.currency_code}|${r.bank_name}`));
    const { data: existing } = await sb.from("market_fx_rates").select("id,currency_code,bank_name").eq("rate_basis", "live");
    const stale = (existing ?? []).filter((r: Record<string, unknown>) => !keep.has(`${r.currency_code}|${r.bank_name}`)).map((r: Record<string, unknown>) => r.id);
    if (stale.length) await sb.from("market_fx_rates").delete().in("id", stale);
    log.written = rows.length;
    log.banks = new Set(rows.map(r => r.bank_name)).size;
    log.removed_stale = stale.length;
    return new Response(JSON.stringify({ ok: true, log }, null, 2), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, log: { ...log, error: String(e).slice(0, 300) } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
