/* ─────────────────────────────────────────────────────────────
   Ficium — shared Claude API client utility
   Handles streaming SSE from /api/* endpoints
───────────────────────────────────────────────────────────── */

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

export type StreamCallbacks = {
  onToken: (token: string) => void;
  onDone:  (fullText: string) => void;
  onError: (err: string) => void;
};

/**
 * Stream a response from a Ficium Claude API endpoint.
 * The endpoint must emit SSE: `data: {"text":"..."}` tokens, ending with `data: [DONE]`
 */
export async function streamClaude(
  endpoint: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks,
): Promise<void> {
  let full = "";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      callbacks.onError(`Request failed: ${res.status}`);
      return;
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") { callbacks.onDone(full); return; }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) { callbacks.onError(parsed.error); return; }
          if (parsed.text)  { full += parsed.text; callbacks.onToken(parsed.text); }
        } catch { /* ignore malformed */ }
      }
    }
    callbacks.onDone(full);
  } catch (e: any) {
    callbacks.onError(e?.message ?? "Network error");
  }
}

/**
 * Single-shot (non-streaming) call to /api/chat
 */
export async function askClaude(
  messages: ClaudeMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.reply ?? "";
}
