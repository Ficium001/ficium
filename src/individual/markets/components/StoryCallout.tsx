import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { streamClaude } from "@/shared/lib/claude";
import type { Ticker } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// StoryCallout — appears when a ticker is selected.
// Shows the static one-line explainer (instant), then offers an AI
// "Explain more" that streams a deeper, plain-English breakdown grounded
// in the live value. Static text = teaser; AI = depth (no redundancy).
// ─────────────────────────────────────────────────────────────────────────────

interface StoryCalloutProps {
  ticker: Ticker;
}

export function StoryCallout({ ticker }: StoryCalloutProps) {
  const { color, label, story, reading } = ticker;
  const [aiText,      setAiText]      = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasAsked,    setHasAsked]    = useState(false);

  const explainMore = () => {
    if (isStreaming || hasAsked) return;
    setHasAsked(true);
    setIsStreaming(true);

    const question =
      `Explain in 3 short sentences what "${label}" at its current value of ` +
      `${reading?.displayValue ?? "its current level"} ` +
      `(${reading?.direction === "up" ? "up" : reading?.direction === "down" ? "down" : "flat"} ` +
      `${reading?.change ?? 0}% recently) means for an ordinary person in Mauritius. ` +
      `Be concrete about money impact. No jargon.`;

    let streamed = "";
    streamClaude(
      "/api/market?action=ask",
      { question, snapshot: { [label]: reading?.displayValue ?? "—" } },
      {
        onToken: (t) => { streamed += t; setAiText(streamed); },
        onDone:  ()  => setIsStreaming(false),
        onError: ()  => {
          setIsStreaming(false);
          if (!streamed) setAiText("Couldn't load a deeper explanation right now.");
        },
      },
    );
  };

  return (
    <div
      className="p-4 rounded-2xl border animate-[fadeSlide_0.18s_ease]"
      style={{ background: `${color}0D`, borderColor: `${color}33` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: color }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color }}
        >
          {label} — What this means
        </span>
      </div>

      <p className="text-[13px] text-ink/80 leading-relaxed">{story}</p>

      {/* AI deeper explanation */}
      {!hasAsked && (
        <button
          onClick={explainMore}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80"
          style={{ color }}
        >
          <Sparkles size={13} />
          Explain with AI
          <ChevronRight size={13} />
        </button>
      )}

      {hasAsked && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: `${color}22` }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={12} style={{ color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
              Ficium AI
            </span>
            {isStreaming && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            )}
          </div>
          {aiText ? (
            <p className="text-[13px] text-ink/75 leading-relaxed">{aiText}</p>
          ) : (
            <div className="flex gap-1 items-center text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
