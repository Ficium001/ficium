import { Link }       from "react-router-dom";
import { Zap, ChevronRight } from "lucide-react";
import { Card }        from "@/shared/ui";
import type { NextAction } from "@/individual/dashboard/api/profile";

const PRIORITY_STYLES = {
  high:   "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low:    "border-ficium/15 bg-ficium/4 text-ficium",
} as const;

const DOT_COLORS = {
  high:   "bg-red-500",
  medium: "bg-amber-400",
  low:    "bg-ficium",
} as const;

export function NextActions({ actions }: { actions: NextAction[] }) {
  return (
    <Card padded={false} className="p-4 sm:p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={15} className="text-ficium" />
        <span className="font-display text-[17px] font-bold">Next steps</span>
        <span className="ml-auto text-[11px] font-bold bg-ficium/10 text-ficium px-2.5 py-0.5 rounded-pill">
          {actions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {actions.map((a) => (
          <Link key={a.id} to={a.href} className="no-underline group">
            <div className={["flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all hover:shadow-xs", PRIORITY_STYLES[a.priority]].join(" ")}>
              <div className={["w-2.5 h-2.5 rounded-full shrink-0", DOT_COLORS[a.priority]].join(" ")} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold leading-snug">{a.label}</div>
                <div className="text-[11px] opacity-70 mt-0.5">{a.description}</div>
              </div>
              <ChevronRight size={15} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
