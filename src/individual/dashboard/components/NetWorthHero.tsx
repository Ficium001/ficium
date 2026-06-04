import { Eye, EyeOff }   from "lucide-react";
import { MiniSparkline }  from "./MiniSparkline";
import { SPARK_NETWORTH, formatAmount } from "@/individual/dashboard/config/dashboard";

interface NetWorthHeroProps {
  netWorth: number;
  hidden:   boolean;
  onToggle: () => void;
}

// Owns only presentation. Hidden state is lifted to the Dashboard page
// so other components (e.g. FlipCards) can respect the same toggle.
export function NetWorthHero({ netWorth, hidden, onToggle }: NetWorthHeroProps) {
  return (
    <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden bg-white/[0.08] backdrop-blur-xl border border-white/[0.12]">
      <div className="absolute -right-10 -top-14 w-48 h-48 rounded-full bg-ficium/30 blur-[50px] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-white/60 font-semibold tracking-wide">Total net worth</span>
            <span className="text-[11px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-pill">MUR</span>
          </div>
          <button
            onClick={onToggle}
            aria-label={hidden ? "Show net worth" : "Hide net worth"}
            className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 transition-colors"
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-white/40 text-xl font-semibold">Rs</span>
          {hidden ? (
            <span className="text-white/50 text-5xl font-extrabold tracking-wide">•• •• ••</span>
          ) : (
            <span className="text-white text-5xl font-extrabold tracking-tight">
              {formatAmount(netWorth)}
            </span>
          )}
        </div>

        {!hidden && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 px-2.5 py-1 rounded-pill text-[12px] font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 text-emerald-900 grid place-items-center text-[8px] font-black">↑</span>
              +1.7%
            </span>
            <span className="text-[12px] text-white/40 font-medium">this month</span>
          </div>
        )}
      </div>

      <div className="absolute right-4 bottom-3 w-28 h-9 opacity-60">
        <MiniSparkline points={SPARK_NETWORTH} color="#9CE5C0" />
      </div>
    </div>
  );
}
