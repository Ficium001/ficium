// src/individual/money/tools/components/LoanSavingsCalculator.tsx
// Loan repayment and savings growth estimates. Numbers are pure arithmetic on
// the user's inputs: no invented market rates or "you could save" claims.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export type CalcMode = "loan" | "savings";

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
            className="w-36 text-right text-[14px] font-bold text-ink bg-paper border border-ink/10 rounded-xl px-3 py-1.5 outline-hidden focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-colors"
          />
        ) : (
          <span className="text-[14px] font-bold text-ink">{display}</span>
        )}
      </div>

      {/* Custom track */}
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-ink/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-ficium rounded-full transition-[width] duration-40"
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
          className="absolute w-[18px] h-[18px] bg-white border-2 border-ficium rounded-full shadow-[0_2px_8px_rgba(42,31,230,0.30)] pointer-events-none -translate-x-1/2 transition-[left] duration-40"
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
      : "bg-white/[0.07] border border-white/8";

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
      <div className={`text-[10px] font-bold tracking-widest mb-1.5 ${labelColor}`}>
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
export function LoanSavingsCalculator({ mode }: { mode: CalcMode }) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(500_000);
  const [rate,   setRate]   = useState(8.5);
  const [term,   setTerm]   = useState(3);

  const isLoan = mode === "loan";
  const months = term * 12;
  const r = rate / 100 / 12;
  const payment = r === 0 ? amount / months : amount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalRepaid = payment * months;
  const finalValue  = amount * Math.pow(1 + rate / 100, term);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-6 space-y-7">
        <SimSlider label={isLoan ? "Loan amount (MUR)" : "Amount saved (MUR)"} value={amount} min={50_000} max={5_000_000}
          step={1_000} display={fmt(amount)} onChange={setAmount} typeable />
        <SimSlider label={isLoan ? "Interest rate (% a year)" : "Return (% a year)"} value={rate} min={0} max={20}
          step={0.1} display={`${rate.toFixed(2)}%`} onChange={setRate} />
        <SimSlider label="Term (years)" value={term} min={1} max={30} step={1}
          display={`${term} ${term === 1 ? "year" : "years"}`} onChange={setTerm} />
      </div>

      <div className="rounded-[22px] overflow-hidden border border-ink/6 shadow-xs">
        <div className="px-6 py-7 bg-hero text-white">
          <div className="text-[13px] text-white/60 mb-1">{isLoan ? "Monthly repayment" : "Value at the end"}</div>
          <div className="font-display text-[44px] font-extrabold leading-none tracking-tight">
            <span className="text-[18px] font-semibold opacity-60 mr-1">MUR</span>{fmtNum(isLoan ? payment : finalValue)}
          </div>
          <div className="text-[13px] text-white/50 mt-2">
            {isLoan ? `For ${months} months` : `After ${term} ${term === 1 ? "year" : "years"}, compounded yearly`}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <ResultStat label={isLoan ? "Total interest" : "Growth"} value={fmtNum(isLoan ? totalRepaid - amount : finalValue - amount)} />
            <ResultStat label={isLoan ? "Total repaid" : "You put in"} value={fmtNum(isLoan ? totalRepaid : amount)} />
          </div>
        </div>
        <div className="bg-white px-6 py-5">
          <button onClick={() => navigate("/requests/new")}
            className="w-full py-3 rounded-xl bg-ficium text-white text-[14px] font-bold flex items-center justify-center gap-1.5">
            {isLoan ? "Get banks to bid on this loan" : "Get banks to bid on your savings"} <ArrowRight size={14} />
          </button>
          <p className="text-[11px] text-muted text-center mt-3">Estimate only. Real terms come from the banks' offers.</p>
        </div>
      </div>
    </div>
  );
}
