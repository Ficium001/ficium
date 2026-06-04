import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Direction } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// ChangeBadge — shows a directional arrow + % change. Pure presentational.
// ─────────────────────────────────────────────────────────────────────────────

interface ChangeBadgeProps {
  change: number;
  direction: Direction;
  size?: "sm" | "md";
}

export function ChangeBadge({ change, direction, size = "sm" }: ChangeBadgeProps) {
  if (direction === "flat") {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-muted font-semibold">
        <Minus size={9} />
        No change
      </span>
    );
  }

  const up      = direction === "up";
  const Icon    = up ? TrendingUp : TrendingDown;
  const color   = up ? "text-green-600" : "text-red-500";
  const iconSz  = size === "md" ? 12 : 10;
  const textSz  = size === "md" ? "text-[12px]" : "text-[10px]";

  return (
    <span className={`flex items-center gap-0.5 font-bold ${color} ${textSz}`}>
      <Icon size={iconSz} />
      {up ? "+" : ""}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}
