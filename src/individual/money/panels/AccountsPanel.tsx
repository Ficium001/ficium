// src/individual/money/panels/AccountsPanel.tsx
// Bank accounts and investments with live prices. Totals here feed the
// read-only cash / deposits / investments lines on Assets & debts.
import { useMemo } from "react";
import { formatAmount } from "@/shared/lib/format";
import { useHoldings } from "@/individual/money/finance/hooks/useHoldings";
import { useReportingCurrency, useSetReportingCurrency } from "@/individual/money/finance/hooks/useFinanceReporting";
import { CURRENCIES, type Currency } from "@/individual/money/finance/types";
import AccountsList from "@/individual/money/finance/components/AccountsList";
import HoldingsList from "@/individual/money/finance/components/HoldingsList";

export default function AccountsPanel() {
  const { data: reportingCurrency, isLoading } = useReportingCurrency();
  const { mutateAsync: setCurrency, isPending } = useSetReportingCurrency();
  const { data: holdings } = useHoldings();
  const ccy = reportingCurrency ?? "MUR";

  const perf = useMemo(() => {
    const list = holdings ?? [];
    const cost = list.reduce((s, h) => s + (h.costBasisReporting ?? 0), 0);
    const pl   = list.reduce((s, h) => s + (h.unrealizedPlReporting ?? 0), 0);
    return cost > 0 ? { pl, pct: (pl / cost) * 100 } : null;
  }, [holdings]);

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="money-ccy" className="text-[12px] text-muted">Show amounts in</label>
        <select
          id="money-ccy"
          value={ccy}
          disabled={isLoading || isPending}
          onChange={(e) => { const c = e.target.value as Currency; if (c !== ccy) void setCurrency(c); }}
          className="bg-white border border-ink/10 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-[15px] text-ink px-1">Bank accounts</h2>
        <AccountsList reportingCurrency={ccy} />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-bold text-[15px] text-ink">Investments</h2>
          {perf && (
            <span className={["text-[13px] font-bold", perf.pl >= 0 ? "text-emerald-600" : "text-red-600"].join(" ")}>
              {perf.pl >= 0 ? "+" : ""}{formatAmount(Math.round(perf.pl), ccy)} ({perf.pct >= 0 ? "+" : ""}{perf.pct.toFixed(1)}%)
            </span>
          )}
        </div>
        <HoldingsList reportingCurrency={ccy} />
      </section>
    </>
  );
}
