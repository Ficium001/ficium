// src/individual/networth/pages/NetWorth.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, TrendingDown, Edit3, Save, Loader2,
  Home, Car, BarChart2, Wallet, Plus, Building2,
  CreditCard, Landmark,
} from "lucide-react";
import { useSnapshot, useUpsertSnapshot, type SnapshotInput } from "@/individual/networth/hooks/useSnapshot";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";
import { PageShell } from "@/shared/ui";

const fmt = (n: number) => `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

type AssetRow  = { key: keyof SnapshotInput; label: string; icon: React.ElementType; color: string };
type LiabRow   = { key: keyof SnapshotInput; label: string; icon: React.ElementType; color: string };

const ASSET_ROWS: AssetRow[] = [
  { key: "cashSavings",      label: "Cash & savings",    icon: Wallet,    color: "#2A1FE6" },
  { key: "fixedDeposits",    label: "Fixed deposits",    icon: Landmark,  color: "#059669" },
  { key: "investmentsValue", label: "Investments",       icon: BarChart2, color: "#7c3aed" },
  { key: "propertyValue",    label: "Property",          icon: Home,      color: "#d97706" },
  { key: "vehicleValue",     label: "Vehicles",          icon: Car,       color: "#0ea5e9" },
  { key: "otherAssets",      label: "Other assets",      icon: Plus,      color: "#6b7280" },
];

const LIAB_ROWS: LiabRow[] = [
  { key: "mortgageBalance",     label: "Mortgage",        icon: Home,       color: "#dc2626" },
  { key: "personalLoanBalance", label: "Personal loans",  icon: Wallet,     color: "#dc2626" },
  { key: "creditCardBalance",   label: "Credit cards",    icon: CreditCard, color: "#dc2626" },
  { key: "vehicleLoanBalance",  label: "Vehicle loans",   icon: Car,        color: "#dc2626" },
  { key: "otherLiabilities",    label: "Other liabilities",icon: Plus,      color: "#dc2626" },
];

const CASHFLOW_ROWS = [
  { key: "monthlyIncome"       as keyof SnapshotInput, label: "Monthly income",        color: "#059669" },
  { key: "monthlyExpenses"     as keyof SnapshotInput, label: "Monthly expenses",       color: "#dc2626" },
  { key: "monthlyLoanPayments" as keyof SnapshotInput, label: "Monthly loan payments",  color: "#d97706" },
  { key: "monthlySavings"      as keyof SnapshotInput, label: "Monthly savings",        color: "#2A1FE6" },
];

export default function NetWorthPage() {
  const navigate  = useNavigate();
  const { data: snap, isLoading } = useSnapshot();
  const { data: profile }         = useProfile();
  const { mutateAsync: upsert, isPending } = useUpsertSnapshot();

  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState<SnapshotInput | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const startEdit = () => {
    if (!snap) return;
    setForm({
      cashSavings:         snap.cashSavings,
      fixedDeposits:       snap.fixedDeposits,
      investmentsValue:    snap.investmentsValue,
      propertyValue:       snap.propertyValue,
      vehicleValue:        snap.vehicleValue,
      otherAssets:         snap.otherAssets,
      mortgageBalance:     snap.mortgageBalance,
      personalLoanBalance: snap.personalLoanBalance,
      creditCardBalance:   snap.creditCardBalance,
      vehicleLoanBalance:  snap.vehicleLoanBalance,
      otherLiabilities:    snap.otherLiabilities,
      monthlyIncome:       snap.monthlyIncome,
      monthlyExpenses:     snap.monthlyExpenses,
      monthlyLoanPayments: snap.monthlyLoanPayments,
      monthlySavings:      snap.monthlySavings,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form) return;
    setError(null);
    const result = await upsert(form);
    if (!result.ok) { setError(result.error ?? "Save failed"); return; }
    setEditing(false);
    setForm(null);
  };

  const setField = (key: keyof SnapshotInput, val: string) => {
    setForm(f => f ? { ...f, [key]: Number(val) || 0 } : f);
  };

  const data = editing && form ? {
    ...snap!,
    totalAssets:      Object.values({ a: form.cashSavings, b: form.fixedDeposits, c: form.investmentsValue, d: form.propertyValue, e: form.vehicleValue, f: form.otherAssets }).reduce((a, b) => a + b, 0),
    totalLiabilities: Object.values({ a: form.mortgageBalance, b: form.personalLoanBalance, c: form.creditCardBalance, d: form.vehicleLoanBalance, e: form.otherLiabilities }).reduce((a, b) => a + b, 0),
    ...form,
  } : snap;

  const netWorth = (data?.totalAssets ?? 0) - (data?.totalLiabilities ?? 0);

  if (isLoading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <Loader2 size={32} className="text-ficium animate-spin" />
    </div>
  );

  return (
    <PageShell max="900px">
      <section className="relative overflow-hidden rounded-hero bg-hero text-white px-5 sm:px-9 py-8 mt-1">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-6">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">Net Worth</div>
              <div className="font-display text-[48px] sm:text-[64px] font-extrabold text-white leading-none">
                {fmt(netWorth)}
              </div>
              <div className="text-[13px] text-white/50 mt-2">MUR · as of today</div>
            </div>
            <button onClick={editing ? handleSave : startEdit}
              disabled={isPending}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : editing ? <Save size={14} /> : <Edit3 size={14} />}
              {isPending ? "Saving…" : editing ? "Save" : "Update"}
            </button>
          </div>

          {/* Summary chips */}
          <div className="flex gap-3 mt-6 flex-wrap">
            <Chip label="Total assets"      value={fmt(data?.totalAssets ?? 0)}      green />
            <Chip label="Total liabilities" value={fmt(data?.totalLiabilities ?? 0)} red />
            {data?.debtToIncomeRatio != null && (
              <Chip label="DTI ratio" value={`${data.debtToIncomeRatio}%`} warn={data.debtToIncomeRatio > 40} />
            )}
          </div>
      </section>

      <div className="py-6 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600">{error}</div>
        )}

        {/* ASSETS */}
        <Section title="Assets" icon={<TrendingUp size={16} className="text-emerald-600" />} total={fmt(data?.totalAssets ?? 0)} totalColor="text-emerald-700">
          {ASSET_ROWS.map(({ key, label, icon: Icon, color }) => (
            <Row key={key} label={label} icon={<Icon size={15} style={{ color }} />}
              value={editing && form ? form[key] as number : (data?.[key as keyof typeof data] as number ?? 0)}
              editing={editing}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </Section>

        {/* LIABILITIES */}
        <Section title="Liabilities" icon={<TrendingDown size={16} className="text-red-500" />} total={fmt(data?.totalLiabilities ?? 0)} totalColor="text-red-600">
          {LIAB_ROWS.map(({ key, label, icon: Icon, color }) => (
            <Row key={key} label={label} icon={<Icon size={15} style={{ color }} />}
              value={editing && form ? form[key] as number : (data?.[key as keyof typeof data] as number ?? 0)}
              editing={editing}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </Section>

        {/* MONTHLY CASHFLOW */}
        <Section title="Monthly Cashflow" icon={<BarChart2 size={16} className="text-ficium" />}
          total={fmt((data?.monthlySavings ?? 0))} totalColor="text-ficium" totalLabel="saved/month">
          {CASHFLOW_ROWS.map(({ key, label, color }) => (
            <Row key={key} label={label} icon={<div className="w-2 h-2 rounded-full" style={{ background: color }} />}
              value={editing && form ? form[key] as number : (data?.[key as keyof typeof data] as number ?? 0)}
              editing={editing}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </Section>

        {/* Health score from profile */}
        {profile?.healthScore != null && (
          <div className="bg-white rounded-[22px] border border-ink/6 p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-ficium grid place-items-center shrink-0">
              <span className="font-display text-[20px] font-extrabold text-ficium">{profile.healthScore}</span>
            </div>
            <div>
              <div className="font-bold text-[15px] text-ink">Ficium Health Score</div>
              <div className="text-[13px] text-muted mt-0.5">
                {profile.healthScore >= 70 ? "Good — you qualify for competitive offers." :
                 profile.healthScore >= 50 ? "Fair — improving your profile will unlock better rates." :
                 "Needs work — focus on reducing liabilities and building savings."}
              </div>
              <button onClick={() => navigate("/health")} className="text-[12px] font-semibold text-ficium mt-1.5 hover:underline">
                View full health report →
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => navigate("/requests/new")}
          className="w-full flex items-center justify-center gap-2 bg-ficium text-white py-4 rounded-2xl text-[15px] font-bold shadow-ficium hover:opacity-90">
          <Building2 size={16} /> Start a goal journey
        </button>
      </div>
    </PageShell>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Section({ title, icon, total, totalColor, totalLabel = "total", children }: {
  title: string; icon: React.ReactNode; total: string;
  totalColor: string; totalLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-[15px] text-ink">{title}</span>
        </div>
        <div className={["font-display text-[18px] font-bold", totalColor].join(" ")}>
          {total} <span className="text-[11px] font-normal text-muted">{totalLabel}</span>
        </div>
      </div>
      <div className="divide-y divide-ink/4">{children}</div>
    </div>
  );
}

function Row({ label, icon, value, editing, onChange }: {
  label: string; icon: React.ReactNode; value: number;
  editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-6 grid place-items-center shrink-0">{icon}</div>
      <div className="flex-1 text-[13px] font-medium text-ink">{label}</div>
      {editing ? (
        <div className="flex items-center gap-1 border border-ink/12 rounded-lg px-2.5 py-1.5 bg-paper">
          <span className="text-[12px] text-muted">Rs</span>
          <input
            type="number"
            defaultValue={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-28 text-right text-[13px] font-semibold text-ink bg-transparent outline-hidden"
          />
        </div>
      ) : (
        <div className="text-[13px] font-semibold text-ink">
          {value > 0 ? fmt(value) : <span className="text-muted">—</span>}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, green, red, warn }: {
  label: string; value: string; green?: boolean; red?: boolean; warn?: boolean;
}) {
  const bg = green ? "bg-emerald-500/20 text-emerald-300" : red ? "bg-red-500/20 text-red-300" : warn ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/70";
  return (
    <div className={["px-3 py-1.5 rounded-pill text-[12px] font-semibold", bg].join(" ")}>
      {label}: <span className="font-bold">{value}</span>
    </div>
  );
}
