
// =============================================================
// Ficium 3 — Institution Audit Log
// Append-only, FSC Mauritius reportable.
// Filter by outcome, search by event/resource, export CSV.
// =============================================================
import { useState, useMemo } from "react";
import { ScrollText, Filter, Download, X } from "lucide-react";
import { useAuditEvents } from "../../hooks/useInstitution";
// utils imported on demand

const OUTCOME_FILTERS = [
  { key: "all",     label: "All"      },
  { key: "success", label: "Success"  },
  { key: "rejected",label: "Rejected" },
  { key: "failed",  label: "Failed"   },
];

export default function InstitutionAudit() {
  const [limit, setLimit]           = useState(50);
  const [outcomeFilter, setOutcome] = useState("all");
  const [search, setSearch]         = useState("");

  const { data: events = [], isLoading } = useAuditEvents(limit);

  const filtered = useMemo(() => events.filter(e => {
    const matchOutcome = outcomeFilter === "all" || e.outcome === outcomeFilter;
    const matchSearch  = !search ||
      e.event_label.toLowerCase().includes(search.toLowerCase()) ||
      (e.resource_type ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.actor_role ?? "").toLowerCase().includes(search.toLowerCase());
    return matchOutcome && matchSearch;
  }), [events, outcomeFilter, search]);

  const exportCSV = () => {
    const rows = [
      ["Timestamp","Event","Resource","Resource ID","Actor role","Outcome","Note"],
      ...filtered.map(e => [
        new Date(e.created_at).toISOString(),
        e.event_label,
        e.resource_type ?? "",
        e.resource_id ?? "",
        e.actor_role ?? "",
        e.outcome,
        e.outcome_note ?? "",
      ]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ficium-audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const outcomeBadge = (outcome: string) => {
    const map: Record<string, string> = {
      success:  "bg-[#052e16] text-green-400 border-[#166534]",
      rejected: "bg-[#1c0000] text-red-400 border-red-900",
      failed:   "bg-[#1c0000] text-red-400 border-red-900",
      expired:  "bg-[#1c1208] text-amber-400 border-amber-900",
      logged:   "bg-[#111] text-slate-500 border-[#222]",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${map[outcome] ?? map.logged}`}>
        {outcome}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wide">Audit log</h1>
          <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} · append-only · WORM compliant
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-[#0b0f18] border border-[#1e2d3d] text-slate-400 hover:text-slate-200 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* FSC banner */}
      <div className="bg-[#070a0f] border border-[#141b27] rounded-lg px-4 py-2.5 flex items-center gap-3 mb-5">
        <ScrollText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <p className="text-[10px] text-slate-600 font-mono tracking-wide">
          APPEND-ONLY · WORM COMPLIANT · FSC MAURITIUS REPORTABLE · NO UPDATES OR DELETES PERMITTED
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total events",    value: events.length,                              color: "text-blue-400",  bg: "bg-[#0c1a2e]" },
          { label: "Successful",      value: events.filter(e => e.outcome === "success").length,  color: "text-green-400", bg: "bg-[#052e16]" },
          { label: "Rejected/failed", value: events.filter(e => ["rejected","failed"].includes(e.outcome)).length, color: "text-red-400", bg: "bg-[#1c0000]" },
          { label: "Showing",         value: filtered.length,                            color: "text-slate-400", bg: "bg-[#111]"    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#141b27] rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${s.color} tracking-tight mb-1`}>{s.value}</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          {OUTCOME_FILTERS.map(f => (
            <button key={f.key}
              onClick={() => setOutcome(f.key)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                outcomeFilter === f.key
                  ? "bg-[#0f1929] border-blue-500 text-blue-400"
                  : "border-[#1e2d3d] text-slate-500 hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search event, resource, role..."
              className="bg-[#0b0f18] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-mono focus:border-blue-500 outline-none w-56"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ScrollText className="w-10 h-10 text-slate-800 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">No audit events match</p>
        </div>
      ) : (
        <>
          <div className="bg-[#0b0f18] border border-[#141b27] rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Timestamp","Event","Resource","Actor role","Outcome","Note"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold text-slate-700 uppercase tracking-widest border-b border-[#141b27] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-[#0d1420] hover:bg-[#0d1420] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-[11px] text-blue-400 font-mono">{new Date(e.created_at).toLocaleDateString("en-MU", { day:"2-digit", month:"short", year:"numeric" })}</div>
                      <div className="text-[9px] text-slate-600 font-mono">{new Date(e.created_at).toLocaleTimeString("en-MU", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[10px] text-slate-300 bg-[#070a0f] px-1.5 py-0.5 rounded font-mono">
                        {e.event_label}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-purple-400">{e.resource_type ?? "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{e.actor_role ?? "system"}</td>
                    <td className="px-4 py-3">{outcomeBadge(e.outcome)}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-600 max-w-[200px] truncate">
                      {e.outcome_note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {events.length >= limit && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setLimit(l => l + 50)}
                className="text-[10px] text-blue-500 hover:text-blue-400 border border-[#1e2d3d] px-4 py-2 rounded-lg transition-colors"
              >
                Load more (showing {limit})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
