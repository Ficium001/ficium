import { useState } from "react";
import { TrendingUp, HandCoins } from "lucide-react";
import { PageShell } from "../../../shared/ui";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Mode = "credit" | "investment";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmt(n: number): string {
  return `MUR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/* ─────────────────────────────────────────────
   SimSlider
───────────────────────────────────────────── */
function SimSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  typeable,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  typeable?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        {typeable ? (
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
            className="w-36 text-right text-[14px] font-bold text-ink bg-paper border border-ink/[0.10] rounded-xl px-3 py-1.5 outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-colors"
          />
        ) : (
          <span className="text-[14px] font-bold text-ink">{display}</span>
        )}
      </div>

      {/* Custom track */}
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-ink/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-ficium rounded-full transition-[width] duration-[40ms]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Transparent range on top for interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer h-full"
          style={{ margin: 0 }}
        />
        {/* Thumb */}
        <div
          className="absolute w-[18px] h-[18px] bg-white border-2 border-ficium rounded-full shadow-[0_2px_8px_rgba(42,31,230,0.30)] pointer-events-none -translate-x-1/2 transition-[left] duration-[40ms]"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ResultStat
───────────────────────────────────────────── */
function ResultStat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "highlight" | "gold" | "mint";
}) {
  const bg =
    variant === "highlight"
      ? "bg-ficium/[0.07] border border-ficium/15"
      : "bg-white/[0.07] border border-white/[0.08]";

  const labelColor =
    variant === "highlight"
      ? "text-ficium"
      : "text-white/35";

  const valueColor =
    variant === "highlight" ? "text-ficium"
    : variant === "gold"    ? "text-accent"
    : variant === "mint"    ? "text-mint"
    : "text-white";

  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.10em] mb-1.5 ${labelColor}`}>
        {label}
      </div>
      <div
        className={`font-display text-[20px] font-extrabold leading-none ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FinancialTools (page)
───────────────────────────────────────────── */
export default function FinancialTools() {
  const [mode, setMode] = useState<Mode>("credit");

  /* Shared inputs */
  const [amount, setAmount] = useState(500_000);
  const [rate,   setRate]   = useState(8.5);
  const [term,   setTerm]   = useState(3);      // years for credit, months for investment

  /* ── Credit calcs ── */
  const months      = term * 12;
  const monthlyRate = rate / 100 / 12;
  const payment     = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const totalRepaid = payment * months;
  const totalInterest = totalRepaid - amount;
  const saving      = totalInterest * 0.25;

  /* ── Investment calcs ── */
  const finalValue  = amount * Math.pow(1 + rate / 100, term);
  const earned      = finalValue - amount;
  const extraReturn = earned * 0.20;

  const isCredit = mode === "credit";

  const mainValue  = isCredit ? fmtNum(payment)    : fmtNum(finalValue);
  const mainSub    = isCredit
    ? `Per month for ${months} months`
    : `Estimated value after ${term} ${term === 1 ? "year" : "years"}`;

  return (
    <PageShell max="1160px">

      <div className="pt-6 pb-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted mb-1">
              Financial Tools Module
            </div>
            <h1 className="font-display text-[32px] sm:text-[38px] font-extrabold text-ink leading-none">
              {isCredit ? "Credit Analysis" : "Investment Analysis"}
            </h1>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-ink/[0.06] rounded-pill p-1 gap-1 self-start mt-1">
            {(["credit", "investment"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  "text-[13px] font-semibold px-5 py-2.5 rounded-pill capitalize transition-all",
                  mode === m
                    ? "bg-ficium text-white shadow-ficium"
                    : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {m === "credit" ? "Credit" : "Investment"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">

          {/* ── Left: Inputs ── */}
          <div className="bg-white rounded-[24px] border border-ink/[0.06] shadow-card p-8">

            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted mb-7">
              Parameters
            </div>

            <div className="space-y-8">
              <SimSlider
                label="Amount (MUR)"
                value={amount}
                min={50_000}
                max={5_000_000}
                step={1_000}
                display={fmt(amount)}
                onChange={setAmount}
                typeable
              />

              <SimSlider
                label="Rate (% APR)"
                value={rate}
                min={1}
                max={20}
                step={0.1}
                display={`${rate.toFixed(2)}%`}
                onChange={setRate}
              />

              <SimSlider
                label="Term (Years)"
                value={term}
                min={1}
                max={30}
                step={1}
                display={`${term} ${term === 1 ? "Year" : "Years"}`}
                onChange={setTerm}
              />
            </div>

            {/* Market insight */}
            <div className="mt-8 bg-ficium/[0.04] border border-ficium/[0.14] rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-ficium animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-ficium">
                  Market Insight
                </span>
              </div>
              <p className="text-[13.5px] text-muted leading-relaxed">
                {isCredit ? (
                  <>Similar profiles recently received offers between{" "}
                    <span className="font-semibold text-ink">7.2% and 8.5%</span> on Ficium.</>
                ) : (
                  <>Top-rated accounts on Ficium currently yield between{" "}
                    <span className="font-semibold text-ink">6.5% and 10%</span> p.a.</>
                )}
              </p>
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="rounded-[24px] overflow-hidden border border-ink/[0.06] shadow-card">

            {/* Dark hero */}
            <div className="px-7 py-8 relative overflow-hidden bg-hero">
              {/* Decorative glows */}
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-ficium/25 blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-ficium/15 blur-[60px] pointer-events-none" />

              <div className="relative z-10">
                <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/40 mb-2">
                  {isCredit ? "Monthly Payment" : "Projected Value"}
                </div>

                <div className="font-display text-[52px] font-extrabold text-white leading-none tracking-tight mb-1">
                  <span className="text-[22px] font-semibold opacity-60 align-top mt-2 mr-1">MUR</span>
                  {mainValue}
                </div>

                <div className="text-[13px] text-white/40 mt-2">{mainSub}</div>

                <div className="h-px bg-white/10 my-6" />

                {/* Metric grid */}
                <div className="grid grid-cols-2 gap-3">
                  <ResultStat
                    label={isCredit ? "Total Interest" : "Interest Earned"}
                    value={isCredit ? fmtNum(totalInterest) : fmtNum(earned)}
                  />
                  <ResultStat
                    label={isCredit ? "Total Repaid" : "Principal"}
                    value={isCredit ? fmtNum(totalRepaid) : fmtNum(amount)}
                  />
                  <ResultStat
                    label="Effective APR"
                    value={`${rate.toFixed(2)}%`}
                  />
                  <ResultStat
                    label={isCredit ? "Potential Saving" : "Extra Return"}
                    value={isCredit ? fmtNum(saving) : fmtNum(extraReturn)}
                    variant={isCredit ? "gold" : "mint"}
                  />
                </div>
              </div>
            </div>

            {/* White info strip */}
            <div className="bg-white px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-ficium/[0.07] border border-ficium/[0.12] grid place-items-center text-base">
                  {isCredit ? (
                    <HandCoins size={16} className="text-ficium" />
                  ) : (
                    <TrendingUp size={16} className="text-ficium" />
                  )}
                </div>
                <p className="text-[13.5px] text-muted leading-relaxed">
                  {isCredit ? (
                    <>Institutions on Ficium could save you up to{" "}
                      <span className="font-semibold text-ficium">{fmt(saving)}</span>{" "}
                      based on your current parameters.</>
                  ) : (
                    <>Institutions on Ficium may offer returns up to{" "}
                      <span className="font-semibold text-ficium">{fmt(extraReturn)}</span>{" "}
                      higher than current market averages.</>
                  )}
                </p>
              </div>

              <p className="text-[11px] text-muted/50 text-center mt-4">
                Indicative only. Final terms subject to provider assessment and approval.
              </p>
            </div>

          </div>
        </div>
      </div>
    </PageShell>
  );
}
