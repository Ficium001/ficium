// src/individual/money/portfolio/components/FacilityCard.tsx
// A facility the borrower obtained through Ficium, with its progress stages.
import { Building2, Check, Clock } from "lucide-react";
import { formatAmount } from "@/shared/lib/format";
import type { Facility, FacilityStage } from "@/individual/money/portfolio/types";

const STATUS_STYLES: Record<Facility["status"], { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Completed", cls: "bg-ink/5 text-ink/60" },
  withdrawn: { label: "Withdrawn", cls: "bg-ink/5 text-ink/50" },
  declined:  { label: "Declined",  cls: "bg-red-50 text-red-600" },
};

export default function FacilityCard({ facility: f }: { facility: Facility }) {
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
            <span className="text-[12px] font-bold text-ink/60">Progress</span>
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
      <div className="text-[11px] text-muted mb-0.5">{label}</div>
      <div className="text-[14px] font-bold text-ink truncate">{value}</div>
    </div>
  );
}
