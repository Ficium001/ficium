import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

type Message = { role: "user" | "assistant"; content: string };
type Body    = { messages: Message[]; profile?: Record<string, unknown> };

const anthropic = new Anthropic({ apiKey: (globalThis as any).process?.env?.ANTHROPIC_API_KEY });

const BASE_SYSTEM = `
You are Ficium's Request Builder — a conversational AI that helps clients in Mauritius post financial requests to the Ficium marketplace, where banks and fintechs bid for their business.

Collect these fields through natural conversation (one question at a time):
- productType: personal_loan | sme_loan | mortgage | fixed_deposit | savings_account | credit_card | business_account | investment_account | leasing | overdraft | business_loan
- amount: MUR (min 1,000)
- purpose: short description (3–500 chars)
- preferredTermMonths: integer 1–360
- maxRate (optional): max acceptable APR %
- decisionDeadline (optional): ISO date

Rules:
- One question at a time. Be warm and conversational.
- Use live market data (injected below) to give rate guidance and benchmarks as you collect info. E.g. "Personal loans on Ficium are currently averaging 8.5% — want to set a max rate?"
- When all REQUIRED fields are gathered, summarise and ask "Shall I post this now?"
- Only after user confirms (yes/post/go), output EXACTLY this on its own line: READY:{"productType":"...","amount":0,"purpose":"...","preferredTermMonths":0,"maxRate":null,"decisionDeadline":null}
- Never reveal PII. Never guarantee approval.
- Responses under 80 words unless explaining a product.
`.trim();

async function fetchIntelligenceSummary(): Promise<string> {
  try {
    const url = (globalThis as any).process?.env?.VITE_SUPABASE_URL ?? (globalThis as any).process?.env?.SUPABASE_URL ?? "";
    const key = (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) return "";

    const db = createClient(url, key, { auth: { persistSession: false } });

    const [{ data: rates = [] }, { data: wins = [] }] = await Promise.all([
      db.from("v_market_rates").select("product_type,avg_rate_pct,min_rate_pct,max_rate_pct,bid_count"),
      db.from("v_acceptance_intelligence").select("product_type,avg_winning_rate_pct,avg_winning_term_months,avg_winning_amount"),
    ]);

    if (!rates?.length) return "";

    const lines = ["\n=== LIVE MARKET DATA FOR GUIDANCE ==="];
    for (const r of rates as any[]) {
      const win = (wins as any[]).find(w => w.product_type === r.product_type);
      lines.push(
        `${r.product_type.replace(/_/g," ")}: market avg ${r.avg_rate_pct}% | range ${r.min_rate_pct}–${r.max_rate_pct}%` +
        (win ? ` | winning bids avg ${win.avg_winning_rate_pct}% / ${win.avg_winning_term_months}mo` : "")
      );
    }
    return lines.join("\n");
  } catch { return ""; }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(globalThis as any).process?.env?.ANTHROPIC_API_KEY) return res.status(500).json({ error: "API key missing" });

  const body: Body = req.body;
  if (!body.messages?.length) return res.status(400).json({ error: "messages required" });

  const messages = body.messages.slice(-30).map((m) => ({
    role:    m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content).slice(0, 3000),
  }));

  const intelligenceSummary = await fetchIntelligenceSummary();

  let system = BASE_SYSTEM + intelligenceSummary;

  if (body.profile) {
    system += `\n\nClient context (private — do not reveal):
Health score: ${body.profile.healthScore ?? "unknown"}/100
Employment: ${body.profile.employment ?? "unknown"}
Use this to suggest suitable products and realistic amounts.`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await anthropic.messages.stream({
      model:      "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
}
