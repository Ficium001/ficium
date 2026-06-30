import { useState }          from "react";
import { useQueryClient }     from "@tanstack/react-query";
import { Edit3, X, AlertCircle, Eye, EyeOff, Save } from "lucide-react";
import { supabase }           from "@/shared/lib/supabase";
import type { ProfileSummary } from "@/individual/dashboard/api/profile";

// ─────────────────────────────────────────────────────────────────────────────
// Layout primitives
// ─────────────────────────────────────────────────────────────────────────────

export function ProfileSection({
  title, icon, isEditing, onEdit, onClose, children,
}: {
  title: string; icon: React.ReactNode; isEditing: boolean;
  onEdit: () => void; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className={[
      "mb-4 bg-white rounded-3xl border overflow-hidden transition-all shadow-card",
      isEditing ? "border-ficium/25" : "border-line",
    ].join(" ")}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-ficium/[0.08] text-ficium grid place-items-center">{icon}</div>
          <span className="font-display text-[16px] font-bold text-ink">{title}</span>
        </div>
        {isEditing ? (
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-line/60 grid place-items-center hover:bg-line transition-colors">
            <X size={14} className="text-muted" />
          </button>
        ) : (
          <button onClick={onEdit} className="text-[12px] font-bold text-ficium hover:underline flex items-center gap-1.5">
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export function InfoRow({ icon, label, value, sensitive, hidden, onToggle }: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  sensitive?: boolean; hidden?: boolean; onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-line/50 last:border-0">
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-muted/70">{icon}</span>
        <span className="text-[13px] text-muted font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="text-[14px] font-semibold text-ink">{sensitive && hidden ? "••••••" : value}</span>
        {sensitive && onToggle && (
          <button onClick={onToggle} className="text-muted hover:text-ink transition-colors p-0.5">
            {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptySection({ message, cta, onCta }: { message: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <AlertCircle size={14} className="flex-shrink-0" /> {message}
      </div>
      <button onClick={onCta} className="text-[12px] font-bold text-ficium hover:underline flex-shrink-0">{cta} →</button>
    </div>
  );
}

const BRAND_GRADIENT = "linear-gradient(135deg, #3536DC 0%, #356EF4 50%, #8231EC 100%)";
const GOOD_GRADIENT  = "linear-gradient(135deg, #12B98A 0%, #0B8A66 100%)";

export function ScoreCard({ label, value, suffix, icon: Icon, tone }: {
  label: string; value: number | null | undefined; suffix: string;
  icon: React.ElementType; tone: "gradient" | "good" | "plain";
}) {
  const dark = tone !== "plain";
  const bg = tone === "gradient" ? BRAND_GRADIENT : tone === "good" ? GOOD_GRADIENT : undefined;
  return (
    <div
      className={[
        "rounded-[20px] p-4 flex flex-col gap-1.5",
        dark ? "shadow-sm" : "bg-white border border-line shadow-sm",
      ].join(" ")}
      style={bg ? { background: bg } : undefined}
    >
      <Icon size={15} className={dark ? "text-white/70" : "text-muted"} />
      <div className={["font-display text-[28px] font-extrabold leading-none", dark ? "text-white" : "text-ink"].join(" ")}>
        {value == null ? "—" : value}
        <span className="text-[12px] font-semibold ml-0.5 opacity-60">{value != null ? suffix : ""}</span>
      </div>
      <div className={["text-[11px] font-semibold leading-tight", dark ? "text-white/65" : "text-muted"].join(" ")}>{label}</div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ficium animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit form shared primitives
// ─────────────────────────────────────────────────────────────────────────────

export function EditField({ label, value, onChange, type = "text", readOnly }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-muted mb-1.5 block">{label}</label>
      <input
        type={type} value={value} onChange={onChange} readOnly={readOnly}
        className={[
          "w-full rounded-xl border px-3.5 py-3 text-[14px] text-ink outline-none transition-all",
          readOnly
            ? "bg-ink/[0.03] border-ink/[0.06] cursor-not-allowed text-muted"
            : "bg-white border-ink/[0.12] focus:border-ficium focus:ring-2 focus:ring-ficium/15",
        ].join(" ")}
      />
    </div>
  );
}

export function SaveBar({ onSave, onCancel, saving }: {
  onSave: () => void; onCancel: () => void; saving?: boolean;
}) {
  return (
    <div className="flex gap-2.5 pt-1">
      <button type="button" onClick={onCancel} disabled={saving}
        className="flex-1 py-3 rounded-xl border border-ink/[0.10] text-[13px] font-bold text-muted hover:border-ink/25 transition-colors disabled:opacity-40">
        Cancel
      </button>
      <button type="button" onClick={onSave} disabled={saving}
        className="flex-1 py-3 rounded-xl bg-ficium text-white text-[13px] font-bold shadow-ficium hover:bg-ficium/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
        {saving
          ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
          : <><Save size={13} /> Save changes</>
        }
      </button>
    </div>
  );
}

const COUNTRIES = ["Mauritius","Réunion","Madagascar","Seychelles","India","South Africa","France","United Kingdom","United States","Other"];

// ─────────────────────────────────────────────────────────────────────────────
// Edit forms — each owns its own local form state + save mutation
// ─────────────────────────────────────────────────────────────────────────────

export function IdentityEditForm({ profile, onClose }: { profile: ProfileSummary | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? "",
    lastName:  profile?.fullName?.split(" ").slice(1).join(" ") ?? "",
    country:   profile?.country   ?? "Mauritius",
    phone:     "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Write to public.clients (v2 schema) — the old public.users was dropped,
      // which is why this previously 404'd. Reads come from client_profile_view,
      // which is backed by clients.
      // full_name is a separate stored column (not derived), and it's what
      // the header / "Full name" row actually display — keep it in sync too.
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const { error } = await supabase.from("clients")
        .update({ first_name: form.firstName, last_name: form.lastName, full_name: fullName, country: form.country })
        .eq("id", user.id);
      if (error) { console.error("Profile update failed:", error.message); setSaving(false); return; }
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setSaving(false); onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <EditField label="First name" value={form.firstName} onChange={set("firstName")} />
        <EditField label="Last name"  value={form.lastName} onChange={set("lastName")} />
      </div>
      <EditField label="Phone" value={form.phone} onChange={set("phone")} type="tel" />
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Country</label>
        <select value={form.country} onChange={set("country")}
          className="w-full rounded-xl border border-ink/[0.12] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-all">
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <SaveBar onSave={handleSave} onCancel={onClose} saving={saving} />
    </div>
  );
}

export function AddressEditForm({ profile, onClose }: { profile: ProfileSummary | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    addressLine1: profile?.addressLine1 ?? "",
    city:         profile?.city         ?? "",
    country:      profile?.country      ?? "Mauritius",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("clients")
        .update({ address_line_1: form.addressLine1, city: form.city, country: form.country })
        .eq("id", user.id);
      if (error) { console.error("Address update failed:", error.message); setSaving(false); return; }
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setSaving(false); onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      <EditField label="Address line 1" value={form.addressLine1} onChange={set("addressLine1")} />
      <EditField label="City / Town"    value={form.city}         onChange={set("city")} />
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Country</label>
        <select value={form.country} onChange={set("country")}
          className="w-full rounded-xl border border-ink/[0.12] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-all">
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <SaveBar onSave={handleSave} onCancel={onClose} saving={saving} />
    </div>
  );
}

export function FinancialEditForm({ profile, onClose, hidden, setHidden }: {
  profile: ProfileSummary | null; onClose: () => void; hidden: boolean; setHidden: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employmentStatus: profile?.employmentStatus ?? "employed",
    monthlyIncome:    String(profile?.monthlyIncome  ?? ""),
    totalNetWorth:    String(profile?.totalNetWorth  ?? ""),
    hasExistingLoans: profile?.hasExistingLoans ? "yes" : "no",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // v2 replaced financial_profiles with client_dossier (keyed on client_id).
      // Writing to the old table silently no-op'd, so edits never persisted.
      const { error } = await supabase.from("client_dossier").update({
        employment_status:  form.employmentStatus,
        monthly_income:     form.monthlyIncome  ? Number(form.monthlyIncome)  : null,
        total_net_worth:    form.totalNetWorth   ? Number(form.totalNetWorth)   : null,
        has_existing_loans: form.hasExistingLoans === "yes",
      }).eq("client_id", user.id);
      if (error) { console.error("Financial profile update failed:", error.message); setSaving(false); return; }
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setSaving(false); onClose();
  };

  const EMPLOYMENT = [
    { v: "employed", l: "Employed" }, { v: "self_employed", l: "Self-employed" },
    { v: "business_owner", l: "Business owner" }, { v: "freelance", l: "Freelancer" },
    { v: "retired", l: "Retired" }, { v: "student", l: "Student" }, { v: "unemployed", l: "Unemployed" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Employment status</label>
        <select value={form.employmentStatus} onChange={set("employmentStatus")}
          className="w-full rounded-xl border border-ink/[0.12] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-all">
          {EMPLOYMENT.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      <div className="relative">
        <EditField label="Monthly income (MUR)" value={hidden ? "••••••" : form.monthlyIncome}
          onChange={set("monthlyIncome")} type={hidden ? "text" : "number"} readOnly={hidden} />
        <button type="button" onClick={() => setHidden(!hidden)}
          className="absolute right-3 bottom-3 text-muted hover:text-ink transition-colors">
          {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
      <EditField label="Total net worth (MUR)" value={hidden ? "••••••" : form.totalNetWorth}
        onChange={set("totalNetWorth")} type={hidden ? "text" : "number"} readOnly={hidden} />
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Existing loans</label>
        <div className="flex gap-3">
          {["yes", "no"].map((v) => (
            <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, hasExistingLoans: v }))}
              className={[
                "flex-1 py-3 rounded-xl text-[13px] font-bold border transition-all",
                form.hasExistingLoans === v
                  ? "bg-ficium text-white border-ficium"
                  : "bg-white text-muted border-ink/[0.12] hover:border-ficium/30",
              ].join(" ")}>
              {v === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>
      <SaveBar onSave={handleSave} onCancel={onClose} saving={saving} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export { formatMUR } from "@/shared/lib/format";

export function formatEmployment(status: string | null): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    employed: "Employed", self_employed: "Self-employed", business_owner: "Business owner",
    freelance: "Freelancer", retired: "Retired", student: "Student", unemployed: "Unemployed",
  };
  return map[status] ?? status;
}
