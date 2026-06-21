import { apiFetch } from "@/shared/lib/apiClient";
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SendResult =
  | { ok: true; reply: string; usage: { input_tokens: number; output_tokens: number } }
  | { ok: false; error: string };

/**
 * Send the conversation to our Vercel serverless function (which proxies Anthropic).
 * Browser never touches the API key.
 */
export async function sendToAdvisor(messages: ChatMessage[]): Promise<SendResult> {
  try {
    const res = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `Server returned ${res.status}` };
    }

    const data = await res.json();
    return {
      ok: true,
      reply: data.reply,
      usage: data.usage,
    };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

/**
 * Profile-aware send: passes `userId` so the serverless function can load
 * the user's finances and ground FICO's reply in real data. Throws on
 * failure so callers can decide whether to count the message against quota.
 */
export async function askAdvisor(messages: ChatMessage[], userId?: string): Promise<string> {
  const res = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, userId }),
  });
  if (!res.ok) throw new Error(`Advisor error: ${res.status}`);
  const data = await res.json();
  return data.reply ?? "";
}