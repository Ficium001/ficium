import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { TrackerStage, TrackerStageStatus } from "../types/tracker";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("en-MU", {
        day: "numeric", month: "short",
      })
    : null;

interface StageVisuals {
  icon:      React.ReactNode;
  labelCls:  string;
  trackCls:  string;
}

function stageVisuals(status: TrackerStageStatus): StageVisuals {
  switch (status) {
    case "completed":
      return {
        icon:     <CheckCircle2 size={20} className="text-white" />,
        labelCls: "text-ink font-semibold",
        trackCls: "bg-ficium",
      };
    case "active":
    case "awaiting_approval":
      return {
        icon:     <Loader2 size={18} className="text-white animate-spin" />,
        labelCls: "text-ficium font-semibold",
        trackCls: "bg-ficium",
      };
    default:
      return {
        icon:     <Circle size={18} className="text-ink/20" />,
        labelCls: "text-muted",
        trackCls: "bg-ink/[0.07]",
      };
  }
}

/* ── Single stage row ────────────────────────────────────────────────────── */
function StageRow({
  stage,
  isLast,
}: {
  stage:  TrackerStage;
  isLast: boolean;
}) {
  const vis        = stageVisuals(stage.status);
  const isActive   = stage.status === "active" || stage.status === "awaiting_approval";
  const isDone     = stage.status === "completed";
  const dateLabel  = isDone
    ? fmtDate(stage.completed_at)
    : isActive
    ? "In progress"
    : null;

  return (
    <div className="flex gap-3">
      {/* Track column */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isDone || isActive ? "bg-ficium shadow-xs" : "bg-ink/[0.07]"
          }`}
        >
          {vis.icon}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 mt-1 mb-1 min-h-[20px] rounded-full ${
              isDone ? "bg-ficium" : "bg-ink/[0.07]"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        <div className={`text-[14px] leading-tight ${vis.labelCls}`}>
          {stage.label}
        </div>
        {dateLabel && (
          <div className={`text-[12px] mt-0.5 ${isActive ? "text-ficium/70" : "text-muted"}`}>
            {dateLabel}
          </div>
        )}
        {isActive && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold
                          bg-ficium/8 text-ficium border border-ficium/20
                          px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-ficium animate-pulse" />
            Current stage
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Timeline ────────────────────────────────────────────────────────────── */
interface TrackerTimelineProps {
  stages: TrackerStage[];
}

export function TrackerTimeline({ stages }: TrackerTimelineProps) {
  return (
    <div>
      {stages.map((stage, i) => (
        <StageRow
          key={stage.id}
          stage={stage}
          isLast={i === stages.length - 1}
        />
      ))}
    </div>
  );
}
