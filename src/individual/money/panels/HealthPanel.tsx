// src/individual/money/panels/HealthPanel.tsx
// Health score breakdown and action plan, computed from Assets & debts.
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useSnapshot, computeHealthMetrics, type HealthMetric } from "@/individual/money/networth/hooks/useSnapshot";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";
import type { MoneyTab } from "@/individual/money/lib/tabs";
import { Panel } from "./ui";

const TONE = {
  good: { title: "Strengths",       icon: CheckCircle2,  cls: "text-emerald-700", bar: "#059669" },
  fair: { title: "Could be better", icon: AlertTriangle, cls: "text-amber-700",   bar: "#d97706" },
  poor: { title: "Needs attention", icon: XCircle,       cls: "text-red-700",     bar: "#dc2626" },
} as const;

export default function HealthPanel({ onGo }: { onGo: (t: MoneyTab) => void }) {
  const navigate = useNavigate();
  const { data: snap, isLoading: a } = useSnapshot();
  const { data: profile, isLoading: b } = useProfile();

  if (a || b) return <div className="py-16 grid place-items-center"><Loader2 size={24} className="text-ficium animate-spin" /></div>;

  const metrics = snap ? computeHealthMetrics(snap, profile?.healthScore ?? null) : [];
  const score = profile?.healthScore ?? (metrics.length
    ? Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
    : null);
  const hasData = !!snap && (snap.monthlyIncome > 0 || snap.totalAssets > 0);
  const actions = metrics.filter((m) => m.action);

  return (
    <>
      <Panel>
        <div className="p-5 flex items-center gap-5">
          <ScoreRing score={score} />
          <div>
            <h2 className="font-display text-[22px] font-extrabold text-ink leading-tight">
              {score == null ? "No score yet" : score >= 70 ? "Good standing" : score >= 50 ? "Room to grow" : "Needs attention"}
            </h2>
            <p className="text-[13px] text-muted mt-1">
              {score == null
                ? "Add your income, what you own and what you owe to get a score."
                : score >= 70 ? "Banks see a profile like this as low risk."
                : score >= 50 ? "A few changes would get you better offers."
                : "Reducing debt and building savings will lift this fastest."}
            </p>
          </div>
        </div>
      </Panel>

      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-[18px] px-5 py-4">
          <div className="font-semibold text-[13px] text-amber-900">Your score needs more information</div>
          <button onClick={() => onGo("assets")} className="text-[12px] font-bold text-amber-800 mt-1 hover:underline">
            Fill in assets & debts
          </button>
        </div>
      )}

      {(["good", "fair", "poor"] as const).map((k) => {
        const list = metrics.filter((m) => m.status === k);
        if (!list.length) return null;
        const t = TONE[k]; const Icon = t.icon;
        return (
          <Panel key={k} title={t.title} icon={<Icon size={16} className={t.cls} />}>
            <div className="divide-y divide-ink/4">{list.map((m) => <MetricRow key={m.label} m={m} bar={t.bar} />)}</div>
          </Panel>
        );
      })}

      {actions.length > 0 && (
        <Panel title="What to do next">
          <ol className="p-5 space-y-3">
            {actions.map((m, i) => (
              <li key={m.label} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-ficium text-white text-[11px] font-bold grid place-items-center shrink-0">{i + 1}</span>
                <div>
                  <div className="text-[13px] font-bold text-ink">{m.label}</div>
                  <div className="text-[12.5px] text-muted">{m.action}</div>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <button onClick={() => navigate("/advisor")}
        className="w-full py-3.5 rounded-xl bg-ficium text-white text-[14px] font-bold flex items-center justify-center gap-1.5">
        Ask Fia about my score <ArrowRight size={14} />
      </button>
    </>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 34, c = 2 * Math.PI * r;
  const color = score == null ? "#cbd5e1" : score >= 70 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-20 h-20 shrink-0" role="img" aria-label={score == null ? "No health score" : `Health score ${score} out of 100`}>
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (score ?? 0) / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-[22px] font-extrabold text-ink">{score ?? "—"}</span>
    </div>
  );
}

function MetricRow({ m, bar }: { m: HealthMetric; bar: string }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-[13px] text-ink">{m.label}</div>
        <div className="font-bold text-[13px]" style={{ color: bar }}>{m.value}</div>
      </div>
      <div className="h-1.5 bg-ink/[0.07] rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: bar }} />
      </div>
      <div className="text-[12px] text-muted leading-snug">{m.description}</div>
    </div>
  );
}
