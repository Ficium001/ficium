// src/individual/money/panels/AssetsPanel.tsx
// Everything the borrower owns and owes, plus monthly cashflow.
//
// Each figure has one home, and only rows whose home is this snapshot are
// editable here. The database derives the rest (trg_snapshot_derive), so the
// read-only rows link to where the figure is actually kept:
//   cash, deposits    Accounts tab, once any account is added
//   investments       Accounts tab, once any holding is added
//   debts, payments   the loan list in the financial profile
//   income            the financial profile
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Edit3, Save, Loader2, X,
  Home, Car, BarChart2, Wallet, Plus, CreditCard, Landmark, Building2,
} from "lucide-react";
import { useSnapshot, useUpsertSnapshot, type FinancialSnapshot, type SnapshotInput } from "@/individual/money/networth/hooks/useSnapshot";
import { SNAPSHOT_OWNED_KEYS } from "@/individual/money/networth/api/snapshot";
import { useAccounts } from "@/individual/money/finance/hooks/useAccounts";
import { useHoldings } from "@/individual/money/finance/hooks/useHoldings";
import type { MoneyTab } from "@/individual/money/lib/tabs";
import { Panel } from "./ui";

const fmt = (n: number) => `MUR ${Math.round(n).toLocaleString("en-MU")}`;

/** Where a read-only figure is kept. */
type Source = "accounts" | "holdings" | "profile";

type RowDef = {
  key: keyof FinancialSnapshot; label: string; icon: React.ElementType; color: string;
  /** Fixed source: the figure is never edited here. */
  source?: "profile";
  /** Editable here until the client itemises it in this source. */
  itemisedIn?: "accounts" | "holdings";
};

export const ASSET_ROWS: RowDef[] = [
  { key: "cashSavings",      label: "Cash & savings",  icon: Wallet,    color: "#2A1FE6", itemisedIn: "accounts" },
  { key: "fixedDeposits",    label: "Fixed deposits",  icon: Landmark,  color: "#059669", itemisedIn: "accounts" },
  { key: "investmentsValue", label: "Investments",     icon: BarChart2, color: "#7c3aed", itemisedIn: "holdings" },
  { key: "propertyValue",    label: "Property",        icon: Home,      color: "#d97706" },
  { key: "vehicleValue",     label: "Vehicles",        icon: Car,       color: "#0ea5e9" },
  { key: "businessAssets",   label: "Business assets", icon: Building2, color: "#475569" },
  { key: "otherAssets",      label: "Other assets",    icon: Plus,      color: "#6b7280" },
];

const DEBT_ROWS: RowDef[] = [
  { key: "mortgageBalance",     label: "Mortgage",        icon: Home,       color: "#dc2626", source: "profile" },
  { key: "personalLoanBalance", label: "Personal loans",  icon: Wallet,     color: "#dc2626", source: "profile" },
  { key: "creditCardBalance",   label: "Credit cards",    icon: CreditCard, color: "#dc2626", source: "profile" },
  { key: "vehicleLoanBalance",  label: "Vehicle loans",   icon: Car,        color: "#dc2626", source: "profile" },
  { key: "otherLiabilities",    label: "Other debts",     icon: Plus,       color: "#dc2626", source: "profile" },
];

const CASHFLOW_ROWS: (Omit<RowDef, "icon">)[] = [
  { key: "monthlyIncome",       label: "Income",        color: "#059669", source: "profile" },
  { key: "monthlyExpenses",     label: "Expenses",      color: "#dc2626" },
  { key: "monthlyLoanPayments", label: "Loan payments", color: "#d97706", source: "profile" },
  { key: "monthlySavings",      label: "Savings",       color: "#2A1FE6" },
];

const SOURCE_LABEL: Record<Source, string> = {
  accounts: "From your accounts",
  holdings: "From your holdings",
  profile:  "From your financial profile",
};

export default function AssetsPanel({ onGo }: { onGo: (t: MoneyTab) => void }) {
  const navigate = useNavigate();
  const { data: snap, isLoading } = useSnapshot();
  const { data: accounts } = useAccounts();
  const { data: holdings } = useHoldings();
  const { mutateAsync: upsert, isPending } = useUpsertSnapshot();
  const [form, setForm]   = useState<SnapshotInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editing = form !== null;

  if (isLoading) return <div className="py-16 grid place-items-center"><Loader2 size={24} className="text-ficium animate-spin" /></div>;

  const itemised = { accounts: (accounts?.length ?? 0) > 0, holdings: (holdings?.length ?? 0) > 0 };

  /** Where this row's figure lives, or null when it is edited here. */
  const sourceOf = (r: Pick<RowDef, "source" | "itemisedIn">): Source | null =>
    r.source ?? (r.itemisedIn && itemised[r.itemisedIn] ? r.itemisedIn : null);

  const openSource = (src: Source) =>
    src === "profile" ? navigate("/onboarding/dossier") : onGo("accounts");

  const value = (k: keyof FinancialSnapshot): number =>
    form && k in form ? (form[k as keyof SnapshotInput]) : ((snap?.[k] as number | undefined) ?? 0);

  const total = (rows: RowDef[]) => rows.reduce((s, r) => s + value(r.key), 0);

  const startEdit = () => {
    if (!snap) return;
    setError(null);
    setForm(Object.fromEntries(SNAPSHOT_OWNED_KEYS.map((k) => [k, snap[k] ?? 0])) as SnapshotInput);
  };

  const save = async () => {
    if (!form) return;
    setError(null);
    const res = await upsert(form);
    if (!res.ok) { setError(res.error ?? "Couldn't save. Check your connection and try again."); return; }
    setForm(null);
  };

  const set = (k: keyof FinancialSnapshot, v: string) => {
    const n = Number(v);
    setForm((f) => (f && k in f ? { ...f, [k]: Number.isFinite(n) && n >= 0 ? n : 0 } : f));
  };

  const rowProps = (r: Omit<RowDef, "icon">) => {
    const src = sourceOf(r);
    return {
      value: value(r.key),
      editing: editing && src === null,
      onChange: (v: string) => set(r.key, v),
      sourceLabel: src ? SOURCE_LABEL[src] : undefined,
      onSource: src ? () => openSource(src) : undefined,
    };
  };

  return (
    <>
      <div className="flex justify-end gap-2">
        {editing && (
          <button onClick={() => setForm(null)} disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-ink/70 hover:bg-ink/5">
            <X size={14} /> Cancel
          </button>
        )}
        <button onClick={editing ? save : startEdit} disabled={isPending}
          className="flex items-center gap-2 bg-ficium text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-60">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : editing ? <Save size={14} /> : <Edit3 size={14} />}
          {isPending ? "Saving…" : editing ? "Save changes" : "Edit"}
        </button>
      </div>

      {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600">{error}</div>}

      <Panel title="What you own" icon={<TrendingUp size={16} className="text-emerald-600" />}
        right={<span className="font-display text-[17px] font-bold text-emerald-700">{fmt(total(ASSET_ROWS))}</span>}>
        <div className="divide-y divide-ink/4">
          {ASSET_ROWS.map((r) => <Row key={r.key} def={r} {...rowProps(r)} />)}
        </div>
      </Panel>

      <Panel title="What you owe" icon={<TrendingDown size={16} className="text-red-500" />}
        right={<span className="font-display text-[17px] font-bold text-red-600">{fmt(total(DEBT_ROWS))}</span>}>
        <div className="divide-y divide-ink/4">
          {DEBT_ROWS.map((r) => <Row key={r.key} def={r} {...rowProps(r)} />)}
        </div>
      </Panel>

      <Panel title="Each month" icon={<BarChart2 size={16} className="text-ficium" />}>
        <div className="divide-y divide-ink/4">
          {CASHFLOW_ROWS.map((r) => (
            <Row key={r.key} def={{ ...r, icon: () => <span className="block w-2 h-2 rounded-full" style={{ background: r.color }} /> }}
              {...rowProps(r)} />
          ))}
        </div>
      </Panel>
    </>
  );
}

function Row({ def, value, editing, onChange, sourceLabel, onSource }: {
  def: RowDef; value: number; editing: boolean; onChange: (v: string) => void;
  sourceLabel?: string; onSource?: () => void;
}) {
  const Icon = def.icon;
  const id = `money-${def.key}`;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-6 grid place-items-center shrink-0"><Icon size={15} style={{ color: def.color }} /></div>
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="block text-[13px] font-medium text-ink">{def.label}</label>
        {onSource && sourceLabel && (
          <button onClick={onSource} className="text-[11px] font-semibold text-ficium/80 hover:underline">
            {sourceLabel}
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1 border border-ink/12 rounded-lg px-2.5 py-1.5 bg-paper focus-within:border-ficium">
          <span className="text-[12px] text-muted">MUR</span>
          <input id={id} type="number" inputMode="decimal" min={0} defaultValue={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-28 text-right text-[13px] font-semibold text-ink bg-transparent outline-hidden" />
        </div>
      ) : (
        <div id={id} className="text-[13px] font-semibold text-ink">
          {value > 0 ? fmt(value) : <span className="text-muted">—</span>}
        </div>
      )}
    </div>
  );
}
