import { useMemo, useState } from "react";
import { Plus, Trash2, TrendingUp, Info } from "lucide-react";
import { Field, Input, Select, Button } from "../../../shared/ui";
import { solveXirr, cagr, realRate, yearsBetween, type CashFlow } from "../lib/xirr";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type RoiDetailMode = "quick" | "detailed";
type LineItemType = "income" | "cost" | "capital";

type LineItem = {
  id: string;
  date: string;
  label: string;
  amount: number;
  type: LineItemType;
};

const LINE_ITEM_META: Record<LineItemType, { label: string; hint: string }> = {
  income:  { label: "Income received",  hint: "Rent, dividends, etc. — adds to your return" },
  cost:    { label: "Cost incurred",    hint: "Maintenance, tax, fees — reduces your return" },
  capital: { label: "Capital added",    hint: "Top-up investment, renovation — added to cost basis" },
};

function newLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    label: "",
    amount: 0,
    type: "cost",
  };
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmt(n: number): string {
  return `MUR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

function fmtPct(n: number | null): string {
  if (n === null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearsAgoIso(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

/* ─────────────────────────────────────────────
   ResultStat (local copy — matches FinancialTools styling)
───────────────────────────────────────────── */
function ResultStat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "highlight" | "good" | "bad";
}) {
  const bg =
    variant === "highlight"
      ? "bg-ficium/[0.07] border border-ficium/15"
      : "bg-white/[0.07] border border-white/[0.08]";

  const labelColor = variant === "highlight" ? "text-ficium" : "text-white/35";

  const valueColor =
    variant === "highlight" ? "text-ficium"
    : variant === "good"    ? "text-mint"
    : variant === "bad"     ? "text-[#FF8A8A]"
    : "text-white";

  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.10em] mb-1.5 ${labelColor}`}>
        {label}
      </div>
      <div className={`font-display text-[20px] font-extrabold leading-none ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Small pill toggle (Quick / Detailed)
───────────────────────────────────────────── */
function PillToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-ink/[0.06] rounded-pill p-1 gap-1 w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            "text-[12.5px] font-semibold px-4 py-2 rounded-pill transition-all",
            value === o.value ? "bg-ficium text-white shadow-ficium" : "text-muted hover:text-ink",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Line item row
───────────────────────────────────────────── */
function LineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: LineItem;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] sm:grid-cols-[120px_1fr_120px_140px_auto] gap-2 items-end bg-paper rounded-xl p-3 border border-ink/[0.06]">
      <Field label="Date" className="col-span-1">
        <Input
          type="date"
          value={item.date}
          onChange={(e) => onChange({ ...item, date: e.target.value })}
        />
      </Field>
      <Field label="Description" className="col-span-1">
        <Input
          type="text"
          placeholder="e.g. Property tax"
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
        />
      </Field>
      <Field label="Amount (MUR)" className="col-span-1">
        <Input
          type="number"
          min={0}
          value={item.amount || ""}
          onChange={(e) => onChange({ ...item, amount: Number(e.target.value) || 0 })}
        />
      </Field>
      <Field label="Type" className="col-span-1">
        <Select
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as LineItemType })}
        >
          <option value="income">Income</option>
          <option value="cost">Cost</option>
          <option value="capital">Capital added</option>
        </Select>
      </Field>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove cash flow"
        className="h-[46px] sm:h-[50px] w-[46px] flex items-center justify-center rounded-xl text-muted hover:text-bad hover:bg-bad/[0.06] transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROICalculator (main export)
───────────────────────────────────────────── */
export function ROICalculator() {
  const [detailMode, setDetailMode] = useState<RoiDetailMode>("quick");

  /* Core fields (shared by both modes) */
  const [initialCost, setInitialCost] = useState(2_500_000);
  const [investmentDate, setInvestmentDate] = useState(yearsAgoIso(10));
  const [exitValue, setExitValue] = useState(4_200_000);
  const [stillHolding, setStillHolding] = useState(false);
  const [exitDate, setExitDate] = useState(todayIso());

  /* Detailed-only fields */
  const [acquisitionCharges, setAcquisitionCharges] = useState(0);
  const [exitCharges, setExitCharges] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [adjustInflation, setAdjustInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState(5.0); // % p.a.

  const effectiveExitDate = stillHolding ? todayIso() : exitDate;
  const isDetailed = detailMode === "detailed";

  const result = useMemo(() => {
    const years = yearsBetween(investmentDate, effectiveExitDate);

    const acq = isDetailed ? acquisitionCharges : 0;
    const exitFee = isDetailed ? exitCharges : 0;

    const capitalAdds = isDetailed ? lineItems.filter((l) => l.type === "capital") : [];
    const costItems = isDetailed ? lineItems.filter((l) => l.type === "cost") : [];
    const incomeItems = isDetailed ? lineItems.filter((l) => l.type === "income") : [];

    const totalCapitalAdded = capitalAdds.reduce((s, l) => s + l.amount, 0);
    const totalCosts = costItems.reduce((s, l) => s + l.amount, 0);
    const totalIncome = incomeItems.reduce((s, l) => s + l.amount, 0);

    const totalInvested = initialCost + acq + totalCapitalAdded;
    const totalCharges = acq + exitFee + totalCosts;
    const netProceeds = exitValue - exitFee + totalIncome - totalCosts;

    const netProfit = netProceeds - totalInvested;
    const totalROI = totalInvested > 0 ? netProfit / totalInvested : null;
    const simpleCagr = cagr(totalInvested, netProceeds, years);

    let irr: number | null = null;
    if (isDetailed && (capitalAdds.length || costItems.length || incomeItems.length)) {
      const flows: CashFlow[] = [
        { date: investmentDate, amount: -(initialCost + acq) },
        ...capitalAdds.map((l) => ({ date: l.date, amount: -l.amount })),
        ...costItems.map((l) => ({ date: l.date, amount: -l.amount })),
        ...incomeItems.map((l) => ({ date: l.date, amount: l.amount })),
        { date: effectiveExitDate, amount: exitValue - exitFee },
      ];
      irr = solveXirr(flows);
    }

    const headlineRate = irr ?? simpleCagr;
    const realHeadline = adjustInflation && headlineRate !== null
      ? realRate(headlineRate, inflationRate / 100)
      : null;

    return {
      years,
      totalInvested,
      totalCharges,
      totalIncome,
      netProceeds,
      netProfit,
      totalROI,
      simpleCagr,
      irr,
      headlineRate,
      realHeadline,
      sameDayOrInvalid: years <= 0,
    };
  }, [
    initialCost, investmentDate, exitValue, effectiveExitDate, isDetailed,
    acquisitionCharges, exitCharges, lineItems, adjustInflation, inflationRate,
  ]);

  function updateLineItem(id: string, next: LineItem) {
    setLineItems((items) => items.map((it) => (it.id === id ? next : it)));
  }
  function removeLineItem(id: string) {
    setLineItems((items) => items.filter((it) => it.id !== id));
  }

  const profitIsNegative = result.netProfit < 0;
  const headlineLabel = result.irr !== null ? "Annualized Return (IRR)" : "Annualized Return (CAGR)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
      {/* ── Left: Inputs ── */}
      <div className="bg-white rounded-[24px] border border-ink/[0.06] shadow-card p-8">
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted">
            Investment Details
          </div>
          <PillToggle
            value={detailMode}
            onChange={setDetailMode}
            options={[
              { value: "quick", label: "Quick" },
              { value: "detailed", label: "Detailed" },
            ]}
          />
        </div>

        <div className="space-y-5">
          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Initial Cost (MUR)">
              <Input
                type="number"
                min={0}
                value={initialCost || ""}
                onChange={(e) => setInitialCost(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Date of Investment">
              <Input
                type="date"
                value={investmentDate}
                onChange={(e) => setInvestmentDate(e.target.value)}
              />
            </Field>

            <Field label={stillHolding ? "Current Estimated Value (MUR)" : "Sale / Exit Value (MUR)"}>
              <Input
                type="number"
                min={0}
                value={exitValue || ""}
                onChange={(e) => setExitValue(Number(e.target.value) || 0)}
              />
            </Field>
            <Field
              label="Date of Exit"
              hint={stillHolding ? "Still holding — using today's date" : undefined}
            >
              <Input
                type="date"
                value={effectiveExitDate}
                disabled={stillHolding}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit select-none">
            <input
              type="checkbox"
              checked={stillHolding}
              onChange={(e) => setStillHolding(e.target.checked)}
              className="w-4 h-4 rounded accent-ficium"
            />
            <span className="text-[13px] font-medium text-ink">
              I'm still holding this investment
            </span>
          </label>

          {isDetailed && (
            <>
              <div className="h-px bg-ink/[0.06] my-2" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Acquisition Charges (MUR)"
                  optional
                  hint="Legal fees, stamp duty, brokerage at purchase"
                >
                  <Input
                    type="number"
                    min={0}
                    value={acquisitionCharges || ""}
                    onChange={(e) => setAcquisitionCharges(Number(e.target.value) || 0)}
                  />
                </Field>
                <Field
                  label="Exit Charges (MUR)"
                  optional
                  hint="Agent commission, legal fees, tax at sale"
                >
                  <Input
                    type="number"
                    min={0}
                    value={exitCharges || ""}
                    onChange={(e) => setExitCharges(Number(e.target.value) || 0)}
                  />
                </Field>
              </div>

              <div className="h-px bg-ink/[0.06] my-2" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">Cash Flows During Holding</div>
                    <div className="text-xs text-muted mt-0.5">
                      Rent, dividends, maintenance, top-up capital — anything dated in between
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {lineItems.map((item) => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      onChange={(next) => updateLineItem(item.id, next)}
                      onRemove={() => removeLineItem(item.id)}
                    />
                  ))}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => setLineItems((items) => [...items, newLineItem()])}
                  className="mt-3"
                >
                  Add cash flow
                </Button>

                {lineItems.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11.5px] text-muted">
                    {Object.entries(LINE_ITEM_META).map(([k, v]) => (
                      <span key={k}>
                        <span className="font-semibold text-ink">{v.label}:</span> {v.hint}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-ink/[0.06] my-2" />

              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adjustInflation}
                    onChange={(e) => setAdjustInflation(e.target.checked)}
                    className="w-4 h-4 rounded accent-ficium"
                  />
                  <span className="text-[13px] font-medium text-ink">Adjust for inflation</span>
                </label>
                {adjustInflation && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted">Assumed inflation</span>
                    <Input
                      type="number"
                      step={0.1}
                      min={0}
                      max={30}
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value) || 0)}
                      className="!w-20 !py-2 text-right"
                    />
                    <span className="text-[13px] text-muted">% p.a.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {result.sameDayOrInvalid && (
          <div className="mt-6 flex items-start gap-2.5 bg-warn/[0.08] border border-warn/20 rounded-2xl px-4 py-3">
            <Info size={15} className="text-warn flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-ink/80 leading-relaxed">
              Exit date must be after the investment date to calculate an annualized return.
              Total ROI is still shown below.
            </p>
          </div>
        )}
      </div>

      {/* ── Right: Results ── */}
      <div className="rounded-[24px] overflow-hidden border border-ink/[0.06] shadow-card">
        <div className="px-7 py-8 relative overflow-hidden bg-hero">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-ficium/25 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-ficium/15 blur-[60px] pointer-events-none" />

          <div className="relative z-10">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/40 mb-2">
              {headlineLabel}
            </div>

            <div
              className={[
                "font-display text-[52px] font-extrabold leading-none tracking-tight mb-1",
                result.sameDayOrInvalid ? "text-white/30" : profitIsNegative ? "text-[#FF8A8A]" : "text-white",
              ].join(" ")}
            >
              {result.sameDayOrInvalid ? "—" : fmtPct(result.headlineRate)}
            </div>

            <div className="text-[13px] text-white/40 mt-2">
              {result.sameDayOrInvalid
                ? "Adjust dates to see an annualized figure"
                : `Over ${result.years.toFixed(1)} ${result.years === 1 ? "year" : "years"} held`}
            </div>

            {adjustInflation && result.realHeadline !== null && (
              <div className="text-[13px] text-white/55 mt-1">
                Real (inflation-adjusted): <span className="font-semibold text-white/80">{fmtPct(result.realHeadline)}</span>
              </div>
            )}

            <div className="h-px bg-white/10 my-6" />

            <div className="grid grid-cols-2 gap-3">
              <ResultStat
                label="Net Profit"
                value={fmt(result.netProfit)}
                variant={profitIsNegative ? "bad" : "good"}
              />
              <ResultStat label="Total ROI" value={fmtPct(result.totalROI)} />
              <ResultStat
                label="Total Invested"
                value={fmt(result.totalInvested)}
              />
              {isDetailed ? (
                <ResultStat label="Total Charges" value={fmt(result.totalCharges)} />
              ) : (
                <ResultStat label="Simple CAGR" value={fmtPct(result.simpleCagr)} />
              )}
            </div>

            {isDetailed && result.totalIncome > 0 && (
              <div className="mt-3">
                <ResultStat label="Income Received" value={fmt(result.totalIncome)} variant="highlight" />
              </div>
            )}

            {isDetailed && result.irr !== null && (
              <div className="mt-3 text-[12px] text-white/35 leading-relaxed">
                IRR accounts for the exact timing of every cash flow above — it's the more
                precise figure when capital moved in or out partway through the holding period.
                Simple CAGR ({fmtPct(result.simpleCagr)}) treats the investment as a single
                lump sum in, lump sum out.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-ficium/[0.07] border border-ficium/[0.12] grid place-items-center text-base">
              <TrendingUp size={16} className="text-ficium" />
            </div>
            <p className="text-[13.5px] text-muted leading-relaxed">
              Works for any asset — property, equity, gold, a business stake.
              Switch to <span className="font-semibold text-ink">Detailed</span> to factor in
              charges, multi-year cash flows, and inflation.
            </p>
          </div>

          <p className="text-[11px] text-muted/50 text-center mt-4">
            Indicative only. Not financial or tax advice.
          </p>
        </div>
      </div>
    </div>
  );
}
