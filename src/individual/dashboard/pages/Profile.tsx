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
  const pct  = value ?? 0;
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const dash = value != null ? (pct / 100) * circ : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[90px] h-[90px] lg:w-[108px] lg:h-[108px]">
        <svg width="100%" height="100%" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#ECECF2" strokeWidth="6" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[20px] lg:text-[24px] font-extrabold text-ink leading-none">
            {value != null ? value : "—"}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[13px] lg:text-[14px] font-bold text-ink leading-tight">{label}</p>
        <p className="text-[11px] lg:text-[12px] text-muted mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

// ── Milestone step ─────────────────────────────────────────────────────────────
function MilestoneStep({ label, done, last }: { label: string; done: boolean; last?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 relative">
      {!last && (
        <div className={[
          "absolute left-1/2 top-[16px] h-[2px] w-full translate-x-[16px]",
          done ? "bg-ficium" : "bg-line",
        ].join(" ")} />
      )}
      <div className={[
        "w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all flex-shrink-0",
        done ? "bg-ficium border-ficium" : "bg-white border-line",
      ].join(" ")}>
        {done
          ? <CheckCircle2 size={14} className="text-white" />
          : <Clock size={12} className="text-muted" />
        }
      </div>
      <span className={[
        "text-[11px] font-semibold text-center leading-tight",
        done ? "text-ficium" : "text-muted",
      ].join(" ")}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
    { label: "Account",  done: true },
    { label: "Identity", done: completion?.kycVerified          ?? false },
    { label: "Address",  done: completion?.proofOfAddressDone   ?? false },
    { label: "Finances", done: completion?.financialProfileDone ?? false },
    { label: "Wealth",   done: completion?.sourceOfWealthDone   ?? false },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24 lg:pb-0">

      {/* ── Hero banner — full width ───────────────────────── */}
      <div className="relative w-full h-[220px] lg:h-[260px] overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(140% 180% at 6% 0%, #181842 0%, #0B0B1E 60%)" }} />
        {/* Decorative blades */}
        <svg viewBox="0 0 500 200" aria-hidden preserveAspectRatio="xMaxYMin meet"
          className="absolute right-0 top-0 h-full w-auto opacity-25 blur-[1px] motion-safe:animate-drift will-change-transform">
          <defs>
            <linearGradient id="pfBB2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0" stopColor="#3536DC" /><stop offset="1" stopColor="#4C90F6" />
            </linearGradient>
            <linearGradient id="pfBP2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0" stopColor="#3A148F" /><stop offset="1" stopColor="#8231EC" />
            </linearGradient>
          </defs>
          <path d="M 200,20 Q 215,10 230,10 L 420,10 Q 435,10 425,25 L 405,55 Q 395,70 378,72 L 155,88 Q 138,90 150,72 Z" fill="url(#pfBB2)" />
          <path d="M 178,115 Q 192,100 208,100 L 380,100 Q 395,100 386,116 L 368,148 Q 358,164 342,165 L 165,168 Q 148,169 158,152 Z" fill="url(#pfBP2)" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-paper to-transparent" />

        {/* Top bar inside banner */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 pt-10 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">My account</p>
            <h1 className="font-display text-4xl lg:text-6xl font-extrabold text-white leading-none">Profile</h1>
          </div>
          {/* Desktop sign-out in header */}
          <button onClick={handleSignOut}
            className="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-[13px] font-bold px-4 py-2.5 rounded-xl hover:bg-white/15 transition-colors mt-1">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 -mt-6 lg:-mt-10">

        {/* ─── Desktop: two-column grid ───────────────────────── */}
        <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-8 lg:items-start">

          {/* ── LEFT column: identity + scores + quick links ──── */}
          <div className="space-y-4">

            {/* Identity hero card */}
            <div className="rounded-3xl bg-white border border-line shadow-card p-6 lg:p-8">
              {/* Avatar + name */}
              <div className="flex items-center gap-5 mb-7">
                <div className="w-[72px] h-[72px] lg:w-[88px] lg:h-[88px] rounded-[24px] flex items-center justify-center flex-shrink-0 text-white font-display font-extrabold text-2xl lg:text-3xl shadow-lg"
                  style={{ background: "linear-gradient(135deg, #3536DC 0%, #356EF4 50%, #8231EC 100%)" }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[22px] lg:text-[26px] font-bold text-ink leading-tight truncate">
                    {profile?.fullName ?? profile?.firstName ?? "—"}
                  </p>
                  <p className="text-[13px] lg:text-[14px] text-muted mt-1 truncate">{profile?.email ?? "—"}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
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
              <div className="mb-7">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[13px] lg:text-[14px] font-semibold text-ink">Profile completion</span>
                  <span className="font-display text-[22px] lg:text-[26px] font-extrabold text-ink">{percent}%</span>
                </div>
                <div className="h-3 bg-line rounded-pill overflow-hidden">
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
              <div className="flex justify-between items-start">
                {milestones.map((m, i) => (
                  <MilestoneStep key={m.label} label={m.label} done={m.done} last={i === milestones.length - 1} />
                ))}
              </div>
            </div>

            {/* Financial health scores */}
            <div className="rounded-3xl bg-white border border-line shadow-card p-6 lg:p-8">
              <p className="text-[11px] lg:text-[12px] font-bold text-muted uppercase tracking-widest mb-6">Financial health</p>
              <div className="flex justify-around gap-2">
                <ScoreRing value={profile?.healthScore} label="Health score"   sublabel="out of 100" color="#3536DC" />
                <div className="w-px bg-line self-stretch" />
                <ScoreRing value={bankReadiness}         label="Bank readiness" sublabel="readiness %" color="#0FA47A" />
                <div className="w-px bg-line self-stretch" />
                <ScoreRing value={profile?.riskScore}   label="Risk score"     sublabel="out of 100" color="#E8930C" />
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-3xl bg-white border border-line shadow-card overflow-hidden">
              <Link to="/vault"
                className="flex items-center gap-4 px-6 py-5 hover:bg-line/30 transition-colors no-underline group border-b border-line">
                <div className="w-10 h-10 rounded-xl bg-ficium/[0.08] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={18} className="text-ficium" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] lg:text-[15px] font-semibold text-ink">Document Vault</p>
                  <p className="text-[12px] text-muted mt-0.5">Payslips, title deeds and more</p>
                </div>
                <ChevronRight size={16} className="text-muted/40 group-hover:text-ficium transition-colors" />
              </Link>
              <Link to="/security"
                className="flex items-center gap-4 px-6 py-5 hover:bg-line/30 transition-colors no-underline group">
                <div className="w-10 h-10 rounded-xl bg-ink/[0.05] flex items-center justify-center flex-shrink-0">
                  <Lock size={18} className="text-muted" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] lg:text-[15px] font-semibold text-ink">Security & password</p>
                  <p className="text-[12px] text-muted mt-0.5">Change password, manage sessions</p>
                </div>
                <ChevronRight size={16} className="text-muted/40 group-hover:text-ink transition-colors" />
              </Link>
            </div>

            {/* Sign out — desktop only in left column */}
            <button onClick={handleSignOut}
              className="hidden lg:flex w-full items-center justify-center gap-2 py-4 rounded-2xl border border-line bg-white text-[13px] font-bold text-muted hover:border-red-200 hover:text-red-500 hover:bg-red-50/40 transition-all">
              <LogOut size={14} /> Sign out
            </button>
          </div>

          {/* ── RIGHT column: profile detail sections ──────────── */}
          <div className="mt-4 lg:mt-0 space-y-4">
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
                    <span className={["text-[12px] font-bold px-2.5 py-1 rounded-pill", kycVerified ? "bg-good/10 text-good" : "bg-warn/10 text-warn"].join(" ")}>
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
                      ? <span className="text-[12px] font-bold text-good bg-good/10 px-2.5 py-1 rounded-pill">✓ Uploaded</span>
                      : <span className="text-[12px] font-bold text-warn bg-warn/10 px-2.5 py-1 rounded-pill">Not uploaded</span>
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
                      ? <span className="text-[12px] font-bold text-warn bg-warn/10 px-2.5 py-1 rounded-pill">EDD required</span>
                      : <span className="text-[12px] font-bold text-good bg-good/10 px-2.5 py-1 rounded-pill">✓ Clear</span>
                  } />
                </>
              ) : (
                <EmptySection message="No financial profile yet." cta="Complete profile" onCta={() => setEditing("financial")} />
              )}
            </ProfileSection>

            {/* Mobile-only sign out */}
            <button onClick={handleSignOut}
              className="lg:hidden w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-line bg-white text-[13px] font-bold text-muted hover:border-red-200 hover:text-red-500 hover:bg-red-50/40 transition-all">
              <LogOut size={14} /> Sign out
            </button>
          </div>

        </div>
        {/* bottom spacing */}
        <div className="h-8" />
      </div>

      {/* Bottom nav mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
