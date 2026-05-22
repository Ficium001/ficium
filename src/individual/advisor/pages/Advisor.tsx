import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import { sendToAdvisor } from "../api/advisor";
import type { ChatMessage } from "../api/advisor";
import { BottomNav, Button } from "../../../shared/ui";

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi — I'm Ficium's AI advisor. Ask me anything about loans, deposits, or comparing bids in Mauritius. I'll be direct and practical.",
};

export default function Advisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMsg];
const result = await sendToAdvisor(history);
const reply = result.ok
  ? result.reply
  : "Sorry, I couldn't get a response. Please try again.";
setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setIsLoading(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const reset = () => setMessages([INITIAL_GREETING]);

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream/90 backdrop-blur-xl border-b border-ink/[0.06]">
        <div className="mx-auto w-full max-w-[640px] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ficium/10 text-ficium grid place-items-center">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Advisor</div>
              <div className="text-[10px] text-muted">Ficium financial guide</div>
            </div>
          </div>
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 mx-auto w-full max-w-[640px] px-5 py-5 flex flex-col gap-4">
        {messages.map((m, i) => (
          <div key={i} className={["flex gap-3", m.role === "user" ? "flex-row-reverse" : ""].join(" ")}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-ficium/10 text-ficium grid place-items-center flex-shrink-0 mt-0.5">
                <Sparkles size={13} />
              </div>
            )}
            <div className={[
              "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
              m.role === "user"
                ? "bg-ficium text-white rounded-tr-sm"
                : "bg-white text-ink border border-ink/[0.06] rounded-tl-sm",
            ].join(" ")}>
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-ficium/10 text-ficium grid place-items-center flex-shrink-0">
              <Sparkles size={13} />
            </div>
            <div className="bg-white border border-ink/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-cream/95 backdrop-blur-xl border-t border-ink/[0.06]">
        <div className="mx-auto w-full max-w-[640px] px-4 py-3 flex gap-2.5 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about loans, rates, bids…"
            rows={1}
            className="flex-1 resize-none bg-white border border-ink/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-ficium transition-colors placeholder:text-muted"
            style={{ maxHeight: "120px" }}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="flex-shrink-0"
            rightIcon={<Send size={14} />}
          >
            Send
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
