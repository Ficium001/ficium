// =============================================================
// Ficium 3 — Admin Panel (Live Supabase Data)
// Reads from admin.institution_overview, admin.unified_audit,
// institution.products via TanStack Query hooks.
// =============================================================
import { useState, useMemo } from "react";
import {
  useAdminInstitutions, useApproveInstitution, useSuspendInstitution,
  useUpdateModules, useAdminProducts, useToggleProduct,
  useAdminAudit, useAdminPendingApprovals,
} from "../hooks/useAdminData";
import type { AdminInstitution } from "../hooks/useAdminData";
import KycSection from "../kyc/KycSection";
import KycSettings from "../kyc/KycSettings";

const ALL_MODULES = ["marketplace", "credit", "ai_advisory", "analytics"];

// ── Helpers ───────────────────────────────────────────────────
const fmt = {
  date:   (s: string) => new Date(s).toLocaleDateString("en-MU", { day:"2-digit", month:"short", year:"numeric" }),
  time:   (s: string) => new Date(s).toLocaleTimeString("en-MU", { hour:"2-digit", minute:"2-digit" }),
  rate:   (r: number | null) => r != null ? (r * 100).toFixed(2) + "%" : "—",
  amount: (a: number | null) => a != null ? "MUR " + Number(a).toLocaleString() : "—",
};

const stagePill = (stage: string) => {
  const map: Record<string, string> = {
    registered:        "bg-ink/5 text-muted",
    commercial_review: "bg-ink/5 text-muted",
    pending_approval:  "bg-amber-50 text-amber-700",
    compliance_review: "bg-amber-50 text-amber-700",
    approved:          "bg-green-50 text-green-700",
    suspended:         "bg-red-50 text-red-500",
    technical_setup:   "bg-ficium/8 text-ficium",
  };
  const label = stage.replace(/_/g," ").replace(/\w/g, c => c.toUpperCase());
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${map[stage] ?? "bg-ink/5 text-muted"}`}>{label}</span>;
};

const deployPill = (model: string) => {
  const map: Record<string, string> = {
    saas:    "bg-ficium/8 text-ficium",
    paas:    "bg-purple-50 text-purple-700",
    on_prem: "bg-red-50 text-red-500",
  };
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${map[model] ?? "bg-ink/5 text-muted"}`}>{model}</span>;
};

const outcomePill = (o: string) => {
  const map: Record<string, string> = {
    success: "bg-green-50 text-green-700",
    rejected:"bg-red-50 text-red-500",
    failed:  "bg-red-50 text-red-500",
    expired: "bg-amber-50 text-amber-700",
    logged:  "bg-ink/5 text-muted",
  };
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${map[o] ?? map.logged}`}>{o}</span>;
};

// ── Institution modal ─────────────────────────────────────────
function InstitutionModal({ inst, onClose }: { inst: AdminInstitution; onClose: () => void }) {
  const [modules, setModules]       = useState<string[]>(inst.modules ?? []);
  const [suspendReason, setSuspend] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);

  const approve = useApproveInstitution();
  const suspend = useSuspendInstitution();
  const updateMods = useUpdateModules();

  const toggle = (m: string) =>
    setModules(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);

  const handleApprove = async () => {
    await approve.mutateAsync({ id: inst.id, modules });
    onClose();
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    await suspend.mutateAsync({ id: inst.id, reason: suspendReason });
    onClose();
  };

  const handleSaveModules = async () => {
    await updateMods.mutateAsync({ id: inst.id, modules });
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-ink/[0.07]">
          <div>
            <h2 className="font-display font-bold text-[18px] text-ink">{inst.name}</h2>
            <p className="text-[13px] text-muted mt-0.5">{inst.legal_name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Type",        inst.institution_type],
              ["Deployment",  inst.deployment_model],
              ["Contact",     inst.primary_contact_email ?? "—"],
              ["Registered",  fmt.date(inst.created_at)],
              ["Compliance",  inst.compliance_status],
              ["Users",       inst.user_count ?? 0],
              ["Total bids",  inst.total_bids ?? 0],
              ["Webhooks",    inst.active_webhooks ?? 0],
            ].map(([k, v]) => (
              <div key={k} className="bg-cream rounded-xl p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{k}</div>
                <div className="text-[13px] font-semibold text-ink">{String(v)}</div>
              </div>
            ))}
          </div>

          {/* Module licensing */}
          <div>
            <div className="text-[12px] font-semibold text-ink mb-2">Licensed modules</div>
            <div className="flex gap-2 flex-wrap">
              {ALL_MODULES.map(m => (
                <button key={m} onClick={() => toggle(m)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    modules.includes(m)
                      ? "bg-ficium text-white border-ficium"
                      : "bg-white border-ink/10 text-muted hover:border-ficium/40"
                  }`}>
                  {modules.includes(m) ? "✓ " : ""}{m}
                </button>
              ))}
            </div>
            <button onClick={handleSaveModules}
              disabled={updateMods.isPending}
              className="mt-3 text-[12px] text-ficium font-semibold hover:underline disabled:opacity-50">
              {updateMods.isPending ? "Saving…" : "Save module changes"}
            </button>
          </div>

          {/* Maker-checker note */}
          <div className="bg-ficium/5 border border-ficium/15 rounded-xl px-4 py-3 text-[12px] text-ink/60">
            ⚠ Approval and suspension require maker-checker sign-off. A second admin must confirm.
          </div>

          {/* Suspend form */}
          {showSuspend && (
            <div className="space-y-2">
              <input value={suspendReason} onChange={e => setSuspend(e.target.value)}
                placeholder="Reason for suspension (required)"
                className="w-full border border-ink/[0.12] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" />
              <button onClick={handleSuspend} disabled={!suspendReason.trim() || suspend.isPending}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-[13px]">
                {suspend.isPending ? "Suspending…" : "Confirm suspension"}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {!inst.approved && (
              <button onClick={handleApprove} disabled={approve.isPending}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-[13px]">
                {approve.isPending ? "Approving…" : "✓ Approve institution"}
              </button>
            )}
            <button onClick={() => setShowSuspend(s => !s)}
              className="flex-1 bg-white border border-red-200 hover:border-red-400 text-red-500 font-bold py-2.5 rounded-xl transition-colors text-[13px]">
              {showSuspend ? "Cancel" : "Suspend"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Institutions section ───────────────────────────────────────
function InstitutionsSection() {
  const { data: institutions = [], isLoading } = useAdminInstitutions();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminInstitution | null>(null);

  const filtered = useMemo(() => institutions.filter(i => {
    const mf = filter === "all"
      || (filter === "approved" && i.approved)
      || (filter === "pending" && i.onboarding_stage === "pending_approval")
      || (filter === "compliance" && i.onboarding_stage === "compliance_review")
      || (filter === "suspended" && !!i.suspended_at);
    const ms = !search || i.name.toLowerCase().includes(search.toLowerCase())
      || (i.primary_contact_email ?? "").toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  }), [institutions, filter, search]);

  const stats = [
    { label: "Total",     value: institutions.length },
    { label: "Approved",  value: institutions.filter(i => i.approved).length },
    { label: "Pending",   value: institutions.filter(i => i.onboarding_stage === "pending_approval").length },
    { label: "Suspended", value: institutions.filter(i => !!i.suspended_at).length },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="text-3xl font-bold text-ink tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
            <div className="text-[13px] text-muted">{s.label} institutions</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between flex-wrap gap-3">
          <span className="font-display font-bold text-[16px] text-ink">Institutions</span>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
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
                {["Institution","Type","Deployment","Stage","Modules","Contact","Joined",""].map(h => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inst => (
                <tr key={inst.id} onClick={() => setSelected(inst)}
                  className="border-b border-ink/[0.04] hover:bg-cream/60 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-ink">{inst.name}</div>
                    <div className="text-[11px] text-muted mt-0.5">{inst.primary_contact_email}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-muted capitalize">{inst.institution_type?.replace(/_/g," ")}</td>
                  <td className="px-5 py-4">{deployPill(inst.deployment_model)}</td>
                  <td className="px-5 py-4">{stagePill(inst.onboarding_stage)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {(inst.modules ?? []).map(m => (
                        <span key={m} className="bg-ficium/8 text-ficium text-[10px] font-semibold px-2 py-0.5 rounded-full">{m}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-muted">{inst.primary_contact_email ?? "—"}</td>
                  <td className="px-5 py-4 text-[12px] text-muted whitespace-nowrap">{fmt.date(inst.created_at)}</td>
                  <td className="px-5 py-4">
                    <button className="text-ficium hover:underline text-[12px] font-semibold" onClick={e => { e.stopPropagation(); setSelected(inst); }}>→</button>
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

// ── Products section ───────────────────────────────────────────
function ProductsSection() {
  const { data: products = [], isLoading } = useAdminProducts();
  const toggleProduct = useToggleProduct();
  const [familyFilter, setFamilyFilter] = useState("all");

  const families = useMemo(() =>
    Array.from(new Set(products.map(p => p.family_label ?? "Other"))),
    [products]
  );

  const filtered = products.filter(p =>
    familyFilter === "all" || (p.family_label ?? "Other") === familyFilter
  );

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total products",  value: products.length },
          { label: "Active",          value: products.filter(p => p.active).length },
          { label: "Inactive",        value: products.filter(p => !p.active).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="text-3xl font-bold text-ink tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
            <div className="text-[13px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between flex-wrap gap-3">
          <span className="font-display font-bold text-[16px] text-ink">Product catalogue</span>
          <div className="flex gap-2">
            {["all", ...families].map(f => (
              <button key={f} onClick={() => setFamilyFilter(f)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${familyFilter === f ? "bg-ficium text-white border-ficium" : "bg-white border-ink/10 text-muted hover:border-ficium/40"}`}>
                {f === "all" ? "All families" : f}
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
                {["Product","Family","Rate range","Amount range","Status",""].map(h => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-ink/[0.04] hover:bg-cream/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-ink">{p.label}</div>
                    <div className="text-[11px] text-muted font-mono mt-0.5">{p.code}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ficium font-medium">{p.family_label ?? "—"}</td>
                  <td className="px-5 py-4 text-[13px] font-mono text-green-700">
                    {fmt.rate(p.rate_config?.min_rate ?? null)} → {fmt.rate(p.rate_config?.max_rate ?? null)}
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ink">
                    {fmt.amount(p.rate_config?.min_amount ?? null)} — {fmt.amount(p.rate_config?.max_amount ?? null)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${p.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-400"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleProduct.mutate({ id: p.id, active: !p.active })}
                      disabled={toggleProduct.isPending}
                      className={`text-[12px] font-semibold px-4 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                        p.active
                          ? "border-red-200 text-red-500 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}>
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Audit section ─────────────────────────────────────────────
function AuditSection() {
  const [limit, setLimit]     = useState(100);
  const [outcome, setOutcome] = useState("all");
  const [search, setSearch]   = useState("");
  const { data: events = [], isLoading } = useAdminAudit(limit);

  const filtered = useMemo(() => events.filter(e => {
    const mo = outcome === "all" || e.outcome === outcome;
    const ms = !search
      || e.event_label.toLowerCase().includes(search.toLowerCase())
      || (e.resource_type ?? "").toLowerCase().includes(search.toLowerCase())
      || (e.institution_name ?? "").toLowerCase().includes(search.toLowerCase())
      || (e.actor_role ?? "").toLowerCase().includes(search.toLowerCase());
    return mo && ms;
  }), [events, outcome, search]);

  const exportCSV = () => {
    const headers = ["Timestamp","Event","Resource","Institution","Actor role","Outcome","Note"];
    const rows = filtered.map(e => [
      new Date(e.created_at).toISOString(),
      e.event_label,
      e.resource_type ?? "",
      e.institution_name ?? "",
      e.actor_role ?? "",
      e.outcome,
      e.outcome_note ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(",")).join("\n");
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total events",    value: events.length },
          { label: "Successful",      value: events.filter(e => e.outcome === "success").length },
          { label: "Rejected/failed", value: events.filter(e => ["rejected","failed"].includes(e.outcome)).length },
        ].map(s => (
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
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search event, institution…"
              className="border border-ink/[0.12] rounded-xl px-3 py-1.5 text-[13px] outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/20 w-52" />
            {["all","success","rejected","failed"].map(o => (
              <button key={o} onClick={() => setOutcome(o)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${outcome === o ? "bg-ficium text-white border-ficium" : "bg-white border-ink/10 text-muted hover:border-ficium/40"}`}>
                {o.charAt(0).toUpperCase()+o.slice(1)}
              </button>
            ))}
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 border border-ink/10 text-muted text-[12px] font-semibold px-3 py-1.5 rounded-xl hover:bg-cream transition-colors">
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
                {["Timestamp","Event","Resource","Institution","Actor","Outcome","Note"].map(h => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-ink/[0.04] hover:bg-cream/60 transition-colors">
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
            <button onClick={() => setLimit(l => l + 100)}
              className="border border-ink/10 text-muted text-[13px] font-semibold px-5 py-2 rounded-xl hover:bg-cream transition-colors">
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

// ── Nav items ─────────────────────────────────────────────────
const NAV = [
  { key: "institutions", label: "Institutions",     icon: "⬡" },
  { key: "kyc",          label: "KYC Review",        icon: "◉" },
  { key: "products",     label: "Product catalogue", icon: "◈" },
  { key: "audit",        label: "Audit log",         icon: "▣" },
  { key: "kyc_settings", label: "KYC Settings",       icon: "⚙" },
];

// ── Main admin panel ──────────────────────────────────────────
export default function FiciumAdminPanel() {
  const [section, setSection] = useState("institutions");
  const { data: pending = [] } = useAdminPendingApprovals();

  const titles: Record<string, string> = {
    institutions: "Institution management",
    kyc:          "KYC review",
    products:     "Product catalogue",
    audit:        "Audit log",
    kyc_settings: "KYC settings",
  };

  return (
    <div className="flex h-screen bg-cream font-body overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-ink/[0.07] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ink/[0.07]">
          <div className="flex items-center gap-2.5">
            <FLogo size={24} className="text-ficium" />
            <div>
              <div className="font-display font-bold text-[15px] text-ink">Ficium</div>
              <div className="text-[10px] text-muted">Admin console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {NAV.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`flex items-center gap-3 w-full mx-auto px-3 py-2.5 mx-3 rounded-xl text-[13px] font-medium transition-all text-left ${
                section === n.key
                  ? "bg-ficium/10 text-ficium font-semibold"
                  : "text-ink/50 hover:text-ink hover:bg-ink/[0.04]"
              }`}
              style={{ width: "calc(100% - 24px)", marginLeft: 12 }}>
              <span className="text-[15px]">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-ink/[0.07] p-4">
          <div className="text-[11px] text-muted mb-1">Signed in as</div>
          <div className="text-[12px] font-semibold text-ink">Ficium Admin</div>
          <div className="text-[10px] text-muted mt-0.5">ficium_admin · service_role</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-ink/[0.07] flex items-center justify-between px-6 flex-shrink-0">
          <span className="font-display font-bold text-[16px] text-ink">{titles[section]}</span>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-semibold px-3 py-1 rounded-full">
                {pending.length} pending approval{pending.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="bg-ficium/8 text-ficium text-[11px] font-bold px-3 py-1 rounded-full">
              MAKER-CHECKER ON
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {section === "institutions" && <InstitutionsSection />}
          {section === "kyc"          && <KycSection />}
          {section === "products"     && <ProductsSection />}
          {section === "audit"        && <AuditSection />}
          {section === "kyc_settings" && <KycSettings />}
        </main>
      </div>
    </div>
  );
}

function FLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58 L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z" fill="currentColor" />
    </svg>
  );
}
