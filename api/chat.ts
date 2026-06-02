import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

type ChatMessage = { role: "user" | "assistant"; content: string };
type Body        = { messages?: ChatMessage[] };

const anthropic = new Anthropic({ apiKey: (globalThis as any).process?.env?.ANTHROPIC_API_KEY });

const BASE_SYSTEM = `
You are Ficium AI — an intelligent financial coach for clients in Mauritius using the Ficium reverse-banking marketplace, where banks and fintechs compete with bids for each client's request.

You help users:
- Understand and compare financial products (loans, deposits, investments, business funding)
- Make sense of the bids they receive
- Improve their financial health score and eligibility
- Decide when and what to post as a request
- Understand Mauritian banking products and rates

You have access to LIVE MARKET INTELLIGENCE injected below — use it to give accurate, grounded answers with real rate benchmarks. When quoting rates, cite them as "recent Ficium market data" rather than guessing.

Tone: direct, warm, practical, Mauritius-focused. Keep responses under 150 words unless the user asks for detail.

Do not: give personalised investment advice, guarantee approvals, recommend a specific bank by name unless comparing bids the user has received.
`.trim();

async function fetchIntelligenceSummary(): Promise<string> {
  try {
    const url = (globalThis as any).process?.env?.VITE_SUPABASE_URL ?? (globalThis as any).process?.env?.SUPABASE_URL ?? "";
    const key = (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) return "";

    const db = createClient(url, key, { auth: { persistSession: false } });

    const [
      { data: rates    = [] },
      { data: patterns = [] },
      { data: wins     = [] },
    ] = await Promise.all([
      db.from("v_market_rates").select("*"),
      db.from("v_request_patterns").select("*"),
      db.from("v_acceptance_intelligence").select("*"),
    ]);

    if (!rates?.length && !patterns?.length) return "";

    const lines: string[] = ["\n=== LIVE FICIUM MARKET DATA (last 90 days, anonymised) ==="];

    if (rates?.length) {
      lines.push("\nCURRENT RATES:");
      for (const r of rates as any[]) {
        lines.push(
          `  ${r.product_type.replace(/_/g," ")}: avg ${r.avg_rate_pct}% | range ${r.min_rate_pct}–${r.max_rate_pct}% | ${r.bid_count} bids`
        );
      }
    }
    if (patterns?.length) {
      lines.push("\nDEMAND:");
      for (const p of patterns as any[]) {
        lines.push(
          `  ${p.product_type.replace(/_/g," ")}: avg MUR ${Number(p.avg_amount).toLocaleString()} | ${p.avg_term_months}mo avg | ${p.close_rate_pct ?? 0}% close rate`
        );
      }
    }
    if (wins?.length) {
      lines.push("\nWINNING BIDS:");
      for (const w of wins as any[]) {
        lines.push(
          `  ${w.product_type.replace(/_/g," ")}: winning avg ${w.avg_winning_rate_pct}% | ${w.total_acceptances} deals`
        );
      }
    }
    lines.push("\nUse this data. Do not invent rates.");
    return lines.join("\n");
  } catch { return ""; }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(globalThis as any).process?.env?.ANTHROPIC_API_KEY) return res.status(500).json({ error: "API key missing" });

  const body: Body = req.body;
  if (!body.messages?.length) return res.status(400).json({ error: "messages required" });

  const totalChars = body.messages.reduce((s, m) => s + (m.content?.length ?? 0), 0);
  if (totalChars > 20000) return res.status(413).json({ error: "Conversation too large" });

  const messages = body.messages.slice(-20).map((m) => ({
    role:    m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content ?? "").slice(0, 4000),
  }));

  // Fetch live intelligence and inject into system prompt
  const intelligenceSummary = await fetchIntelligenceSummary();
  const system = BASE_SYSTEM + intelligenceSummary;

  try {
    const completion = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 700,
      system,
      messages,
    });

    const reply = completion.content
      .map((c: any) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    return res.status(200).json({
      reply,
      usage: {
        input_tokens:  completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "AI unavailable" });
  }
}
