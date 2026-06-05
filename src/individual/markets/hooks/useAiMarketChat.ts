import { useState, useRef, useCallback } from "react";
import { streamClaude }                  from "@/shared/lib/claude";

// ─────────────────────────────────────────────────────────────────────────────
// useAiMarketChat — manages a streaming Q&A conversation about the markets.
// Each message streams token-by-token from /api/market-ask.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:      string;
  role:    "user" | "assistant";
  content: string;
}

interface UseAiMarketChatReturn {
  messages:    ChatMessage[];
  isStreaming: boolean;
  ask:         (question: string, snapshot: Record<string, string | number>) => void;
  clear:       () => void;
}

export function useAiMarketChat(): UseAiMarketChatReturn {
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(
    (question: string, snapshot: Record<string, string | number>) => {
      if (isStreaming || !question.trim()) return;

      const userMsg: ChatMessage = {
        id:      crypto.randomUUID(),
        role:    "user",
        content: question.trim(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id:      assistantId,
        role:    "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // History for context (exclude the blank assistant placeholder)
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      streamClaude(
        "/api/market?action=ask",
        { question, snapshot, history },
        {
          onToken: (t) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + t } : m,
              ),
            );
          },
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: "Sorry, I couldn't answer that right now. Please try again." }
                  : m,
              ),
            );
            setIsStreaming(false);
            console.error("market-ask error:", err);
          },
        },
      );
    },
    [isStreaming, messages],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, ask, clear };
}
