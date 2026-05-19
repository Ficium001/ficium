import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import { sendToAdvisor } from "../services/advisor";
import type { ChatMessage } from "../services/advisor";
import { BottomNav, Button } from "../components/ui";

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi — I'm Ficium's AI advisor. Ask me anything about loans, deposits, or comparing bids in Mauritius. I'll be direct and practical.",
};

export default function Advisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setError(null);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);

    // The greeting is UI-only — don't send it to the API
    const apiMessages = next.filter((m) => m !== INITIAL_GREETING);
    const result = await sendToAdvisor(apiMessages);

    if (result.ok) {
      setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
    } else {
      setError(result.error);
    }
    setSending(false);

    // refocus the input for the next message
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const resetConversation = () => {
    if (sending) return;
    setMessages([INITIAL_GREETING]);
    setError(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="px-5 sm:px-6 pt-6 sm:pt-8 pb-3 max-w-[640px] mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-ficium text-white grid place-items-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight">
                AI Advisor
              </h1>
              <p className="text-xs text-muted">Ficium's banking helper</p>
            </div>
          </div>
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={resetConversation}
              disabled={sending}
            >
              Reset
            </Button>
          )}
        </div>
      </header>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 sm:px-6 pb-4"
      >
        <div className="max-w-[640px] mx-auto w-full flex flex-col gap-3">
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {sending && <TypingBubble />}
          {error && (
            <div
              role="alert"
              className="self-start max-w-[85%] px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-[13px]"
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-ink/[0.06] bg-white/95 backdrop-blur-xl pb-20 sm:pb-24">
        <div className="max-w-[640px] mx-auto w-full px-5 sm:px-6 py-3 sm:py-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about loans, rates, or banking…"
              rows={1}
              disabled={sending}
              className="flex-1 resize-none min-h-[48px] max-h-[140px] px-4 py-3 text-[15px] font-body text-ink bg-cream border-[1.5px] border-ink/12 rounded-2xl outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 placeholder:text-muted transition-colors disabled:bg-ink/5"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="w-12 h-12 rounded-2xl bg-ficium text-white grid place-items-center shadow-ficium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-[11px] text-muted mt-2 px-1">
            AI advice is general. For complex decisions, talk to a licensed advisor.
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- Pieces ---------- */

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] px-4 py-3 rounded-2xl text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-ficium text-white rounded-br-md"
            : "bg-white text-ink border border-ink/[0.06] rounded-bl-md",
        ].join(" ")}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-ink/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "120ms" }} />
          <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "240ms" }} />
        </div>
      </div>
    </div>
  );
}