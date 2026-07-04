import type { StoryMode } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// StoryModeToggle — pill toggle between "Everyday" and "Finance" story modes.
// Pure presentational — controlled component.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  mode:     StoryMode;
  onChange: (mode: StoryMode) => void;
}

export function StoryModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex bg-ink/5 rounded-pill p-1 gap-1" role="radiogroup" aria-label="Story mode">
      {(["everyday", "finance"] as StoryMode[]).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => onChange(m)}
          className={[
            "px-4 py-1.5 rounded-pill text-[12px] font-semibold transition-all",
            mode === m
              ? "bg-white text-ficium shadow-xs border border-ficium/20"
              : "text-muted hover:text-ink",
          ].join(" ")}
        >
          {m === "everyday" ? "Everyday" : "Finance"}
        </button>
      ))}
    </div>
  );
}
