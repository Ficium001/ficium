import { useState, useMemo } from "react";
import { useAdminAudit }     from "@/admin/hooks/useAdminData";
import { fmt, outcomePill }  from "./AdminHelpers";

export function AuditSection() {
  const [limit,   setLimit]   = useState(100);
  const [outcome, setOutcome] = useState("all");
  const [search,  setSearch]  = useState("");
  const { data: events = [], isLoading } = useAdminAudit(limit);

  const filtered = useMemo(() => events.filter((e) => {
    const mo = outcome === "all" || e.outcome === outcome;
    const ms = !search
      || e.event_label.toLowerCase().includes(search.toLowerCase())
      || (e.resource_type   ?? "").toLowerCase().includes(search.toLowerCase())
      || (e.institution_name ?? "").toLowerCase().includes(search.toLowerCase())
      || (e.actor_role       ?? "").toLowerCase().includes(search.toLowerCase());
    return mo && ms;
  }), [events, outcome, search]);

  const exportCSV = () => {
    const headers = ["Timestamp","Event","Resource","Institution","Actor role","Outcome","Note"];
    const rows    = filtered.map((e) => [
      new Date(e.created_at).toISOString(),
      e.event_label,
      e.resource_type      ?? "",
      e.institution_name   ?? "",
      e.actor_role         ?? "",
      e.outcome,
      e.outcome_note       ?? "",
    ]);
    const csv  = [headers, ...rows].map((r) => r.map((v) => JSON.stringify(v)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "ficium-admin-audit-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total events",     value: events.length },
          { label: "Successful",       value: events.filter((e) => e.outcome === "success").length },
          { label: "Rejected/failed",  value: events.filter((e) => ["rejected","failed"].includes(e.outcome)).length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="text-3xl font-bold text-ink tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
            <div className="text-[13px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="font-display font-bold text-[16px] text-ink">Unified audit log</span>
            <p className="text-[11px] text-muted mt-0.5 font-mono">Cross-schema · FSC Mauritius reportable · WORM compliant</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event, institution…"
              className="border border-ink/[0.12] rounded-xl px-3 py-1.5 text-[13px] outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/20 w-52" />
            {["all","success","rejected","failed"].map((o) => (
              <button key={o} onClick={() => setOutcome(o)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${outcome === o ? "bg-ficium text-white border-ficium" : "bg-white border-ink/10 text-muted hover:border-ficium/40"}`}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 border border-ink/10 text-muted text-[12px] font-semibold px-3 py-1.5 rounded-xl hover:bg-surface transition-colors">
              ↓ CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-ficium border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                {["Timestamp","Event","Resource","Institution","Actor","Outcome","Note"].map((h) => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-ink/[0.04] hover:bg-surface/60 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="text-[13px] font-semibold text-ink">{fmt.date(e.created_at)}</div>
                    <div className="text-[11px] text-muted font-mono">{fmt.time(e.created_at)}</div>
                  </td>
                  <td className="px-5 py-4"><code className="text-[12px] bg-ink/[0.04] text-ink px-2 py-0.5 rounded-lg font-mono">{e.event_label}</code></td>
                  <td className="px-5 py-4 text-[13px] text-ficium">{e.resource_type ?? "—"}</td>
                  <td className="px-5 py-4 text-[13px] text-ink font-medium">{e.institution_name ?? "—"}</td>
                  <td className="px-5 py-4 text-[13px] text-muted">{e.actor_role ?? "system"}</td>
                  <td className="px-5 py-4">{outcomePill(e.outcome)}</td>
                  <td className="px-5 py-4 text-[12px] text-muted max-w-[180px] truncate">{e.outcome_note ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted text-[13px]">No events match</td></tr>
              )}
            </tbody>
          </table>
        )}

        {events.length >= limit && (
          <div className="px-6 py-4 border-t border-ink/[0.07] flex justify-center">
            <button onClick={() => setLimit((l) => l + 100)}
              className="border border-ink/10 text-muted text-[13px] font-semibold px-5 py-2 rounded-xl hover:bg-surface transition-colors">
              Load more (showing {limit})
            </button>
          </div>
        )}
        <div className="px-6 py-3 border-t border-ink/[0.07] text-[11px] text-muted/50 font-mono text-center">
          APPEND-ONLY · WORM COMPLIANT · FSC MAURITIUS · NO UPDATES OR DELETES PERMITTED
        </div>
      </div>
    </div>
  );
}
