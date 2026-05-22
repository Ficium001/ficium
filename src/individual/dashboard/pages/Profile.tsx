import { Link, useNavigate } from "react-router-dom";
import {
  LogOut, ShieldCheck, MapPin, Briefcase, TrendingUp,
  AlertCircle, CheckCircle2, Circle, ChevronRight,
  Wallet, Activity, Zap,
} from "lucide-react";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { useProfile, useBankReadiness } from "../hooks/useDashboard";
import { Card, BottomNav } from "../../../shared/ui";

export default function Profile() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const { score: bankReadiness } = useBankReadiness();

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (isLoading) return <LoadingScreen />;

  const kycVerified = profile?.kycStatus === "verified";
  const completion = profile?.completion;

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8 flex flex-col gap-5">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Profile</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {/* ── COMPLETION RING ── */}
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex flex-col items-center gap-5">
            {/* Ring */}
            <div className="relative">
              <RingChart percent={completion?.percent ?? 0} size={160} stroke={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-4xl font-bold leading-none">
                  {completion?.percent ?? 0}%
                </div>
                <div className="text-xs text-muted mt-1">complete</div>
              </div>
            </div>

            {/* Milestones */}
            <div className="w-full">
              <div className="text-sm font-semibold text-center mb-4">Profile completion</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: "Account created", done: true, href: null },
                  { label: "Identity verified", done: completion?.kycVerified ?? false, href: "/onboarding/kyc" },
                  { label: "Proof of address", done: completion?.proofOfAddressDone ?? false, href: "/onboarding/kyc" },
                  { label: "Financial profile", done: completion?.financialProfileDone ?? false, href: "/onboarding/dossier" },
                  { label: "Source of wealth", done: completion?.sourceOfWealthDone ?? false, href: "/onboarding/dossier" },
                ].map((m) => (
                  <div key={m.label} className={[
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
                    m.done ? "bg-ficium/[0.05]" : "bg-ink/[0.03]",
                  ].join(" ")}>
                    {m.done
                      ? <CheckCircle2 size={16} className="text-ficium flex-shrink-0" />
                      : <Circle size={16} className="text-ink/20 flex-shrink-0" />}
                    <span className={["text-[13px] flex-1", m.done ? "text-ink font-medium" : "text-muted"].join(" ")}>
                      {m.label}
                    </span>
                    {!m.done && m.href && (
                      <Link to={m.href} className="text-[11px] font-semibold text-ficium no-underline flex-shrink-0">
                        Fix →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── SCORE SUMMARY ── */}
        <div className="grid grid-cols-3 gap-3">
          <MiniScore label="Health" value={profile?.healthScore} suffix="/100" icon={<Activity size={14} />} color="ficium" />
          <MiniScore label="Readiness" value={bankReadiness} suffix="%" icon={<Zap size={14} />} color="mint" />
          <MiniScore label="Risk" value={profile?.riskScore} suffix="/100" icon={<TrendingUp size={14} />} color="neutral" />
        </div>

        {/* ── IDENTITY SECTION ── */}
        <SectionCard
          title="Identity"
          icon={<ShieldCheck size={16} />}
          action={{ label: "Update KYC", href: "/onboarding/kyc" }}
        >
          <ProfileRow label="Full name" value={profile?.fullName ?? "—"} />
          <ProfileRow label="Email" value={profile?.email ?? "—"} />
          <ProfileRow
            label="KYC status"
            value={
              <span className={[
                "text-[13px] font-semibold px-2 py-0.5 rounded-pill",
                kycVerified ? "bg-ficium/10 text-ficium" : "bg-amber-100 text-amber-700",
              ].join(" ")}>
                {kycVerified ? "✓ Verified" : "Pending"}
              </span>
            }
          />
          <ProfileRow label="Document type" value={profile?.kycStatus === "verified" ? "Verified" : "Not submitted"} />
        </SectionCard>

        {/* ── ADDRESS SECTION ── */}
        <SectionCard
          title="Address"
          icon={<MapPin size={16} />}
          action={{ label: "Update", href: "/onboarding/kyc" }}
        >
          {profile?.addressLine1 ? (
            <>
              <ProfileRow label="Address" value={profile.addressLine1} />
              {profile.city && <ProfileRow label="City" value={profile.city} />}
              {profile.country && <ProfileRow label="Country" value={profile.country} />}
              <ProfileRow
                label="Proof of address"
                value={
                  completion?.proofOfAddressDone
                    ? <span className="text-[13px] text-ficium font-medium">✓ Uploaded</span>
                    : <span className="text-[13px] text-amber-600">Not uploaded</span>
                }
              />
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted py-1">
              <AlertCircle size={14} />
              No address on file.{" "}
              <Link to="/onboarding/kyc" className="text-ficium font-semibold no-underline">Add now →</Link>
            </div>
          )}
        </SectionCard>

        {/* ── FINANCIAL PROFILE SECTION ── */}
        <SectionCard
          title="Financial profile"
          icon={<Briefcase size={16} />}
          action={{ label: "Update", href: "/onboarding/dossier" }}
        >
          {profile?.hasDossier ? (
            <>
              <ProfileRow label="Employment" value={formatEmployment(profile.employmentStatus)} />
              <ProfileRow label="Monthly income" value={profile.monthlyIncome ? formatMUR(profile.monthlyIncome) : "—"} />
              <ProfileRow label="Total net worth" value={profile.totalNetWorth ? formatMUR(profile.totalNetWorth) : "—"} />
              <ProfileRow label="Existing loans" value={profile.hasExistingLoans ? "Yes" : "No"} />
              <ProfileRow
                label="Compliance"
                value={
                  profile.eddRequired
                    ? <span className="text-[13px] text-amber-600 font-medium">EDD required</span>
                    : <span className="text-[13px] text-ficium font-medium">✓ Clear</span>
                }
              />
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted py-1">
              <AlertCircle size={14} />
              No financial profile.{" "}
              <Link to="/onboarding/dossier" className="text-ficium font-semibold no-underline">Complete now →</Link>
            </div>
          )}
        </SectionCard>

        {/* ── ASSETS & LIABILITIES SECTION ── */}
        <SectionCard title="Assets & liabilities" icon={<Wallet size={16} />} action={null}>
          {profile?.hasDossier ? (
            <>
              <ProfileRow label="Net worth" value={profile.totalNetWorth ? formatMUR(profile.totalNetWorth) : "—"} />
              <ProfileRow label="Existing debt" value={profile.hasExistingLoans ? "Yes — see dossier" : "None declared"} />
              <ProfileRow label="PEP status" value={profile.isPep ? "Yes — declared" : "Not a PEP"} />
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted py-1">
              <AlertCircle size={14} />
              Complete your financial profile to see this section.
            </div>
          )}
        </SectionCard>

      </div>
      <BottomNav />
    </div>
  );
}

/* ============================================================
   RING CHART — proper SVG ring, 0-100
   ============================================================ */

function RingChart({ percent, size, stroke }: { percent: number; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(percent / 100, 1) * circ;
  const cx = size / 2;
  const cy = size / 2;

  // Color: green if 100%, amber if 60-99%, ficium otherwise
  const color = percent === 100 ? "#2e7d32" : percent >= 60 ? "#f59e0b" : "#4f46e5";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      {/* Progress */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        strokeDashoffset={circ / 4}
        style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 0.8s ease" }}
      />
      {/* Glow dot at tip when < 100% */}
      {percent < 100 && percent > 0 && (() => {
        const angle = ((percent / 100) * 360 - 90) * (Math.PI / 180);
        const dotX = cx + r * Math.cos(angle);
        const dotY = cy + r * Math.sin(angle);
        return <circle cx={dotX} cy={dotY} r={stroke / 2} fill={color} />;
      })()}
    </svg>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function SectionCard({
  title, icon, action, children,
}: {
  title: string;
  icon: React.ReactNode;
  action: { label: string; href: string } | null;
  children: React.ReactNode;
}) {
  return (
    <Card padded={false} className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ficium/10 text-ficium grid place-items-center">
            {icon}
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {action && (
          <Link to={action.href} className="flex items-center gap-0.5 text-xs font-semibold text-ficium no-underline">
            {action.label} <ChevronRight size={12} />
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs text-muted flex-shrink-0 pt-0.5">{label}</div>
      <div className="text-[13px] font-medium text-right">{value}</div>
    </div>
  );
}

function MiniScore({ label, value, suffix, icon, color }: {
  label: string;
  value: number | null | undefined;
  suffix: string;
  icon: React.ReactNode;
  color: "ficium" | "mint" | "neutral";
}) {
  const bg = color === "ficium" ? "bg-ficium text-white" : color === "mint" ? "bg-mint/20 text-ink" : "bg-white text-ink";
  const sub = color === "ficium" ? "text-white/70" : "text-muted";
  return (
    <Card padded={false} className={["p-3.5 flex flex-col gap-1", bg].join(" ")}>
      <div className={sub}>{icon}</div>
      <div className="font-display text-xl font-bold leading-none">
        {value == null ? "—" : value}
        {value != null && <span className="text-xs font-normal opacity-60">{suffix}</span>}
      </div>
      <div className={["text-[10px]", sub].join(" ")}>{label}</div>
    </Card>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
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
    employed: "Employed",
    self_employed: "Self-employed",
    business_owner: "Business owner",
    freelance: "Freelancer",
    retired: "Retired",
    student: "Student",
    unemployed: "Unemployed",
  };
  return map[status] ?? status;
}