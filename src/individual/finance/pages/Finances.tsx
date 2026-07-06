// src/individual/finance/pages/Finances.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Wallet, LineChart as LineChartIcon } from "lucide-react";
import { PageShell } from "@/shared/ui";
import { LineChart } from "@/shared/ui/dashboard";
import { formatAmount } from "@/shared/lib/format";
import { useAccounts } from "@/individual/finance/hooks/useAccounts";
import { useHoldings } from "@/individual/finance/hooks/useHoldings";
import { useNetWorthHistory, useReportingCurrency, useSetReportingCurrency } from "@/individual/finance/hooks/useFinanceReporting";
import { CURRENCIES } from "@/individual/finance/types";
import type { Currency } from "@/individual/finance/types";
import AccountsList from "@/individual/finance/components/AccountsList";
import HoldingsList from "@/individual/finance/components/HoldingsList";

type Tab = "overview" | "accounts" | "investments";

export default function FinancesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: reportingCurrency, isLoading: ccyLoading } = useReportingCurrency();
  const { mutateAsync: setCurrency, isPending: switchingCurrency } = useSetReportingCurrency();

  const { data: accounts } = useAccounts();
  const { data: holdings } = useHoldings();
  const { data: history, isLoading: historyLoading } = useNetWorthHistory(180);

  const ccy = reportingCurrency ?? "MUR";

  const cashTotal = useMemo(
    () => (accounts ?? []).reduce((sum, a) => sum + a.balanceReporting, 0),
    [accounts]
  );
  const portfolio = useMemo(() => {
    const list = holdings ?? [];
    const value = list.reduce((sum, h) => sum + h.marketValueReporting, 0);
    const cost  = list.reduce((sum, h) => sum + (h.costBasisReporting ?? 0), 0);
    const pl    = list.reduce((sum, h) => sum + (h.unrealizedPlReporting ?? 0), 0);
    const plPct = cost > 0 ? (pl / cost) * 100 : null;
    return { value, cost, pl, plPct, hasCostBasis: cost > 0 };
  }, [holdings]);

  const trendData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((h) => ({
      label: new Date(h.snapshotDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      value: Math.round(h.netWorth),
    }));
  }, [history]);

  const handleCurrencyChange = async (next: Currency) => {
    if (next === ccy) return;
    await setCurrency(next);
  };

  return (
    <PageShell max="900px">
      <section className="relative overflow-hidden rounded-hero bg-hero text-white px-5 sm:px-9 py-8 mt-1">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-6">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">My Finances</div>
            <div className="font-display text-[32px] sm:text-[40px] font-extrabold text-white leading-none">
              {formatAmount(cashTotal + portfolio.value, ccy)}
            </div>
            <div className="text-[13px] text-white/50 mt-2">Cash + investments, reported in {ccy}</div>
          </div>

          <label className="flex items-center gap-2">
            <span className="text-[12px] text-white/50">Reporting currency</span>
            <select
              value={ccy}
              disabled={ccyLoading || switchingCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
              className="bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold rounded-xl px-3 py-2 outline-hidden border-none appearance-none cursor-pointer"
            >
              {CURRENCIES.map((c) => <option key={c} value={c} className="text-ink">{c}</option>)}
            </select>
          </label>
        </div>

        <div className="flex gap-3 mt-6 flex-wrap">
          <Chip label="Cash & deposits" value={formatAmount(cashTotal, ccy)} />
          <Chip label="Investments" value={formatAmount(portfolio.value, ccy)} />
          {portfolio.hasCostBasis && portfolio.plPct != null && (
            <Chip
              label="Unrealized P/L"
              value={`${portfolio.pl >= 0 ? "+" : ""}${formatAmount(portfolio.pl, ccy)} (${portfolio.plPct >= 0 ? "+" : ""}${portfolio.plPct.toFixed(1)}%)`}
              green={portfolio.pl >= 0}
              red={portfolio.pl < 0}
            />
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 mt-6 bg-white rounded-2xl border border-ink/6 p-1">
        {([
          { key: "overview", label: "Overview" },
          { key: "accounts", label: "Accounts" },
          { key: "investments", label: "Investments" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors",
              tab === t.key ? "bg-ficium text-white" : "text-ink/60 hover:bg-ink/5",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-6 space-y-5">
        {tab === "overview" && (
          <>
            <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5">
              <div className="flex items-center gap-2 mb-1">
                <LineChartIcon size={16} className="text-ficium" />
                <span className="font-bold text-[15px] text-ink">Net worth trend</span>
              </div>
              {historyLoading ? (
                <div className="py-10 grid place-items-center"><Loader2 size={22} className="text-ficium animate-spin" /></div>
              ) : trendData.length < 2 ? (
                <div className="text-[13px] text-muted py-8 text-center">
                  Your net worth trend will appear here once you have a few days of history.
                  Add accounts or holdings to get started.
                </div>
              ) : (
                <LineChart data={trendData} unit={ccy} ariaLabel="Net worth trend" />
              )}
            </div>

            <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink/5">
                <Wallet size={16} className="text-ficium" />
                <span className="font-bold text-[15px] text-ink">Allocation</span>
              </div>
              <div className="divide-y divide-ink/4">
                <AllocationRow label="Cash & deposits" value={cashTotal} total={cashTotal + portfolio.value} currency={ccy} color="#2A1FE6" />
                <AllocationRow label="Investments" value={portfolio.value} total={cashTotal + portfolio.value} currency={ccy} color="#7c3aed" />
              </div>
            </div>

            {portfolio.hasCostBasis && (
              <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5">
                <div className="flex items-center gap-2 mb-3">
                  {portfolio.pl >= 0 ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                  <span className="font-bold text-[15px] text-ink">Portfolio performance</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="Cost basis" value={formatAmount(portfolio.cost, ccy)} />
                  <Stat label="Current value" value={formatAmount(portfolio.value, ccy)} />
                  <Stat
                    label="Return"
                    value={`${portfolio.pl >= 0 ? "+" : ""}${portfolio.plPct?.toFixed(1)}%`}
                    tone={portfolio.pl >= 0 ? "good" : "bad"}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {tab === "accounts" && <AccountsList reportingCurrency={ccy} />}
        {tab === "investments" && <HoldingsList reportingCurrency={ccy} />}
      </div>
    </PageShell>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Chip({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  const bg = green ? "bg-emerald-500/20 text-emerald-300" : red ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/70";
  return (
    <div className={["px-3 py-1.5 rounded-pill text-[12px] font-semibold", bg].join(" ")}>
      {label}: <span className="font-bold">{value}</span>
    </div>
  );
}

function AllocationRow({ label, value, total, currency, color }: {
  label: string; value: number; total: number; currency: string; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[13px] font-semibold text-ink">{formatAmount(value, currency)}</span>
      </div>
      <div className="h-1.5 bg-ink/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-ink";
  return (
    <div>
      <div className={["font-display text-[17px] font-bold", color].join(" ")}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  );
}
