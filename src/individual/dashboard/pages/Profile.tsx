import { useState }             from "react";
import { useNavigate, Link }    from "react-router-dom";
import {
  LogOut, ShieldCheck, ShieldAlert, MapPin, Briefcase,
  CheckCircle2, Clock, Wallet,
  User, Mail, Globe, Building2, DollarSign,
  AlertCircle, ChevronRight, Lock,
} from "lucide-react";
import { useAuth }                       from "@/features/auth/context/AuthContext";
import { useProfile, useBankReadiness }  from "@/individual/dashboard/hooks/useDashboard";
import { BottomNav }                     from "@/shared/ui";
import {
  ProfileSection, InfoRow, EmptySection,
  LoadingScreen, IdentityEditForm, AddressEditForm, FinancialEditForm,
  formatMUR, formatEmployment,
} from "@/individual/dashboard/components/profile/ProfileComponents";

type EditSection = "identity" | "address" | "financial" | null;

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({
  value, label, sublabel, color,
}: { value: number | null | undefined; label: string; sublabel: string; color: string }) {
  const pct   = value ?? 0;
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const dash  = value != null ? (pct / 100) * circ : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[72px] h-[72px]">
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#ECECF2" strokeWidth="5" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.7s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[17px] font-extrabold text-ink leading-none">
            {value != null ? value : "—"}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[12px] font-bold text-ink leading-tight">{label}</p>
        <p className="text-[11px] text-muted mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

// ── Milestone step ────────────────────────────────────────────────────────────
function MilestoneStep({ label, done, last }: { label: string; done: boolean; last?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 relative">
      {!last && (
        <div className={[
          "absolute left-1/2 top-[14px] h-[2px] w-full translate-x-[14px]",
          done ? "bg-ficium" : "bg-line",
        ].join(" ")} />
      )}
      <div className={[
        "w-7 h-7 rounded-full flex items-center justify-center z-10 border-2 transition-all",
        done
          ? "bg-ficium border-ficium shadow-ficium/30 shadow-sm"
          : "bg-white border-line",
      ].join(" ")}>
        {done
          ? <CheckCircle2 size={13} className="text-white" />
          : <Clock size={11} className="text-muted" />
        }
      </div>
      <span className={[
        "text-[10px] font-semibold text-center leading-tight max-w-[64px]",
        done ? "text-ficium" : "text-muted",
      ].join(" ")}>{label}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
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

  const initials = (
    profile?.firstName?.[0]?.toUpperCase() ??
    profile?.fullName?.[0]?.toUpperCase() ?? "?"
  );

  const milestones = [
    { label: "Account",   done: true },
    { label: "Identity",  done: completion?.kycVerified          ?? false },
    { label: "Address",   done: completion?.proofOfAddressDone   ?? false },
    { label: "Finances",  done: completion?.financialProfileDone ?? false },
    { label: "Wealth",    done: completion?.sourceOfWealthDone   ?? false },
  ];

  return (
    <div className="min-h-screen bg-paper pb-28">

      {/* ── Hero background ────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[300px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(120% 160% at 8% 0%, #181842 0%, #0B0B1E 55%)" }} />
        {/* Drifting blade */}
        <svg viewBox="0 0 310 153" aria-hidden
          className="absolute w-[280px] -top-8 -right-8 opacity-30 blur-[1px] motion-safe:animate-drift will-change-transform">
          <defs>
            <linearGradient id="pfBB" x1="85" y1="79" x2="266" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3536DC" /><stop offset="1" stopColor="#4C90F6" />
            </linearGradient>
            <linearGradient id="pfBP" x1="85" y1="141" x2="238" y2="91" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3A148F" /><stop offset="1" stopColor="#8231EC" />
            </linearGradient>
          </defs>
          <path d="M 121.78,31.83 Q 131,20 146,20 L 251,20 Q 266,20 257.28,32.21 L 244.72,49.79 Q 236,62 221.09,63.68 L 99.91,77.32 Q 85,79 94.22,67.17 Z" fill="url(#pfBB)" />
          <path d="M 108.10,103.75 Q 116,91 131,91 L 223,91 Q 238,91 230.12,103.77 L 216.88,125.23 Q 209,138 194,138.36 L 100,140.64 Q 85,141 92.90,128.25 Z" fill="url(#pfBP)" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-paper to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[680px] px-4 sm:px-6">

        {/* ── Top bar ────────────────────────────────────────── */}
        <div className="pt-10 pb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">My account</p>
            <h1 className="font-display text-4xl font-extrabold text-white">Profile</h1>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-[12px] font-bold px-3.5 py-2 rounded-xl hover:bg-white/15 transition-colors">
            <LogOut size={13} /> Sign out
          </button>
        </div>

        {/* ── Identity hero card ─────────────────────────────── */}
        <div className="rounded-3xl bg-white border border-line shadow-card p-6 mb-4">
          {/* Avatar + name row */}
          <div className="flex items-center gap-5 mb-6">
            <div className="w-[68px] h-[68px] rounded-[22px] flex items-center justify-center flex-shrink-0 text-white font-display font-extrabold text-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #3536DC 0%, #356EF4 50%, #8231EC 100%)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[22px] font-bold text-ink truncate leading-tight">
                {profile?.fullName ?? profile?.firstName ?? "—"}
              </p>
              <p className="text-[13px] text-muted mt-0.5 truncate">{profile?.email ?? "—"}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {kycVerified
                  ? <span className="inline-flex items-center gap-1.5 bg-good/10 text-good text-[11px] font-bold px-2.5 py-1 rounded-pill border border-good/20">
                      <ShieldCheck size={11} /> Verified
                    </span>
                  : <span className="inline-flex items-center gap-1.5 bg-warn/10 text-warn text-[11px] font-bold px-2.5 py-1 rounded-pill border border-warn/20">
                      <ShieldAlert size={11} /> Pending KYC
                    </span>
                }
                <span className="text-[11px] text-muted font-medium bg-line/60 px-2 py-0.5 rounded-pill">Individual</span>
              </div>
            </div>
          </div>

          {/* Completion bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-ink">Profile completion</span>
              <span className="font-display text-[20px] font-extrabold text-ink">{percent}%</span>
            </div>
            <div className="h-2.5 bg-line rounded-pill overflow-hidden">
              <div className="h-full rounded-pill transition-all duration-700"
                style={{
                  width: `${percent}%`,
                  background: percent === 100
                    ? "#0FA47A"
                    : "linear-gradient(90deg, #3536DC 0%, #356EF4 60%, #8231EC 100%)",
                }} />
            </div>
          </div>

          {/* Milestone steps */}
          <div className="flex justify-between items-start px-2">
            {milestones.map((m, i) => (
              <MilestoneStep key={m.label} label={m.label} done={m.done} last={i === milestones.length - 1} />
            ))}
          </div>
        </div>

        {/* ── Score cards ────────────────────────────────────── */}
        <div className="rounded-3xl bg-white border border-line shadow-card p-6 mb-4">
          <p className="text-[12px] font-bold text-muted uppercase tracking-widest mb-5">Financial health</p>
          <div className="flex justify-around gap-4">
            <ScoreRing value={profile?.healthScore} label="Health score" sublabel="out of 100" color="#3536DC" />
            <div className="w-px bg-line self-stretch" />
            <ScoreRing value={bankReadiness} label="Bank readiness" sublabel="readiness %" color="#0FA47A" />
            <div className="w-px bg-line self-stretch" />
            <ScoreRing value={profile?.riskScore} label="Risk score" sublabel="out of 100" color="#E8930C" />
          </div>
        </div>

        {/* ── Profile sections ───────────────────────────────── */}
        <ProfileSection title="Identity" icon={<User size={15} />}
          isEditing={editing === "identity"} onEdit={() => setEditing("identity")} onClose={() => setEditing(null)}>
          {editing === "identity" ? (
            <IdentityEditForm profile={profile ?? null} onClose={() => setEditing(null)} />
          ) : (
            <>
              <InfoRow icon={<User size={14} />}        label="Full name"  value={profile?.fullName ?? profile?.firstName ?? "—"} />
              <InfoRow icon={<Mail size={14} />}        label="Email"      value={profile?.email ?? "—"} />
              <InfoRow icon={<Globe size={14} />}       label="Country"    value={profile?.country ?? "—"} />
              <InfoRow icon={<ShieldCheck size={14} />} label="KYC status" value={
                <span className={["text-[12px] font-bold px-2 py-0.5 rounded-pill", kycVerified ? "bg-good/10 text-good" : "bg-warn/10 text-warn"].join(" ")}>
                  {kycVerified ? "✓ Verified" : "Pending"}
                </span>
              } />
            </>
          )}
        </ProfileSection>

        <ProfileSection title="Address" icon={<MapPin size={15} />}
          isEditing={editing === "address"} onEdit={() => setEditing("address")} onClose={() => setEditing(null)}>
          {editing === "address" ? (
            <AddressEditForm profile={profile ?? null} onClose={() => setEditing(null)} />
          ) : profile?.addressLine1 ? (
            <>
              <InfoRow icon={<MapPin size={14} />}       label="Address"          value={profile.addressLine1} />
              <InfoRow icon={<Building2 size={14} />}    label="City"             value={profile.city ?? "—"} />
              <InfoRow icon={<Globe size={14} />}        label="Country"          value={profile.country ?? "—"} />
              <InfoRow icon={<CheckCircle2 size={14} />} label="Proof of address" value={
                completion?.proofOfAddressDone
                  ? <span className="text-[12px] font-bold text-good bg-good/10 px-2 py-0.5 rounded-pill">✓ Uploaded</span>
                  : <span className="text-[12px] font-bold text-warn bg-warn/10 px-2 py-0.5 rounded-pill">Not uploaded</span>
              } />
            </>
          ) : (
            <EmptySection message="No address on file." cta="Add address" onCta={() => setEditing("address")} />
          )}
        </ProfileSection>

        <ProfileSection title="Financial profile" icon={<Briefcase size={15} />}
          isEditing={editing === "financial"} onEdit={() => setEditing("financial")} onClose={() => setEditing(null)}>
          {editing === "financial" ? (
            <FinancialEditForm profile={profile ?? null} onClose={() => setEditing(null)} hidden={hidden} setHidden={setHidden} />
          ) : profile?.hasDossier ? (
            <>
              <InfoRow icon={<Briefcase size={14} />}   label="Employment"     value={formatEmployment(profile.employmentStatus)} />
              <InfoRow icon={<DollarSign size={14} />}  label="Monthly income" value={profile.monthlyIncome ? formatMUR(profile.monthlyIncome) : "—"} sensitive hidden={hidden} onToggle={() => setHidden((h) => !h)} />
              <InfoRow icon={<Wallet size={14} />}      label="Net worth"      value={profile.totalNetWorth ? formatMUR(profile.totalNetWorth) : "—"} sensitive hidden={hidden} />
              <InfoRow icon={<AlertCircle size={14} />} label="Existing loans" value={profile.hasExistingLoans ? "Yes" : "No"} />
              <InfoRow icon={<ShieldCheck size={14} />} label="Compliance"     value={
                profile.eddRequired
                  ? <span className="text-[12px] font-bold text-warn bg-warn/10 px-2 py-0.5 rounded-pill">EDD required</span>
                  : <span className="text-[12px] font-bold text-good bg-good/10 px-2 py-0.5 rounded-pill">✓ Clear</span>
              } />
            </>
          ) : (
            <EmptySection message="No financial profile yet." cta="Complete profile" onCta={() => setEditing("financial")} />
          )}
        </ProfileSection>

        {/* ── Quick links ────────────────────────────────────── */}
        <div className="rounded-3xl bg-white border border-line shadow-card overflow-hidden mb-4">
          <Link to="/vault"
            className="flex items-center gap-4 px-5 py-4 hover:bg-line/30 transition-colors no-underline group border-b border-line">
            <div className="w-9 h-9 rounded-xl bg-ficium/[0.08] flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={16} className="text-ficium" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">Document Vault</p>
              <p className="text-[12px] text-muted mt-0.5">Payslips, title deeds, and more</p>
            </div>
            <ChevronRight size={15} className="text-muted/40 group-hover:text-ficium transition-colors" />
          </Link>
          <Link to="/security"
            className="flex items-center gap-4 px-5 py-4 hover:bg-line/30 transition-colors no-underline group">
            <div className="w-9 h-9 rounded-xl bg-ink/[0.05] flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-muted" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">Security & password</p>
              <p className="text-[12px] text-muted mt-0.5">Change password, manage sessions</p>
            </div>
            <ChevronRight size={15} className="text-muted/40 group-hover:text-ink transition-colors" />
          </Link>
        </div>

        {/* ── Sign out (mobile-friendly tap target) ─────────── */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-line bg-white text-[13px] font-bold text-muted hover:border-red-200 hover:text-red-500 hover:bg-red-50/40 transition-all mb-2">
          <LogOut size={14} /> Sign out
        </button>

      </div>
      <BottomNav />
    </div>
  );
}
