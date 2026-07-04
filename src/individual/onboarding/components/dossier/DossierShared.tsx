import { ArrowRight, Sparkles, Check } from "lucide-react";
import type { HealthResult }           from "@/individual/onboarding/utils/calcHealth";
import { STEP_LABELS }                 from "@/individual/onboarding/config/dossierOptions";
import { formatMUR }                   from "@/shared/lib/format";
export { formatMUR }                   from "@/shared/lib/format";

// ── StepButton ────────────────────────────────────────────────────────────────

export function StepButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl bg-ficium text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-ficium/90 transition-all disabled:opacity-40 shadow-lg shadow-ficium/25">
      Continue <ArrowRight size={18} />
    </button>
  );
}

// ── DoneScreen ────────────────────────────────────────────────────────────────

export function DoneScreen({ h }: { h: HealthResult }) {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-ficium/20 flex items-center justify-center">
          <Check size={44} className="text-ficium" strokeWidth={3} />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
      </div>
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-white">Your financial passport is ready.</h1>
        <p className="text-white/50 mt-2 text-lg">Banks are about to compete for you.</p>
      </div>
      <div className="flex gap-6 mt-2">
        {[
          ["Score",     `${h.score}/100`],
          ["Income",    `${formatMUR(h.totalIncome)}/mo`],
          ["Net worth", formatMUR(h.totalAssets)],
        ].map(([l, v]) => (
          <div key={l} className="text-center">
            <div className="text-white/40 text-xs uppercase tracking-wider">{l}</div>
            <div className="text-white font-bold text-lg mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StepHeader ────────────────────────────────────────────────────────────────

export function StepHeader({
  step, h, onBack,
}: { step: number; h: HealthResult; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-xs border-b border-ink/6 px-5 py-3">
      <div className="mx-auto max-w-[600px] flex items-center gap-4">
        <button onClick={onBack}
          className="w-8 h-8 rounded-full bg-ink/6 flex items-center justify-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex gap-1.5 mb-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className={[
                "h-1 flex-1 rounded-full transition-all duration-500",
                i < step ? "bg-ficium" : i === step ? "bg-ficium/60" : "bg-ink/10",
              ].join(" ")} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Step {step + 2} of 5 — {STEP_LABELS[step - 1]}</span>
            <span className="text-xs font-bold" style={{ color: h.colour }}>Score: {h.score}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HealthBar ─────────────────────────────────────────────────────────────────

export function HealthBar({ h }: { h: HealthResult }) {
  return (
    <div className="mx-auto max-w-[600px] px-5 pt-5 pb-2">
      <div className="rounded-2xl border border-ink/[0.07] bg-white p-4 flex items-center gap-4 shadow-xs">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted font-medium">Financial health</span>
            <span className="text-sm font-bold" style={{ color: h.colour }}>{h.label} · {h.score}/100</span>
          </div>
          <div className="w-full h-2 bg-ink/6 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${h.score}%`, backgroundColor: h.colour }} />
          </div>
          <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{h.insight}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-3xl font-bold" style={{ color: h.colour }}>{h.score}</div>
          <div className="text-[10px] text-muted">/ 100</div>
        </div>
      </div>
    </div>
  );
}
