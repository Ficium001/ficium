import { Eye, EyeOff }  from "lucide-react";
import { MiniSparkline } from "./MiniSparkline";
import { SPARK_NETWORTH, formatAmount } from "@/individual/dashboard/config/dashboard";

interface NetWorthHeroProps {
  netWorth: number;
  hidden:   boolean;
  onToggle: () => void;
  /** When true renders dark (glassmorphism) variant — default false = light card */
  dark?:    boolean;
}

export function NetWorthHero({ netWorth, hidden, onToggle, dark = false }: NetWorthHeroProps) {
  if (dark) {
    // Original dark/glass variant — kept intact for any dark-bg usage
    return (
      <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden bg-white/[0.08] backdrop-blur-xl border border-white/[0.12]">
        <div className="absolute -right-10 -top-14 w-48 h-48 rounded-full bg-ficium/30 blur-[50px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-white/60 font-semibold tracking-wide">Total net worth</span>
              <span className="text-[11px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-pill">MUR</span>
            </div>
            <button onClick={onToggle} aria-label={hidden ? "Show" : "Hide"}
              className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 transition-colors">
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-white/40 text-xl font-semibold">Rs</span>
            {hidden
              ? <span className="text-white/50 text-5xl font-extrabold tracking-wide">•• •• ••</span>
              : <span className="text-white text-5xl font-extrabold tracking-tight">{formatAmount(netWorth)}</span>}
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

  // ── Light variant — for white card background ─────────────────────────────
  return (
    <div className="relative px-5 pt-5 pb-4 overflow-hidden">
      {/* Subtle ficium glow blob */}
      <div className="absolute right-0 top-0 w-52 h-52 rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(42,31,230,0.08) 0%, transparent 70%)" }} />

      <div className="relative z-10">
        {/* Toggle */}
        <div className="flex justify-end mb-3">
          <button
            onClick={onToggle}
            aria-label={hidden ? "Show net worth" : "Hide net worth"}
            className="w-8 h-8 rounded-full bg-ink/[0.05] grid place-items-center text-muted hover:bg-ink/10 transition-colors"
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-muted text-xl font-semibold">Rs</span>
          {hidden
            ? <span className="text-ink/30 text-4xl sm:text-5xl font-extrabold tracking-wide">•• •• ••</span>
            : <span className="font-display text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
                {formatAmount(netWorth)}
              </span>
          }
        </div>

        {/* Change badge */}
        {!hidden && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-pill text-[12px] font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white grid place-items-center text-[8px] font-black">↑</span>
              +1.7%
            </span>
            <span className="text-[12px] text-muted font-medium">this month</span>
          </div>
        )}
      </div>

      {/* Sparkline — bottom right */}
      <div className="absolute right-4 bottom-3 w-32 sm:w-40 h-10 opacity-70">
        <MiniSparkline points={SPARK_NETWORTH} color="#2A1FE6" />
      </div>
    </div>
  );
}
