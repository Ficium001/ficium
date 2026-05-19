import Anthropic from "@anthropic-ai/sdk";

/* ---------- Types ---------- */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Body = {
  messages?: ChatMessage[];
};

/* ---------- Runtime ---------- */

export const config = {
  runtime: "nodejs",
};

/* ---------- System Prompt ---------- */

const SYSTEM_PROMPT = `
You are Ficium's AI Financial Advisor, helping clients in Mauritius make better banking decisions.

Ficium is a reverse-banking marketplace:
clients post requests (loans, deposits, business funding, investments)
and banks in Mauritius compete with bids.

You help users:
- compare offers
- understand rates and fees
- evaluate trade-offs
- understand Mauritian banking products

Tone:
- Direct
- Practical
- Clear
- Mauritius-focused
- Honest about uncertainty

Do not:
- Give personalized investment advice
- Guarantee approvals or rates
- Pretend to know real-time data
- Recommend a bank unless explicitly comparing offers

Keep responses concise and useful.
`;

/* ---------- Anthropic Client ---------- */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/* ---------- Handler ---------- */

export default async function handler(req: any, res: any) {
  try {
    /* ---------- Method Check ---------- */

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

    /* ---------- Validate API Key ---------- */

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: "ANTHROPIC_API_KEY missing",
      });
    }

    /* ---------- Parse Body ---------- */

    const body: Body = req.body;

    if (
      !body.messages ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0
    ) {
      return res.status(400).json({
        error: "messages must be a non-empty array",
      });
    }

    /* ---------- Limit Payload ---------- */

    const totalChars = body.messages.reduce(
      (sum, m) => sum + (m.content?.length || 0),
      0
    );

    if (totalChars > 20000) {
      return res.status(413).json({
        error: "Conversation too large",
      });
    }

    /* ---------- Normalize Messages ---------- */

const recentMessages: {
  role: "user" | "assistant";
  content: string;
}[] = body.messages
  .slice(-20)
  .map((m) => ({
    role:
      m.role === "assistant"
        ? ("assistant" as const)
        : ("user" as const),

    content: String(m.content || "").slice(0, 4000),
  }));
    console.log("Sending request to Anthropic...");

    /* ---------- Claude Request ---------- */

const completion = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 700,
  system: SYSTEM_PROMPT,
  messages: recentMessages,
});

    console.log("Anthropic response received");

    /* ---------- Extract Text ---------- */

    const reply = completion.content
      .map((c: any) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    /* ---------- Response ---------- */

    return res.status(200).json({
      reply,
      usage: {
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
      },
    });

  } catch (error: any) {
    console.error("API Error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "AI advisor is temporarily unavailable",
    });
  }
}