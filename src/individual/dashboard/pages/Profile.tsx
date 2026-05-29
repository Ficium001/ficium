import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, ShieldCheck, ShieldAlert, MapPin, Briefcase,
  TrendingUp, AlertCircle, CheckCircle2, Circle,
  Wallet, Activity, Zap, Edit3, X, Save, Eye, EyeOff,
  User, Mail, Globe, Building2, DollarSign,
} from "lucide-react";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { useProfile, useBankReadiness } from "../hooks/useDashboard";
import { BottomNav } from "../../../shared/ui";

/* ============================================================
   TYPES
   ============================================================ */
type EditSection = "identity" | "address" | "financial" | null;

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Profile() {
  const { signOut } = useAuth();
  const navigate    = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const { score: bankReadiness }     = useBankReadiness();
  const [editing, setEditing]        = useState<EditSection>(null);
  const [hidden, setHidden]          = useState(true);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (isLoading) return <LoadingScreen />;

  const kycVerified  = profile?.kycStatus === "verified";
  const completion   = profile?.completion;
  const percent      = completion?.percent ?? 0;

  return (
    <div className="min-h-screen pb-28">

      {/* ── GRADIENT BG ── */}
      <div className="absolute top-0 left-0 right-0 h-[340px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 40%, rgba(79,70,229,0.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 70%, rgba(201,168,76,0.2) 0%, transparent 50%)"
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#f8f7f4] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[720px] px-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <div className="pt-10 pb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Account</div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Profile
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-white/15 transition-colors mt-2"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* ── HERO IDENTITY CARD ── */}
        <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] p-5 sm:p-6 mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-ficium to-violet-600 grid place-items-center flex-shrink-0 text-white font-bold text-2xl shadow-lg">
              {profile?.firstName?.[0]?.toUpperCase() ?? profile?.fullName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[22px] font-bold text-white leading-tight truncate">
                {profile?.fullName ?? profile?.firstName ?? "—"}
              </div>
              <div className="text-[14px] text-white/55 mt-0.5">{profile?.email ?? "—"}</div>
              <div className="flex items-center gap-2 mt-2">
                {kycVerified ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-pill">
                    <ShieldCheck size={11} /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-pill">
                    <ShieldAlert size={11} /> Pending KYC
                  </span>
                )}
                <span className="text-[11px] text-white/40 font-medium">Individual</span>
              </div>
            </div>
          </div>

          {/* Completion bar */}
          <div className="mt-5 pt-5 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-white/60 font-semibold">Profile completion</span>
              <span className="font-display text-[22px] font-extrabold text-white">{percent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-pill overflow-hidden">
              <div
                className="h-2 rounded-pill transition-all duration-700"
                style={{
                  width: `${percent}%`,
                  background: percent === 100 ? "#34d399" : percent >= 60 ? "#fbbf24" : "#4f46e5",
                }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {[
                { label: "Account created",    done: true,                                       href: null },
                { label: "Identity verified",  done: completion?.kycVerified ?? false,           href: "/onboarding/kyc" },
                { label: "Proof of address",   done: completion?.proofOfAddressDone ?? false,    href: "/onboarding/kyc" },
                { label: "Financial profile",  done: completion?.financialProfileDone ?? false,  href: "/onboarding/dossier" },
                { label: "Source of wealth",   done: completion?.sourceOfWealthDone ?? false,    href: "/onboarding/dossier" },
              ].map((m) => (
                <div key={m.label} className={[
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border",
                  m.done
                    ? "bg-emerald-500/20 border-emerald-400/30"
                    : "bg-white/5 border-white/10",
                ].join(" ")}>
                  {m.done
                    ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    : <Circle size={13} className="text-white/30 flex-shrink-0" />}
                  <span className={[
                    "text-[12px] font-semibold truncate",
                    m.done ? "text-white" : "text-white/45",
                  ].join(" ")}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SCORE CARDS ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <ScoreCard
            label="Financial Health"
            value={profile?.healthScore}
            suffix="/100"
            icon={Activity}
            gradient="from-ficium to-violet-600"
            light={false}
          />
          <ScoreCard
            label="Bank Readiness"
            value={bankReadiness}
            suffix="%"
            icon={Zap}
            gradient="from-emerald-400 to-teal-500"
            light
          />
          <ScoreCard
            label="Risk Score"
            value={profile?.riskScore}
            suffix="/100"
            icon={TrendingUp}
            gradient={null}
            light={false}
          />
        </div>

        {/* ── IDENTITY SECTION ── */}
        <ProfileSection
          title="Identity"
          icon={<User size={16} />}
          isEditing={editing === "identity"}
          onEdit={() => setEditing("identity")}
          onClose={() => setEditing(null)}
        >
          {editing === "identity" ? (
            <IdentityEditForm profile={profile} onClose={() => setEditing(null)} />
          ) : (
            <div className="flex flex-col gap-0">
              <InfoRow icon={<User size={14} />}    label="Full name"  value={profile?.fullName ?? profile?.firstName ?? "—"} />
              <InfoRow icon={<Mail size={14} />}    label="Email"      value={profile?.email ?? "—"} />
              <InfoRow icon={<Globe size={14} />}   label="Country"    value={profile?.country ?? "—"} />
              <InfoRow
                icon={<ShieldCheck size={14} />}
                label="KYC status"
                value={
                  <span className={[
                    "text-[12px] font-bold px-2.5 py-1 rounded-pill",
                    kycVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                  ].join(" ")}>
                    {kycVerified ? "✓ Verified" : "Pending"}
                  </span>
                }
              />
            </div>
          )}
        </ProfileSection>

        {/* ── ADDRESS SECTION ── */}
        <ProfileSection
          title="Address"
          icon={<MapPin size={16} />}
          isEditing={editing === "address"}
          onEdit={() => setEditing("address")}
          onClose={() => setEditing(null)}
        >
          {editing === "address" ? (
            <AddressEditForm profile={profile} onClose={() => setEditing(null)} />
          ) : profile?.addressLine1 ? (
            <div className="flex flex-col gap-0">
              <InfoRow icon={<MapPin size={14} />}   label="Address"         value={profile.addressLine1} />
              <InfoRow icon={<Building2 size={14} />} label="City"           value={profile.city ?? "—"} />
              <InfoRow icon={<Globe size={14} />}     label="Country"        value={profile.country ?? "—"} />
              <InfoRow
                icon={<CheckCircle2 size={14} />}
                label="Proof of address"
                value={
                  completion?.proofOfAddressDone
                    ? <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-pill">✓ Uploaded</span>
                    : <span className="text-[12px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-pill">Not uploaded</span>
                }
              />
            </div>
          ) : (
            <EmptySection message="No address on file." cta="Add address" onCta={() => setEditing("address")} />
          )}
        </ProfileSection>

        {/* ── FINANCIAL PROFILE SECTION ── */}
        <ProfileSection
          title="Financial profile"
          icon={<Briefcase size={16} />}
          isEditing={editing === "financial"}
          onEdit={() => setEditing("financial")}
          onClose={() => setEditing(null)}
        >
          {editing === "financial" ? (
            <FinancialEditForm profile={profile} onClose={() => setEditing(null)} hidden={hidden} setHidden={setHidden} />
          ) : profile?.hasDossier ? (
            <div className="flex flex-col gap-0">
              <InfoRow icon={<Briefcase size={14} />}    label="Employment"     value={formatEmployment(profile.employmentStatus)} />
              <InfoRow icon={<DollarSign size={14} />}   label="Monthly income" value={profile.monthlyIncome ? formatMUR(profile.monthlyIncome) : "—"} sensitive hidden={hidden} onToggle={() => setHidden(h => !h)} />
              <InfoRow icon={<Wallet size={14} />}       label="Net worth"      value={profile.totalNetWorth ? formatMUR(profile.totalNetWorth) : "—"} sensitive hidden={hidden} />
              <InfoRow icon={<AlertCircle size={14} />}  label="Existing loans" value={profile.hasExistingLoans ? "Yes" : "No"} />
              <InfoRow
                icon={<ShieldCheck size={14} />}
                label="Compliance"
                value={
                  profile.eddRequired
                    ? <span className="text-[12px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-pill">EDD required</span>
                    : <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-pill">✓ Clear</span>
                }
              />
            </div>
          ) : (
            <EmptySection message="No financial profile yet." cta="Complete profile" onCta={() => setEditing("financial")} />
          )}
        </ProfileSection>

      </div>
      <BottomNav />
    </div>
  );
}

/* ============================================================
   PROFILE SECTION WRAPPER
   ============================================================ */
function ProfileSection({
  title, icon, isEditing, onEdit, onClose, children,
}: {
  title: string;
  icon: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={[
      "mb-4 bg-white rounded-[22px] border overflow-hidden transition-all",
      isEditing ? "border-ficium/25 shadow-md" : "border-ink/[0.06] shadow-sm",
    ].join(" ")}>
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-ficium/10 text-ficium grid place-items-center">
            {icon}
          </div>
          <span className="font-display text-[16px] font-bold">{title}</span>
        </div>
        {isEditing ? (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ink/[0.06] grid place-items-center hover:bg-ink/10 transition-colors"
          >
            <X size={14} className="text-muted" />
          </button>
        ) : (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-[12px] font-bold text-ficium hover:underline"
          >
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>
      {/* Content */}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* ============================================================
   INFO ROW
   ============================================================ */
function InfoRow({ icon, label, value, sensitive, hidden, onToggle }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sensitive?: boolean;
  hidden?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-ink/[0.04] last:border-0">
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className="text-muted">{icon}</span>
        <span className="text-[13px] text-muted font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="text-[13px] font-semibold text-ink">
          {sensitive && hidden ? "••••••" : value}
        </span>
        {sensitive && onToggle && (
          <button onClick={onToggle} className="text-muted hover:text-ink transition-colors">
            {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY SECTION
   ============================================================ */
function EmptySection({ message, cta, onCta }: { message: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <AlertCircle size={14} className="flex-shrink-0" />
        {message}
      </div>
      <button onClick={onCta} className="text-[12px] font-bold text-ficium hover:underline flex-shrink-0">
        {cta} →
      </button>
    </div>
  );
}

/* ============================================================
   SCORE CARD
   ============================================================ */
function ScoreCard({ label, value, suffix, icon: Icon, gradient, light }: {
  label: string;
  value: number | null | undefined;
  suffix: string;
  icon: React.ElementType;
  gradient: string | null;
  light: boolean;
}) {
  const hasBg = gradient !== null;
  return (
    <div className={[
      "rounded-[20px] p-4 flex flex-col gap-1.5",
      hasBg
        ? `bg-gradient-to-br ${gradient} shadow-sm`
        : "bg-white border border-ink/[0.06] shadow-sm",
    ].join(" ")}>
      <Icon size={15} className={hasBg ? (light ? "text-white/70" : "text-white/70") : "text-muted"} />
      <div className={["font-display text-[28px] font-extrabold leading-none", hasBg ? "text-white" : "text-ink"].join(" ")}>
        {value == null ? "—" : value}
        <span className={["text-[12px] font-semibold ml-0.5 opacity-60"].join(" ")}>{value != null ? suffix : ""}</span>
      </div>
      <div className={["text-[11px] font-semibold leading-tight", hasBg ? "text-white/60" : "text-muted"].join(" ")}>
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   IDENTITY EDIT FORM
   ============================================================ */
function IdentityEditForm({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? "",
    // lastName not in ProfileSummary
    phone: "",
    country:   profile?.country   ?? "Mauritius",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const { data: { user } } = await import("../../../shared/lib/supabase").then(m => m.supabase.auth.getUser());
    if (!user) return;
    await import("../../../shared/lib/supabase").then(({ supabase }) =>
      supabase.from("profiles").update({
        first_name: form.firstName,
        country: form.country,
        phone: form.phone || null,
      }).eq("user_id", user.id)
    );
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <EditField label="First name"  value={form.firstName} onChange={set("firstName")} />
        <EditField label="Last name" value={profile?.fullName?.split(" ").slice(1).join(" ") ?? ""} onChange={set("firstName")} />
      </div>
      <EditField label="Phone"   value={form.phone}   onChange={set("phone")} type="tel" />
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Country</label>
        <select
          value={form.country}
          onChange={set("country")}
          className="w-full rounded-xl border border-ink/[0.12] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-all"
        >
          {["Mauritius","Réunion","Madagascar","Seychelles","India","South Africa","France","United Kingdom","United States","Other"]
            .map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <SaveBar onSave={handleSave} onCancel={onClose} />
    </div>
  );
}

/* ============================================================
   ADDRESS EDIT FORM
   ============================================================ */
function AddressEditForm({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [form, setForm] = useState({
    addressLine1: profile?.addressLine1 ?? "",
    city:         profile?.city         ?? "",
    country:      profile?.country      ?? "Mauritius",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const { data: { user } } = await import("../../../shared/lib/supabase").then(m => m.supabase.auth.getUser());
    if (!user) return;
    await import("../../../shared/lib/supabase").then(({ supabase }) =>
      supabase.from("profiles").update({
        address_line_1: form.addressLine1,
        city: form.city,
        country: form.country,
      }).eq("user_id", user.id)
    );
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      <EditField label="Address line 1" value={form.addressLine1} onChange={set("addressLine1")} />
      <EditField label="City / Town"    value={form.city}         onChange={set("city")} />
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Country</label>
        <select
          value={form.country}
          onChange={set("country")}
          className="w-full rounded-xl border border-ink/[0.12] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-all"
        >
          {["Mauritius","Réunion","Madagascar","Seychelles","India","South Africa","France","United Kingdom","United States","Other"]
            .map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <SaveBar onSave={handleSave} onCancel={onClose} />
    </div>
  );
}

/* ============================================================
   FINANCIAL EDIT FORM
   ============================================================ */
function FinancialEditForm({ profile, onClose, hidden, setHidden }: {
  profile: any; onClose: () => void; hidden: boolean; setHidden: (v: boolean) => void;
}) {
  const [form, setForm] = useState({
    employmentStatus: profile?.employmentStatus ?? "employed",
    monthlyIncome:    String(profile?.monthlyIncome ?? ""),
    totalNetWorth:    String(profile?.totalNetWorth ?? ""),
    hasExistingLoans: profile?.hasExistingLoans ? "yes" : "no",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const { data: { user } } = await import("../../../shared/lib/supabase").then(m => m.supabase.auth.getUser());
    if (!user) return;
    await import("../../../shared/lib/supabase").then(({ supabase }) =>
      supabase.from("financial_profiles").update({
        employment_status: form.employmentStatus,
        monthly_income: form.monthlyIncome ? Number(form.monthlyIncome) : null,
        total_net_worth: form.totalNetWorth ? Number(form.totalNetWorth) : null,
        has_existing_loans: form.hasExistingLoans === "yes",
      }).eq("user_id", user.id)
    );
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Employment status</label>
        <select
          value={form.employmentStatus}
          onChange={set("employmentStatus")}
          className="w-full rounded-xl border border-ink/[0.12] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-all"
        >
          {[
            { v: "employed",       l: "Employed" },
            { v: "self_employed",  l: "Self-employed" },
            { v: "business_owner", l: "Business owner" },
            { v: "freelance",      l: "Freelancer" },
            { v: "retired",        l: "Retired" },
            { v: "student",        l: "Student" },
            { v: "unemployed",     l: "Unemployed" },
          ].map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      <div className="relative">
        <EditField
          label="Monthly income (MUR)"
          value={hidden ? "••••••" : form.monthlyIncome}
          onChange={set("monthlyIncome")}
          type={hidden ? "text" : "number"}
          readOnly={hidden}
        />
        <button
          type="button"
          onClick={() => setHidden(!hidden)}
          className="absolute right-3 bottom-3 text-muted hover:text-ink transition-colors"
        >
          {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
      <EditField label="Total net worth (MUR)" value={hidden ? "••••••" : form.totalNetWorth} onChange={set("totalNetWorth")} type={hidden ? "text" : "number"} readOnly={hidden} />
      <div>
        <label className="text-[12px] font-semibold text-muted mb-1.5 block">Existing loans</label>
        <div className="flex gap-3">
          {["yes","no"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm((f) => ({ ...f, hasExistingLoans: v }))}
              className={[
                "flex-1 py-3 rounded-xl text-[13px] font-bold border transition-all",
                form.hasExistingLoans === v
                  ? "bg-ficium text-white border-ficium"
                  : "bg-white text-muted border-ink/[0.12] hover:border-ficium/30",
              ].join(" ")}
            >
              {v === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>
      <SaveBar onSave={handleSave} onCancel={onClose} />
    </div>
  );
}

/* ============================================================
   SHARED EDIT COMPONENTS
   ============================================================ */
function EditField({ label, value, onChange, type = "text", readOnly }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-muted mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
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

function SaveBar({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2.5 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-3 rounded-xl border border-ink/[0.10] text-[13px] font-bold text-muted hover:border-ink/25 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="flex-1 py-3 rounded-xl bg-ficium text-white text-[13px] font-bold shadow-ficium hover:bg-ficium/90 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={13} /> Save changes
      </button>
    </div>
  );
}

/* ============================================================
   LOADING SCREEN
   ============================================================ */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ficium animate-spin" />
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatMUR(amount: number): string {
  return `MUR ${new Intl.NumberFormat("en-MU", { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatEmployment(status: string | null): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    employed: "Employed", self_employed: "Self-employed",
    business_owner: "Business owner", freelance: "Freelancer",
    retired: "Retired", student: "Student", unemployed: "Unemployed",
  };
  return map[status] ?? status;
}