import { useState, useRef, useEffect }  from "react";
import { Sparkles, Send, RotateCcw, X } from "lucide-react";
import { useAiMarketChat }              from "../hooks/useAiMarketChat";
import type { MarketDataResult }        from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// AiMarketChat — inline AI Q&A panel on the Markets page.
// Shows suggested questions, then streams answers in real time.
// Stays grounded in the live market snapshot at time of question.
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTED: string[] = [
  "Is now a good time to take a home loan?",
  "What does the USD rate mean for me?",
  "Should I put money in a fixed deposit now?",
  "Will petrol prices change this month?",
  "How does the SEMDEX affect my pension?",
  "Is inflation getting better or worse?",
];

interface Props {
  marketData: MarketDataResult | null;
}

function buildSnapshot(marketData: MarketDataResult | null): Record<string, string | number> {
  if (!marketData) return {};
  const r = marketData.readings;
  return {
    "Repo Rate":    r.repo_rate?.displayValue    ?? "—",
    "USD/MUR":      r.usd_mur?.displayValue      ?? "—",
    "EUR/MUR":      r.eur_mur?.displayValue      ?? "—",
    "GBP/MUR":      r.gbp_mur?.displayValue      ?? "—",
    "SEMDEX":       r.semdex?.displayValue        ?? "—",
    "Inflation YoY":r.inflation_yoy?.displayValue ?? "—",
    "USD change %": r.usd_mur?.change             ?? 0,
    "SEMDEX change %": r.semdex?.change           ?? 0,
  };
}

export function AiMarketChat({ marketData }: Props) {
  const { messages, isStreaming, ask, clear } = useAiMarketChat();
  const [input,  setInput]  = useState("");
  const [open,   setOpen]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const snapshot = buildSnapshot(marketData);

  const submit = (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || isStreaming) return;
    setInput("");
    ask(question, snapshot);
  };

  const hasMessages = messages.length > 0;

  return (
    <section aria-label="Ask AI about the markets">
      {/* ── Collapsed trigger ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-ficium/[0.06] to-[#0891b2]/[0.04] border border-ficium/20 rounded-2xl px-4 py-3.5 text-left hover:border-ficium/40 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-ficium/10 flex items-center justify-center flex-shrink-0 group-hover:bg-ficium/20 transition-colors">
            <Sparkles size={15} className="text-ficium" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-ficium uppercase tracking-widest mb-0.5">
              Ask Ficium AI
            </p>
            <p className="text-[13px] text-muted truncate">
              What does today's market mean for you?
            </p>
          </div>
          <span className="text-[11px] font-semibold text-ficium bg-ficium/10 px-2.5 py-1 rounded-lg">
            Ask →
          </span>
        </button>
      )}

      {/* ── Expanded panel ── */}
      {open && (
        <div className="bg-white rounded-2xl border border-ficium/20 overflow-hidden shadow-[0_0_0_3px_rgba(42,31,230,0.05)]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/[0.05] bg-ficium/[0.03]">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-ficium" />
              <span className="text-[12px] font-bold text-ficium uppercase tracking-widest">
                Ficium AI — Markets
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              {hasMessages && (
                <button
                  onClick={() => { clear(); }}
                  title="Clear conversation"
                  className="text-muted hover:text-ink transition-colors"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[340px] overflow-y-auto px-4 py-3 space-y-3">
            {!hasMessages && (
              <div>
                <p className="text-[12px] text-muted mb-3 leading-relaxed">
                  I'm grounded in today's live Mauritius market data. Ask me anything — plain English, no jargon.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => submit(q)}
                      className="text-[11px] font-medium text-ficium bg-ficium/[0.07] border border-ficium/20 rounded-xl px-3 py-1.5 hover:bg-ficium/[0.12] transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "bg-ficium text-white rounded-tr-sm"
                      : "bg-ink/[0.04] text-ink rounded-tl-sm",
                  ].join(" ")}
                >
                  {m.content || (
                    <span className="flex gap-1 items-center text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-ink/[0.05]">
            <div className="flex items-center gap-2 bg-ink/[0.03] rounded-xl border border-ink/[0.07] px-3 py-2 focus-within:border-ficium/40 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ask about today's market…"
                disabled={isStreaming}
                className="flex-1 bg-transparent text-[13px] text-ink placeholder-muted outline-none disabled:opacity-50"
              />
              <button
                onClick={() => submit()}
                disabled={!input.trim() || isStreaming}
                className="w-7 h-7 rounded-lg bg-ficium flex items-center justify-center disabled:opacity-30 hover:bg-ficium-deep transition-colors flex-shrink-0"
              >
                <Send size={12} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
