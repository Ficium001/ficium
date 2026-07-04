// src/individual/health/pages/FinancialHealth.tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { useSnapshot, computeHealthMetrics } from "@/individual/networth/hooks/useSnapshot";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";
import { PageShell } from "@/shared/ui";

export default function FinancialHealth() {
  const navigate = useNavigate();
  const { data: snap, isLoading: snapLoading } = useSnapshot();
  const { data: profile, isLoading: profLoading } = useProfile();

  const loading = snapLoading || profLoading;
  const metrics = snap ? computeHealthMetrics(snap, profile?.healthScore ?? null) : [];

  const good = metrics.filter(m => m.status === "good");
  const fair = metrics.filter(m => m.status === "fair");
  const poor = metrics.filter(m => m.status === "poor");

  const overallScore = profile?.healthScore ?? (metrics.length
    ? Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
    : null);

  const hasData = snap && (snap.monthlyIncome > 0 || snap.totalAssets > 0);

  if (loading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <Loader2 size={32} className="text-ficium animate-spin" />
    </div>
  );

  return (
    <PageShell max="900px">
      <section className="relative overflow-hidden rounded-hero bg-hero text-white px-5 sm:px-9 py-8 mt-1">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-6">
            <ArrowLeft size={15} /> Back
          </button>

          <div className="flex items-center gap-6">
            {/* Score ring */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke={overallScore != null && overallScore >= 70 ? "#4ade80" : overallScore != null && overallScore >= 50 ? "#fbbf24" : "#f87171"}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - (overallScore ?? 0) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[22px] font-extrabold text-white">
                  {overallScore ?? "—"}
                </span>
              </div>
            </div>

            <div>
              <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">Financial Health</div>
              <h1 className="font-display text-[32px] sm:text-[40px] font-extrabold text-white leading-tight">
                {overallScore != null && overallScore >= 70 ? "Good standing" :
                 overallScore != null && overallScore >= 50 ? "Room to grow" : "Needs attention"}
              </h1>
              <p className="text-[13px] text-white/50 mt-1">
                {good.length} strengths · {fair.length} fair · {poor.length} need attention
              </p>
            </div>
          </div>
      </section>

      <div className="py-6 space-y-5">

        {!hasData && (
          <div className="bg-amber-50 border border-amber-200 rounded-[18px] px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[13px] text-amber-900">Your financial data is incomplete</div>
              <p className="text-[12px] text-amber-700 mt-0.5">Add your assets and liabilities to get a real health score.</p>
              <button onClick={() => navigate("/networth")} className="text-[12px] font-bold text-amber-700 mt-2 hover:underline">
                Update net worth →
              </button>
            </div>
          </div>
        )}

        {/* Strengths */}
        {good.length > 0 && (
          <div className="bg-white rounded-[22px] border border-ink/6 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-ink/5 bg-emerald-50/50">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-bold text-[14px] text-emerald-800">Strengths</span>
            </div>
            <div className="divide-y divide-ink/4">
              {good.map(m => <MetricRow key={m.label} metric={m} />)}
            </div>
          </div>
        )}

        {/* Fair */}
        {fair.length > 0 && (
          <div className="bg-white rounded-[22px] border border-ink/6 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-ink/5 bg-amber-50/50">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="font-bold text-[14px] text-amber-800">Could be better</span>
            </div>
            <div className="divide-y divide-ink/4">
              {fair.map(m => <MetricRow key={m.label} metric={m} />)}
            </div>
          </div>
        )}

        {/* Poor */}
        {poor.length > 0 && (
          <div className="bg-white rounded-[22px] border border-ink/6 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-ink/5 bg-red-50/50">
              <XCircle size={16} className="text-red-500" />
              <span className="font-bold text-[14px] text-red-800">Needs attention</span>
            </div>
            <div className="divide-y divide-ink/4">
              {poor.map(m => <MetricRow key={m.label} metric={m} />)}
            </div>
          </div>
        )}

        {/* Action items */}
        {metrics.some(m => m.action) && (
          <div className="bg-ficium/4 border border-ficium/12 rounded-[22px] p-5">
            <div className="font-bold text-[14px] text-ficium mb-3">Your action plan</div>
            <div className="space-y-2.5">
              {metrics.filter(m => m.action).map((m, i) => (
                <div key={m.label} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-ficium text-white text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">{i+1}</span>
                  <div>
                    <div className="text-[12px] font-bold text-ink">{m.label}</div>
                    <div className="text-[12px] text-muted">{m.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/advisor")}
            className="py-3.5 rounded-xl bg-ficium text-white text-[13px] font-bold shadow-ficium flex items-center justify-center gap-1.5">
            Ask AI Coach <ArrowRight size={13} />
          </button>
          <button onClick={() => navigate("/networth")}
            className="py-3.5 rounded-xl border-2 border-ficium/20 text-ficium text-[13px] font-bold flex items-center justify-center gap-1.5">
            Update finances <Edit3 size={13} />
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function Edit3({ size, className }: { size: number; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}

function MetricRow({ metric }: { metric: ReturnType<typeof computeHealthMetrics>[0] }) {
  const barColor = metric.status === "good" ? "#059669" : metric.status === "fair" ? "#d97706" : "#dc2626";
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-[13px] text-ink">{metric.label}</div>
        <div className="font-bold text-[13px]" style={{ color: barColor }}>{metric.value}</div>
      </div>
      <div className="h-1.5 bg-ink/[0.07] rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${metric.score}%`, background: barColor }} />
      </div>
      <div className="text-[11px] text-muted leading-snug">{metric.description}</div>
      {metric.action && (
        <div className="mt-1.5 text-[11px] font-semibold" style={{ color: barColor }}>→ {metric.action}</div>
      )}
    </div>
  );
}
