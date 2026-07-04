import { Link }          from "react-router-dom";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import type { InsightItem } from "@/individual/dashboard/config/dashboard";

interface SmartInsightsFeedProps {
  insights:  InsightItem[];
  activeIdx: number;
  onNext:    () => void;
}

export function SmartInsightsFeed({ insights, activeIdx, onNext }: SmartInsightsFeedProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={15} className="text-ficium" />
            <span className="text-[12px] font-bold text-ficium uppercase tracking-widest">Smart Insights</span>
          </div>
          <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
            What's happening <span className="text-ficium">with your money</span>
          </h2>
        </div>
        <button
          onClick={onNext}
          aria-label="Next insight"
          className="w-9 h-9 rounded-full bg-ink/6 grid place-items-center hover:bg-ink/10 transition-colors shrink-0"
        >
          <RefreshCw size={14} className="text-muted" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 lg:overflow-visible lg:grid lg:grid-cols-3 scrollbar-hide">
        {insights.map((insight, i) => {
          const Icon     = insight.icon;
          const isActive = i === activeIdx;
          return (
            <div
              key={i}
              className={[
                "shrink-0 w-[75vw] sm:w-[300px] lg:w-auto rounded-2xl border p-5 transition-all duration-500 bg-white",
                isActive ? "border-ficium/20 shadow-md scale-[1.01]" : "border-ink/6 opacity-60",
              ].join(" ")}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl shrink-0 grid place-items-center mt-0.5"
                  style={{ background: insight.bg }}
                >
                  <Icon size={16} style={{ color: insight.color }} />
                </div>
                <p className="text-[15px] text-ink/85 font-semibold leading-snug">{insight.text}</p>
              </div>
              {isActive && (
                <Link
                  to="/advisor"
                  className="text-[12px] font-bold text-ficium no-underline hover:underline flex items-center gap-1"
                >
                  See full analysis <ArrowRight size={11} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Indicator dots — mobile only */}
      <div className="flex justify-center gap-1.5 mt-3 lg:hidden">
        {insights.map((_, i) => (
          <div
            key={i}
            className={[
              "h-1.5 rounded-pill transition-all duration-300",
              i === activeIdx ? "bg-ficium w-5" : "bg-ink/20 w-1.5",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
