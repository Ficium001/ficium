import Anthropic from "@anthropic-ai/sdk";

/* ---------- Types ---------- */

type ChatMessage = { role: "user" | "assistant"; content: string };

type Body = {
  messages?: ChatMessage[];
};

/* ---------- System prompt ---------- */

const SYSTEM_PROMPT = `You are Ficium's AI Financial Advisor, helping clients in Mauritius make better banking decisions.

Ficium is a reverse-banking marketplace: clients post requests (loans, deposits, business funding, investments) and banks in Mauritius compete with bids. You help the client understand offers, market rates, and trade-offs.

Your tone:
- Direct and practical. No fluff, no jargon-for-its-own-sake.
- Specific to Mauritius (MUR, local banks: MCB, SBM, AfrAsia, MauBank, ABC Banking) when relevant.
- Honest about uncertainty. If you don't know current rates or specifics, say so.
- Empathetic but not sycophantic.

What you can help with:
- Explaining loan/deposit terms (APR, processing fees, early repayment penalties)
- Comparing bids the client is considering
- Estimating whether a rate is competitive for the Mauritian market
- Walking through the financial implications of a decision

What you must NOT do:
- Give personalized investment advice beyond general education
- Recommend a specific bank by name unless the client asks you to compare specific bids
- Make promises about approval, rates, or outcomes
- Pretend to know real-time market data

If asked about something outside finance/banking, politely redirect. Keep responses focused and reasonably brief — usually under 200 words unless the user explicitly asks for depth.`;

/* ---------- Handler ---------- */

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: "Server misconfigured: ANTHROPIC_API_KEY missing" }, 500);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages must be a non-empty array" }, 400);
  }

  // Lightweight defense: cap input size so a user can't burn through tokens with a giant payload.
  const totalChars = messages.reduce((s, m) => s + (m.content?.length || 0), 0);
  if (totalChars > 20_000) {
    return json({ error: "Message history too long. Please start a new conversation." }, 413);
  }

  // Normalize: clamp to last 20 messages so deep history doesn't compound costs.
  const recent = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content ?? "").slice(0, 4000),
  }));

  const client = new Anthropic({ apiKey });

  try {
    const completion = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: recent,
    });

    // Extract the text content (Anthropic returns an array of content blocks)
    const text = completion.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    return json({
      reply: text,
      usage: {
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Anthropic call failed:", message);
    return json({ error: "AI advisor is temporarily unavailable. Please try again." }, 502);
  }
}

/* ---------- Helpers ---------- */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const runtime = 'nodejs';