import type { Ticker } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// StoryCallout — appears when a ticker is selected.
// Pure presentational — receives the active ticker, renders the story.
// ─────────────────────────────────────────────────────────────────────────────

interface StoryCalloutProps {
  ticker: Ticker;
}

export function StoryCallout({ ticker }: StoryCalloutProps) {
  const { color, label, story } = ticker;
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
    </div>
  );
}
