// =============================================================
// Ficium — Client Audit Trail
// Shows the client their own action history from public.audit_events
// WORM — read only, append-only log
// =============================================================
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../shared/lib/supabase";

type AuditRow = {
  id: string;
  action_category: string;
  event_label: string;
  resource_type: string | null;
  outcome: string;
  outcome_note: string | null;
  created_at: string;
};

function useClientAudit(limit = 50) {
  return useQuery<AuditRow[]>({
    queryKey: ["client-audit", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("id, action_category, event_label, resource_type, outcome, outcome_note, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    staleTime: 30 * 1000,
  });
}

const fmt = {
  date: (s: string) => new Date(s).toLocaleDateString("en-MU", { day: "2-digit", month: "short", year: "numeric" }),
  time: (s: string) => new Date(s).toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" }),
};

function outcomePill(outcome: string) {
  const map: Record<string, string> = {
    success:  "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-500 border-red-200",
    error:    "bg-red-50 text-red-500 border-red-200",
    expired:  "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${map[outcome] ?? "bg-ink/5 text-muted border-ink/10"}`}>
      {outcome}
    </span>
  );
}

function categoryLabel(category: string) {
  const map: Record<string, string> = {
    "kyc.status_change": "KYC",
    "request.submit":    "Request",
    "request.cancel":    "Request",
    "bid.accept":        "Bid",
    "bid.submit":        "Bid",
  };
  const color: Record<string, string> = {
    "kyc.status_change": "bg-purple-50 text-purple-700",
    "request.submit":    "bg-ficium/8 text-ficium",
    "request.cancel":    "bg-amber-50 text-amber-700",
    "bid.accept":        "bg-green-50 text-green-700",
    "bid.submit":        "bg-green-50 text-green-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${color[category] ?? "bg-ink/5 text-muted"}`}>
      {map[category] ?? category.split(".")[0]}
    </span>
  );
}

export default function ClientAudit() {
  const [limit, setLimit] = useState(50);
  const { data: events = [], isLoading } = useClientAudit(limit);

  const exportCSV = () => {
    const headers = ["Timestamp", "Action", "Event", "Resource", "Outcome", "Note"];
    const rows = events.map(e => [
      new Date(e.created_at).toISOString(),
      e.action_category,
      e.event_label,
      e.resource_type ?? "",
      e.outcome,
      e.outcome_note ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "my-activity-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Activity log</h1>
          <p className="text-muted mt-1.5">Your complete action history — read only, append-only record</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 border border-ink/10 text-muted text-[13px] font-semibold px-4 py-2 rounded-xl hover:bg-surface transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total actions", value: events.length },
          { label: "Successful",    value: events.filter(e => e.outcome === "success").length },
          { label: "This month",    value: events.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth()).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="text-3xl font-bold text-ink tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
            <div className="text-[13px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between">
          <span className="font-display font-bold text-[16px] text-ink">All activity</span>
          <span className="text-[11px] text-muted font-mono">WORM · append-only · tamper-proof</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ficium border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-muted text-[13px]">No activity recorded yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                {["When", "Category", "Event", "Resource", "Outcome"].map(h => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-b border-ink/[0.04] hover:bg-surface/60 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="text-[13px] font-semibold text-ink">{fmt.date(e.created_at)}</div>
                    <div className="text-[11px] text-muted font-mono">{fmt.time(e.created_at)}</div>
                  </td>
                  <td className="px-5 py-4">{categoryLabel(e.action_category)}</td>
                  <td className="px-5 py-4">
                    <span className="text-[13px] text-ink capitalize">{e.event_label.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-muted font-mono">{e.resource_type ?? "—"}</td>
                  <td className="px-5 py-4">{outcomePill(e.outcome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {events.length >= limit && (
          <div className="px-6 py-4 border-t border-ink/[0.07] flex justify-center">
            <button
              onClick={() => setLimit(l => l + 50)}
              className="border border-ink/10 text-muted text-[13px] font-semibold px-5 py-2 rounded-xl hover:bg-surface transition-colors"
            >
              Load more (showing {limit})
            </button>
          </div>
        )}

        <div className="px-6 py-3 border-t border-ink/[0.07] text-[11px] text-muted/50 font-mono text-center">
          APPEND-ONLY · WORM COMPLIANT · NO UPDATES OR DELETES PERMITTED
        </div>
      </div>
    </div>
  );
}
