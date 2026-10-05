// src/individual/portfolio/pages/Portfolio.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Briefcase, Check, Clock, AlertTriangle, Building2 } from "lucide-react";
import { PageShell } from "@/shared/ui";
import { formatAmount } from "@/shared/lib/format";
import { usePortfolio } from "@/individual/portfolio/hooks/usePortfolio";
import type { Facility, FacilityStage } from "@/individual/portfolio/types";

export default function PortfolioPage() {
  const navigate = useNavigate();
  const { data: facilities, isLoading, error } = usePortfolio();

  const list = useMemo(() => facilities ?? [], [facilities]);
  const active = useMemo(() => list.filter((f) => f.status === "active"), [list]);

  // Only sum facilities sharing one currency — a mixed-currency total would be
  // a meaningless number. With a mix, show the count instead of a fake sum.
  const summary = useMemo(() => {
    const relevant = list.filter((f) => f.status === "active" || f.status === "completed");
    const currencies = new Set(relevant.map((f) => f.currency));
    const singleCurrency = currencies.size === 1 ? [...currencies][0] : null;
    const total = singleCurrency
      ? relevant.reduce((sum, f) => sum + (f.amount ?? 0), 0)
      : null;

    // Amount-weighted blended rate — a plain average would let a tiny facility
    // swing the headline as hard as a large one.
    const rated = relevant.filter((f) => f.rate != null && f.amount != null && f.amount > 0);
    const weightBase = rated.reduce((s, f) => s + (f.amount ?? 0), 0);
    const blendedRate = weightBase > 0
      ? rated.reduce((s, f) => s + (f.rate ?? 0) * (f.amount ?? 0), 0) / weightBase
      : null;

    return { total, singleCurrency, blendedRate, count: relevant.length };
  }, [list]);

  return (
    <PageShell max="900px">
      <section className="relative overflow-hidden rounded-hero bg-hero text-white px-5 sm:px-9 py-8 mt-1">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-6"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">
          My Portfolio
        </div>
        <div className="font-display text-[32px] sm:text-[40px] font-extrabold text-white leading-none">
          {summary.total != null && summary.singleCurrency
            ? formatAmount(summary.total, summary.singleCurrency)
            : `${summary.count} ${summary.count === 1 ? "facility" : "facilities"}`}
        </div>
        <div className="text-[13px] text-white/50 mt-2">
          Everything a provider has approved for you through Ficium
        </div>

        {(active.length > 0 || summary.blendedRate != null) && (
          <div className="flex gap-3 mt-6 flex-wrap">
            <Chip label="Active" value={String(active.length)} />
            {summary.blendedRate != null && (
              <Chip label="Blended rate" value={`${summary.blendedRate.toFixed(2)}%`} />
            )}
          </div>
        )}
      </section>

      <div className="py-6 space-y-4">
        {isLoading && (
          <div className="py-16 grid place-items-center">
            <Loader2 size={24} className="text-ficium animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-6 text-center">
            <AlertTriangle size={22} className="text-amber-500 mx-auto mb-2" />
            <div className="text-[14px] font-semibold text-ink mb-1">Couldn't load your portfolio</div>
            <div className="text-[13px] text-muted">{(error as Error).message}</div>
          </div>
        )}

        {!isLoading && !error && list.length === 0 && (
          <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-8 text-center">
            <Briefcase size={26} className="text-ink/25 mx-auto mb-3" />
            <div className="text-[15px] font-bold text-ink mb-1">No facilities yet</div>
            <div className="text-[13px] text-muted mb-5 max-w-[380px] mx-auto">
              When you accept a bid on one of your requests, the approved facility
              will appear here with its progress.
            </div>
            <button
              onClick={() => navigate("/requests/new")}
              className="px-4 py-2.5 bg-ficium text-white rounded-xl text-[13px] font-semibold"
            >
              Post a request
            </button>
          </div>
        )}

        {!isLoading && !error && list.map((f) => <FacilityCard key={f.id} facility={f} />)}
      </div>
    </PageShell>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-pill text-[12px] font-semibold bg-white/10 text-white/70">
      {label}: <span className="font-bold">{value}</span>
    </div>
  );
}

const STATUS_STYLES: Record<Facility["status"], { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Completed", cls: "bg-ink/5 text-ink/60" },
  withdrawn: { label: "Withdrawn", cls: "bg-ink/5 text-ink/50" },
  declined:  { label: "Declined",  cls: "bg-red-50 text-red-600" },
};

function FacilityCard({ facility: f }: { facility: Facility }) {
  const status = STATUS_STYLES[f.status] ?? STATUS_STYLES.active;
  const visibleStages = f.stages ?? [];
  const done = visibleStages.filter((s) => s.status === "completed" || s.status === "skipped").length;

  return (
    <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-ink/5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {f.institutionLogoUrl ? (
            <img
              src={f.institutionLogoUrl}
              alt=""
              className="w-9 h-9 rounded-xl object-contain bg-ink/3 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-ink/5 grid place-items-center shrink-0">
              <Building2 size={16} className="text-ink/40" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-[15px] text-ink truncate">
              {f.productLabel ?? "Facility"}
            </div>
            <div className="text-[12.5px] text-muted truncate">
              {f.institutionName ?? "Provider"}
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-pill text-[11px] font-bold shrink-0 ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-ink/5 border-b border-ink/5">
        <Stat label="Amount" value={f.amount != null ? formatAmount(f.amount, f.currency) : "—"} />
        <Stat label="Rate"   value={f.rate != null ? `${f.rate}%` : "—"} />
        <Stat label="Term"   value={f.termMonths != null ? `${f.termMonths} mo` : "—"} />
      </div>

      {visibleStages.length > 0 && (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-ink/60 uppercase tracking-wider">Progress</span>
            <span className="text-[12px] text-muted">{done} of {visibleStages.length}</span>
          </div>
          <ol className="space-y-2.5">
            {visibleStages.map((s) => <StageRow key={`${s.position}-${s.label}`} stage={s} />)}
          </ol>
        </div>
      )}
    </div>
  );
}

function StageRow({ stage }: { stage: FacilityStage }) {
  const isDone    = stage.status === "completed" || stage.status === "skipped";
  const isCurrent = stage.status === "active" || stage.status === "awaiting_approval";

  return (
    <li className="flex items-center gap-3">
      <span
        className={[
          "w-5 h-5 rounded-full grid place-items-center shrink-0",
          isDone ? "bg-emerald-500 text-white"
            : isCurrent ? "bg-ficium/10 text-ficium"
            : "bg-ink/6 text-ink/30",
        ].join(" ")}
      >
        {isDone ? <Check size={12} strokeWidth={3} /> : isCurrent ? <Clock size={12} /> : null}
      </span>
      <span
        className={[
          "text-[13px] flex-1 min-w-0 truncate",
          isDone ? "text-ink/50" : isCurrent ? "text-ink font-semibold" : "text-ink/40",
        ].join(" ")}
      >
        {stage.label}
      </span>
      {stage.slaBreached && (
        <span className="text-[11px] font-semibold text-amber-600 shrink-0">Delayed</span>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3.5 text-center">
      <div className="text-[11px] text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[14px] font-bold text-ink truncate">{value}</div>
    </div>
  );
}
