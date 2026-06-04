import { useState }   from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, ShieldCheck, ShieldAlert, MapPin, Briefcase,
  TrendingUp, CheckCircle2, Circle,
  Wallet, Activity, Zap,
  User, Mail, Globe, Building2, DollarSign, AlertCircle,
} from "lucide-react";
import { useAuth }                       from "@/features/auth/context/AuthContext";
import { useProfile, useBankReadiness }  from "@/individual/dashboard/hooks/useDashboard";
import { BottomNav }                     from "@/shared/ui";
import {
  ProfileSection, InfoRow, EmptySection, ScoreCard,
  LoadingScreen, IdentityEditForm, AddressEditForm, FinancialEditForm,
  formatMUR, formatEmployment,
} from "@/individual/dashboard/components/profile/ProfileComponents";

// ─────────────────────────────────────────────────────────────────────────────
// Profile page — thin orchestrator.
// All sub-components live in components/profile/ProfileComponents.tsx.
// ─────────────────────────────────────────────────────────────────────────────

type EditSection = "identity" | "address" | "financial" | null;

export default function Profile() {
  const { signOut }  = useAuth();
  const navigate     = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const { score: bankReadiness }     = useBankReadiness();
  const [editing, setEditing]        = useState<EditSection>(null);
  const [hidden,  setHidden]         = useState(true);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (isLoading) return <LoadingScreen />;

  const kycVerified = profile?.kycStatus === "verified";
  const completion  = profile?.completion;
  const percent     = completion?.percent ?? 0;

  return (
    <div className="min-h-screen pb-28">

      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-[340px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 40%, rgba(79,70,229,0.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 70%, rgba(201,168,76,0.2) 0%, transparent 50%)"
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#f8f7f4] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[720px] px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="pt-10 pb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Account</div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">Profile</h1>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-white/15 transition-colors mt-2">
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Identity hero card */}
        <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] p-5 sm:p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-ficium to-violet-600 grid place-items-center flex-shrink-0 text-white font-bold text-2xl shadow-lg">
              {profile?.firstName?.[0]?.toUpperCase() ?? profile?.fullName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[22px] font-bold text-white leading-tight truncate">
                {profile?.fullName ?? profile?.firstName ?? "—"}
              </div>
              <div className="text-[14px] text-white/55 mt-0.5">{profile?.email ?? "—"}</div>
              <div className="flex items-center gap-2 mt-2">
                {kycVerified
                  ? <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-pill"><ShieldCheck size={11} /> Verified</span>
                  : <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-pill"><ShieldAlert size={11} /> Pending KYC</span>
                }
                <span className="text-[11px] text-white/40 font-medium">Individual</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-white/60 font-semibold">Profile completion</span>
              <span className="font-display text-[22px] font-extrabold text-white">{percent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-pill overflow-hidden">
              <div className="h-2 rounded-pill transition-all duration-700"
                style={{ width: `${percent}%`, background: percent === 100 ? "#34d399" : percent >= 60 ? "#fbbf24" : "#4f46e5" }} />
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
          {[
            { label: "Account created",  done: true },
            { label: "Identity verified", done: completion?.kycVerified ?? false },
            { label: "Proof of address",  done: completion?.proofOfAddressDone ?? false },
            { label: "Financial profile", done: completion?.financialProfileDone ?? false },
            { label: "Source of wealth",  done: completion?.sourceOfWealthDone ?? false },
          ].map((m) => (
            <div key={m.label} className={["flex items-center gap-2.5 px-3.5 py-3 rounded-[16px] border", m.done ? "bg-emerald-50 border-emerald-200" : "bg-white border-ink/[0.08]"].join(" ")}>
              {m.done ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" /> : <Circle size={14} className="text-ink/20 flex-shrink-0" />}
              <span className={["text-[12px] font-semibold truncate", m.done ? "text-emerald-800" : "text-muted"].join(" ")}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <ScoreCard label="Financial Health" value={profile?.healthScore} suffix="/100" icon={Activity}   gradient="from-ficium to-violet-600"     light={false} />
          <ScoreCard label="Bank Readiness"   value={bankReadiness}        suffix="%"    icon={Zap}        gradient="from-emerald-400 to-teal-500"  light />
          <ScoreCard label="Risk Score"       value={profile?.riskScore}   suffix="/100" icon={TrendingUp} gradient={null}                          light={false} />
        </div>

        {/* Identity section */}
        <ProfileSection title="Identity" icon={<User size={16} />}
          isEditing={editing === "identity"} onEdit={() => setEditing("identity")} onClose={() => setEditing(null)}>
          {editing === "identity" ? (
            <IdentityEditForm profile={profile ?? null} onClose={() => setEditing(null)} />
          ) : (
            <div className="flex flex-col gap-0">
              <InfoRow icon={<User size={14} />}        label="Full name"   value={profile?.fullName ?? profile?.firstName ?? "—"} />
              <InfoRow icon={<Mail size={14} />}        label="Email"       value={profile?.email ?? "—"} />
              <InfoRow icon={<Globe size={14} />}       label="Country"     value={profile?.country ?? "—"} />
              <InfoRow icon={<ShieldCheck size={14} />} label="KYC status"  value={
                <span className={["text-[12px] font-bold px-2.5 py-1 rounded-pill", kycVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"].join(" ")}>
                  {kycVerified ? "✓ Verified" : "Pending"}
                </span>
              } />
            </div>
          )}
        </ProfileSection>

        {/* Address section */}
        <ProfileSection title="Address" icon={<MapPin size={16} />}
          isEditing={editing === "address"} onEdit={() => setEditing("address")} onClose={() => setEditing(null)}>
          {editing === "address" ? (
            <AddressEditForm profile={profile ?? null} onClose={() => setEditing(null)} />
          ) : profile?.addressLine1 ? (
            <div className="flex flex-col gap-0">
              <InfoRow icon={<MapPin size={14} />}      label="Address"         value={profile.addressLine1} />
              <InfoRow icon={<Building2 size={14} />}   label="City"            value={profile.city ?? "—"} />
              <InfoRow icon={<Globe size={14} />}       label="Country"         value={profile.country ?? "—"} />
              <InfoRow icon={<CheckCircle2 size={14} />} label="Proof of address" value={
                completion?.proofOfAddressDone
                  ? <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-pill">✓ Uploaded</span>
                  : <span className="text-[12px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-pill">Not uploaded</span>
              } />
            </div>
          ) : (
            <EmptySection message="No address on file." cta="Add address" onCta={() => setEditing("address")} />
          )}
        </ProfileSection>

        {/* Financial profile section */}
        <ProfileSection title="Financial profile" icon={<Briefcase size={16} />}
          isEditing={editing === "financial"} onEdit={() => setEditing("financial")} onClose={() => setEditing(null)}>
          {editing === "financial" ? (
            <FinancialEditForm profile={profile ?? null} onClose={() => setEditing(null)} hidden={hidden} setHidden={setHidden} />
          ) : profile?.hasDossier ? (
            <div className="flex flex-col gap-0">
              <InfoRow icon={<Briefcase size={14} />}   label="Employment"     value={formatEmployment(profile.employmentStatus)} />
              <InfoRow icon={<DollarSign size={14} />}  label="Monthly income" value={profile.monthlyIncome ? formatMUR(profile.monthlyIncome) : "—"} sensitive hidden={hidden} onToggle={() => setHidden((h) => !h)} />
              <InfoRow icon={<Wallet size={14} />}      label="Net worth"      value={profile.totalNetWorth ? formatMUR(profile.totalNetWorth) : "—"} sensitive hidden={hidden} />
              <InfoRow icon={<AlertCircle size={14} />} label="Existing loans" value={profile.hasExistingLoans ? "Yes" : "No"} />
              <InfoRow icon={<ShieldCheck size={14} />} label="Compliance"     value={
                profile.eddRequired
                  ? <span className="text-[12px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-pill">EDD required</span>
                  : <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-pill">✓ Clear</span>
              } />
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
