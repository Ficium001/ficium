import Anthropic from "@anthropic-ai/sdk";

export const config = { runtime: "nodejs" };

type Message = { role: "user" | "assistant"; content: string };
type Body    = { messages: Message[]; profile?: Record<string, unknown> };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `
You are Ficium's Request Builder — a conversational assistant that helps clients in Mauritius post a financial request to the Ficium reverse-banking marketplace, where banks bid for their business.

Your job is to gather these fields through natural conversation:
- productType: one of: personal_loan, sme_loan, mortgage, fixed_deposit, savings_account, credit_card, business_account, investment_account, leasing, overdraft, business_loan
- amount: number in MUR (minimum 1,000)
- purpose: short description (3–500 chars) — banks see this, not the client's name
- preferredTermMonths: integer (1–360)
- maxRate: optional — max acceptable APR %
- decisionDeadline: optional — ISO date string

Rules:
- Ask ONE question at a time. Keep it conversational, warm, short.
- Use Mauritian context (MUR, local banks, local products).
- When you have all REQUIRED fields (productType, amount, purpose, preferredTermMonths), output a special JSON block on its own line:
  READY:{"productType":"...","amount":0,"purpose":"...","preferredTermMonths":0,"maxRate":null,"decisionDeadline":null}
- Before outputting READY, confirm the details with the user in a friendly summary and ask "Shall I post this now?"
- If the user says yes/confirm/post/go/submit after your summary, output the READY block.
- Never output the READY block until the user has confirmed.
- Never ask for personal identity details.
- Keep responses under 100 words unless explaining a product.
- If the user is unsure about a product type, explain the options briefly and ask.
`.trim();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "API key missing" });

  const body: Body = req.body;
  if (!body.messages?.length) return res.status(400).json({ error: "messages required" });

  const messages = body.messages.slice(-30).map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content).slice(0, 3000),
  }));

  // Prepend profile context if available
  let system = SYSTEM;
  if (body.profile) {
    system += `\n\nClient context (do not reveal to client):
- Monthly income: ${body.profile.monthlyIncome ?? "unknown"} MUR
- Net worth: ${body.profile.netWorth ?? "unknown"} MUR
- Employment: ${body.profile.employment ?? "unknown"}
- Health score: ${body.profile.healthScore ?? "unknown"}/100
Use this to tailor your suggestions, but don't quote it back.`;
  }

  // Stream the response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 600,
      system,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
}
