import { useState }             from "react";
import { useNavigate, Link }    from "react-router-dom";
import {
  LogOut, ShieldCheck, ShieldAlert, MapPin, Briefcase,
  CheckCircle2, Clock, Wallet,
  User, Mail, Globe, Building2, DollarSign,
  AlertCircle, ChevronRight, Lock, Heart,
} from "lucide-react";
import { useAuth }                       from "@/features/auth/context/AuthContext";
import { useProfile, useBankReadiness }  from "@/individual/dashboard/hooks/useDashboard";
import { PageShell }                     from "@/shared/ui";
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
  const r    = 34;
  const circ = 2 * Math.PI * r;
  const dash = value != null ? (pct / 100) * circ : 0;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative w-[84px] h-[84px]">
        <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="#ECECF2" strokeWidth="6" />
          <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[20px] font-extrabold text-ink leading-none">
            {value != null ? value : "—"}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-ink">{label}</p>
        <p className="text-[11px] text-muted mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

// ── Milestone step ─────────────────────────────────────────────────────────────
function MilestoneStep({ label, done, last }: { label: string; done: boolean; last?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 relative min-w-0">
      {!last && (
        <div className={[
          "absolute left-1/2 top-[14px] h-[2px] w-full translate-x-[14px]",
          done ? "bg-ficium" : "bg-line",
        ].join(" ")} />
      )}
      <div className={[
        "w-7 h-7 rounded-full flex items-center justify-center z-10 border-2 transition-all flex-shrink-0",
        done ? "bg-ficium border-ficium" : "bg-white border-line",
      ].join(" ")}>
        {done
          ? <CheckCircle2 size={13} className="text-white" />
          : <Clock size={11} className="text-muted" />
        }
      </div>
      <span className={[
        "text-[10px] font-semibold text-center leading-tight",
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
    <PageShell>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">My account</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink leading-none">Profile</h1>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 border border-line bg-white text-muted text-[13px] font-bold px-4 py-2 rounded-xl hover:border-red-200 hover:text-red-500 hover:bg-red-50/40 transition-all">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* ── Two-column layout on md+, single column on mobile ── */}
      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-5">

        {/* ── LEFT: identity card + scores + quick links ──────── */}
        <div className="space-y-4">

          {/* Identity card */}
          <div className="rounded-3xl bg-white border border-line shadow-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-[64px] h-[64px] rounded-[20px] flex items-center justify-center flex-shrink-0 text-white font-display font-extrabold text-2xl"
                style={{ background: "linear-gradient(135deg, #3536DC 0%, #356EF4 50%, #8231EC 100%)" }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[20px] font-bold text-ink truncate leading-tight">
                  {profile?.fullName ?? profile?.firstName ?? "—"}
                </p>
                <p className="text-[13px] text-muted mt-0.5 truncate">{profile?.email ?? "—"}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
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
            <div className="mb-5">
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

            {/* Milestones */}
            <div className="flex justify-between items-start">
              {milestones.map((m, i) => (
                <MilestoneStep key={m.label} label={m.label} done={m.done} last={i === milestones.length - 1} />
              ))}
            </div>
          </div>

          {/* Financial health scores */}
          <div className="rounded-3xl bg-white border border-line shadow-card p-6">
            <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-5">Financial health</p>
            <div className="flex justify-around">
              <ScoreRing value={profile?.healthScore} label="Health"    sublabel="out of 100" color="#3536DC" />
              <div className="w-px bg-line self-stretch" />
              <ScoreRing value={bankReadiness}         label="Readiness" sublabel="bank ready %"  color="#0FA47A" />
              <div className="w-px bg-line self-stretch" />
              <ScoreRing value={profile?.riskScore}   label="Risk"      sublabel="out of 100" color="#E8930C" />
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-3xl bg-white border border-line shadow-card overflow-hidden">
            <Link to="/couple"
              className="flex items-center gap-4 px-5 py-4 hover:bg-line/30 transition-colors no-underline group border-b border-line">
              <div className="w-9 h-9 rounded-xl bg-ficium/[0.08] flex items-center justify-center flex-shrink-0">
                <Heart size={16} className="text-ficium" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">Couple</p>
                <p className="text-[12px] text-muted mt-0.5">Linked partner and joint requests</p>
              </div>
              <ChevronRight size={15} className="text-muted/40 group-hover:text-ficium transition-colors" />
            </Link>
            <Link to="/vault"
              className="flex items-center gap-4 px-5 py-4 hover:bg-line/30 transition-colors no-underline group border-b border-line">
              <div className="w-9 h-9 rounded-xl bg-ficium/[0.08] flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={16} className="text-ficium" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">Document Vault</p>
                <p className="text-[12px] text-muted mt-0.5">Payslips, title deeds and more</p>
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

        </div>

        {/* ── RIGHT: detail sections ──────────────────────────── */}
        <div className="space-y-4">

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

        </div>
      </div>
    </PageShell>
  );
}
