import { Building2, CheckCircle2 } from "lucide-react";
import { TrackerTimeline }         from "../components/TrackerTimeline";
import { useLoanTracker }          from "../hooks/useTracker";

const fmtMUR = (v: number) =>
  `MUR ${Number(v).toLocaleString("en-MU", { maximumFractionDigits: 0 })}`;

const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("en-MU", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

interface TrackerTabProps {
  requestId: string;
}

export function TrackerTab({ requestId }: TrackerTabProps) {
  const { data: tracker, isLoading } = useLoanTracker(requestId);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-ink/[0.07] flex-shrink-0" />
            <div className="flex-1 pt-1 space-y-1.5">
              <div className="h-3.5 bg-ink/[0.07] rounded w-2/3" />
              <div className="h-3 bg-ink/[0.04] rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── No pipeline yet ── */
  if (!tracker || tracker.status === "pending") {
    return (
      <div className="py-8 text-center space-y-2">
        <div className="text-[32px]">⏳</div>
        <div className="font-semibold text-ink text-[14px]">Setting up your pipeline</div>
        <div className="text-[13px] text-muted max-w-xs mx-auto leading-relaxed">
          Your loan processing pipeline is being created. Check back shortly.
        </div>
      </div>
    );
  }

  const isComplete = tracker.status === "completed";

  return (
    <div className="space-y-5">

      {/* Institution + deal header */}
      <div className="bg-paper rounded-2xl px-4 py-4 space-y-2">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Building2 size={13} className="flex-shrink-0" />
          <span className="font-semibold text-ink">{tracker.institution_name}</span>
        </div>
        <div className="flex gap-4 text-[12px]">
          <div>
            <div className="text-[9px] text-muted uppercase tracking-widest font-bold">Amount</div>
            <div className="font-bold text-ink">{fmtMUR(tracker.deal_amount)}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted uppercase tracking-widest font-bold">Rate</div>
            <div className="font-bold text-ink">{(tracker.deal_rate * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-[9px] text-muted uppercase tracking-widest font-bold">Term</div>
            <div className="font-bold text-ink">{tracker.deal_term_months}m</div>
          </div>
        </div>
        {tracker.started_at && (
          <div className="text-[11px] text-muted">
            Started {fmtDate(tracker.started_at)}
            {tracker.completed_at && ` · Completed ${fmtDate(tracker.completed_at)}`}
          </div>
        )}
      </div>

      {/* Completion banner */}
      {isComplete && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200
                        rounded-2xl px-4 py-3">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-green-800">Loan disbursed</div>
            <div className="text-[12px] text-green-700 mt-0.5">
              Your funds have been released. Congratulations!
            </div>
          </div>
        </div>
      )}

      {/* Stage timeline */}
      <div>
        <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">
          Processing stages
        </div>
        <TrackerTimeline stages={tracker.stages} />
      </div>

      {/* Help note */}
      {!isComplete && (
        <div className="bg-ink/[0.03] rounded-2xl px-4 py-3 text-[12px] text-muted leading-relaxed">
          Your lender will contact you directly if any action is needed from you.
          Processing typically takes <strong className="text-ink">5–10 business days</strong>.
        </div>
      )}
    </div>
  );
}
