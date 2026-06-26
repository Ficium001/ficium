/**
 * ExtractionBanner — sticky banner shown during/after upload.
 * Animates through uploading → processing → done states.
 */
import { CheckCircle2, AlertCircle, Loader2, X, AlertTriangle } from "lucide-react";
import type { UploadState } from "../hooks/useVault";

interface Props {
  state:    UploadState;
  onDismiss: () => void;
}

export function ExtractionBanner({ state, onDismiss }: Props) {
  if (state.phase === "idle") return null;

  const configs = {
    uploading: {
      bg:    "bg-ink",
      icon:  <Loader2 size={16} className="animate-spin text-white" />,
      title: `Uploading ${state.phase === "uploading" ? state.fileName : ""}…`,
      sub:   null,
      showDismiss: false,
    },
    processing: {
      bg:    "bg-ink",
      icon:  <Loader2 size={16} className="animate-spin text-white" />,
      title: "Extracting data…",
      sub:   "We're reading your document. This takes a few seconds.",
      showDismiss: false,
    },
    done: {
      bg: state.phase === "done" && state.status === "attested"
        ? "bg-good"
        : state.phase === "done" && state.status === "failed"
        ? "bg-bad"
        : "bg-warn",
      icon: state.phase === "done" && state.status === "attested"
        ? <CheckCircle2 size={16} className="text-white" />
        : state.phase === "done" && state.status === "failed"
        ? <AlertCircle size={16} className="text-white" />
        : <AlertTriangle size={16} className="text-white" />,
      title: state.phase === "done" && state.status === "attested"
        ? "Verified — your profile has been updated"
        : state.phase === "done" && state.status === "manual_review"
        ? "Needs review — we'll check this manually"
        : "Extraction failed — try a clearer image",
      sub:   null,
      showDismiss: true,
    },
    error: {
      bg:    "bg-bad",
      icon:  <AlertCircle size={16} className="text-white" />,
      title: "Upload failed",
      sub:   state.phase === "error" ? state.message : null,
      showDismiss: true,
    },
  } as const;

  const cfg = configs[state.phase];

  return (
    <div className={`${cfg.bg} rounded-2xl px-4 py-3.5 flex items-start gap-3 transition-all`}>
      <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-snug">{cfg.title}</p>
        {cfg.sub && <p className="text-[11px] text-white/60 mt-0.5">{cfg.sub}</p>}
        {/* Progress bar for uploading */}
        {state.phase === "uploading" && (
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        )}
      </div>
      {cfg.showDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 text-white/60 hover:text-white transition-colors">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
