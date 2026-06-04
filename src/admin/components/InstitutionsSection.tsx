import { useState, useMemo }    from "react";
import {
  useAdminInstitutions, useApproveInstitution,
  useSuspendInstitution, useUpdateModules,
} from "@/admin/hooks/useAdminData";
import type { AdminInstitution } from "@/admin/hooks/useAdminData";
import { fmt, stagePill, deployPill, ALL_MODULES } from "./AdminHelpers";

// ── Institution Modal ─────────────────────────────────────────────────────────

function InstitutionModal({ inst, onClose }: { inst: AdminInstitution; onClose: () => void }) {
  const [modules,      setModules]   = useState<string[]>(inst.modules ?? []);
  const [suspendReason,setSuspend]   = useState("");
  const [showSuspend,  setShowSuspend] = useState(false);
  const approve    = useApproveInstitution();
  const suspend    = useSuspendInstitution();
  const updateMods = useUpdateModules();

  const toggle = (m: string) => setModules((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-ink/[0.07]">
          <div>
            <h2 className="font-display font-bold text-[18px] text-ink">{inst.name}</h2>
            <p className="text-[13px] text-muted mt-0.5">{inst.legal_name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Type",        inst.institution_type],
              ["Deployment",  inst.deployment_model],
              ["Contact",     inst.primary_contact_email ?? "—"],
              ["Registered",  fmt.date(inst.created_at)],
              ["Compliance",  inst.compliance_status],
              ["Users",       inst.user_count ?? 0],
              ["Total bids",  inst.total_bids ?? 0],
              ["Webhooks",    inst.active_webhooks ?? 0],
            ] as [string, unknown][]).map(([k, v]) => (
              <div key={k} className="bg-cream rounded-xl p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{k}</div>
                <div className="text-[13px] font-semibold text-ink">{String(v)}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[12px] font-semibold text-ink mb-2">Licensed modules</div>
            <div className="flex gap-2 flex-wrap">
              {ALL_MODULES.map((m) => (
                <button key={m} onClick={() => toggle(m)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${modules.includes(m) ? "bg-ficium text-white border-ficium" : "bg-white border-ink/10 text-muted hover:border-ficium/40"}`}>
                  {modules.includes(m) ? "✓ " : ""}{m}
                </button>
              ))}
            </div>
            <button onClick={async () => { await updateMods.mutateAsync({ id: inst.id, modules }); }}
              disabled={updateMods.isPending}
              className="mt-3 text-[12px] text-ficium font-semibold hover:underline disabled:opacity-50">
              {updateMods.isPending ? "Saving…" : "Save module changes"}
            </button>
          </div>

          <div className="bg-ficium/5 border border-ficium/15 rounded-xl px-4 py-3 text-[12px] text-ink/60">
            ⚠ Approval and suspension require maker-checker sign-off. A second admin must confirm.
          </div>

          {showSuspend && (
            <div className="space-y-2">
              <input value={suspendReason} onChange={(e) => setSuspend(e.target.value)} placeholder="Reason for suspension (required)"
                className="w-full border border-ink/[0.12] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" />
              <button onClick={async () => { if (!suspendReason.trim()) return; await suspend.mutateAsync({ id: inst.id, reason: suspendReason }); onClose(); }}
                disabled={!suspendReason.trim() || suspend.isPending}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-[13px]">
                {suspend.isPending ? "Suspending…" : "Confirm suspension"}
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {!inst.approved && (
              <button onClick={async () => { await approve.mutateAsync({ id: inst.id, modules }); onClose(); }} disabled={approve.isPending}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-[13px]">
                {approve.isPending ? "Approving…" : "✓ Approve institution"}
              </button>
            )}
            <button onClick={() => setShowSuspend((s) => !s)}
              className="flex-1 bg-white border border-red-200 hover:border-red-400 text-red-500 font-bold py-2.5 rounded-xl transition-colors text-[13px]">
              {showSuspend ? "Cancel" : "Suspend"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Institutions Section ──────────────────────────────────────────────────────

export function InstitutionsSection() {
  const { data: institutions = [], isLoading } = useAdminInstitutions();
  const [filter,   setFilter]  = useState("all");
  const [search,   setSearch]  = useState("");
  const [selected, setSelected] = useState<AdminInstitution | null>(null);

  const filtered = useMemo(() => institutions.filter((i) => {
    const mf = filter === "all"
      || (filter === "approved"   && i.approved)
      || (filter === "pending"    && i.onboarding_stage === "pending_approval")
      || (filter === "compliance" && i.onboarding_stage === "compliance_review")
      || (filter === "suspended"  && !!i.suspended_at);
    const ms = !search
      || i.name.toLowerCase().includes(search.toLowerCase())
      || (i.primary_contact_email ?? "").toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  }), [institutions, filter, search]);

  const stats = [
    { label: "Total",     value: institutions.length },
    { label: "Approved",  value: institutions.filter((i) => i.approved).length },
    { label: "Pending",   value: institutions.filter((i) => i.onboarding_stage === "pending_approval").length },
    { label: "Suspended", value: institutions.filter((i) => !!i.suspended_at).length },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="text-3xl font-bold text-ink tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
            <div className="text-[13px] text-muted">{s.label} institutions</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between flex-wrap gap-3">
          <span className="font-display font-bold text-[16px] text-ink">Institutions</span>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…"
              className="border border-ink/[0.12] rounded-xl px-3 py-1.5 text-[13px] outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/20 w-48" />
            {[["all","All"],["pending","Pending"],["approved","Approved"],["compliance","Compliance"],["suspended","Suspended"]].map(([k,l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${filter === k ? "bg-ficium text-white border-ficium" : "bg-white border-ink/10 text-muted hover:border-ficium/40"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-ficium border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                {["Institution","Type","Deployment","Stage","Modules","Contact","Joined",""].map((h) => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst) => (
                <tr key={inst.id} onClick={() => setSelected(inst)}
                  className="border-b border-ink/[0.04] hover:bg-cream/60 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-ink">{inst.name}</div>
                    <div className="text-[11px] text-muted mt-0.5">{inst.primary_contact_email}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-muted capitalize">{inst.institution_type?.replace(/_/g, " ")}</td>
                  <td className="px-5 py-4">{deployPill(inst.deployment_model)}</td>
                  <td className="px-5 py-4">{stagePill(inst.onboarding_stage)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {(inst.modules ?? []).map((m) => (
                        <span key={m} className="bg-ficium/8 text-ficium text-[10px] font-semibold px-2 py-0.5 rounded-full">{m}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-muted">{inst.primary_contact_email ?? "—"}</td>
                  <td className="px-5 py-4 text-[12px] text-muted whitespace-nowrap">{fmt.date(inst.created_at)}</td>
                  <td className="px-5 py-4">
                    <button className="text-ficium hover:underline text-[12px] font-semibold" onClick={(e) => { e.stopPropagation(); setSelected(inst); }}>→</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted text-[13px]">No institutions match</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {selected && <InstitutionModal inst={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
