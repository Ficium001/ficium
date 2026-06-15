import { useState } from "react";
import { Link }      from "react-router-dom";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number)    { return `MUR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`; }
function fmtNum(n: number) { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n)); }

// ── FTSlider ──────────────────────────────────────────────────────────────────

interface FTSliderProps {
  label:    string;
  value:    number;
  min:      number;
  max:      number;
  step:     number;
  display:  string;
  onChange: (v: number) => void;
  typeable?: boolean;
}

export function FTSlider({ label, value, min, max, step, display, onChange, typeable }: FTSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        {typeable ? (
          <input
            type="number" value={value} min={min} max={max} step={step}
            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= min && v <= max) onChange(v); }}
            className="w-36 text-right text-[13px] font-bold text-ink bg-surface border border-ink/[0.10] rounded-xl px-3 py-1.5 outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/15 transition-colors"
          />
        ) : (
          <span className="text-[14px] font-bold text-ink">{display}</span>
        )}
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-ink/[0.08] rounded-full overflow-hidden">
          <div className="h-full bg-ficium rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer h-full" style={{ margin: 0 }}
        />
        <div
          className="absolute w-[18px] h-[18px] bg-white border-2 border-ficium rounded-full shadow-[0_2px_8px_rgba(42,31,230,0.30)] pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── FinancialToolsSection ─────────────────────────────────────────────────────
// Self-contained calculator widget embedded in the Dashboard.
// For the standalone calculator page see individual/tools/pages/FinancialTools.tsx.

export function FinancialToolsSection() {
  const [mode,   setMode]   = useState<"credit" | "investment">("credit");
  const [amount, setAmount] = useState(500_000);
  const [rate,   setRate]   = useState(8.5);
  const [term,   setTerm]   = useState(3);

  const months         = term * 12;
  const monthlyRate    = rate / 100 / 12;
  const payment        = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const totalRepaid    = payment * months;
  const totalInterest  = totalRepaid - amount;
  const saving         = totalInterest * 0.25;
  const finalValue     = amount * Math.pow(1 + rate / 100, term);
  const earned         = finalValue - amount;
  const extraReturn    = earned * 0.20;
  const isCredit       = mode === "credit";

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-1">Financial Tools</div>
          <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink leading-tight">
            {isCredit ? "Credit" : "Investment"} <span className="text-ficium">analysis</span>
          </h2>
        </div>
        <div className="flex bg-ink/[0.06] rounded-pill p-1 gap-1">
          {(["credit", "investment"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                "text-[12px] font-semibold px-4 py-2 rounded-pill capitalize transition-all",
                mode === m ? "bg-ficium text-white shadow-ficium" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {m === "credit" ? "Credit" : "Investment"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm overflow-hidden">
        <div className="p-5 lg:grid lg:grid-cols-2 lg:gap-8">

          {/* Sliders */}
          <div className="space-y-6 mb-6 lg:mb-0">
            <FTSlider label="Amount (MUR)" value={amount} min={50_000} max={5_000_000} step={1_000} display={fmt(amount)} onChange={setAmount} typeable />
            <FTSlider label="Rate (% APR)"  value={rate}   min={1}      max={20}        step={0.1}   display={`${rate.toFixed(2)}%`}              onChange={setRate} />
            <FTSlider label="Term (Years)"  value={term}   min={1}      max={30}        step={1}     display={`${term} ${term === 1 ? "Year" : "Years"}`} onChange={setTerm} />

            <div className="bg-ficium/[0.04] border border-ficium/[0.14] rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-ficium animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-ficium">Market Insight</span>
              </div>
              <p className="text-[13px] text-muted leading-relaxed">
                {isCredit
                  ? <>Similar profiles recently received offers between <span className="font-semibold text-ink">7.2%–8.5%</span> on Ficium.</>
                  : <>Top accounts on Ficium currently yield between <span className="font-semibold text-ink">6.5%–10%</span> p.a.</>
                }
              </p>
            </div>
          </div>

          {/* Result panel */}
          <div className="rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-between bg-hero">
            <div>
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/40 mb-2">
                {isCredit ? "Monthly Payment" : "Projected Value"}
              </div>
              <div className="font-display text-[46px] sm:text-[52px] font-extrabold text-white leading-none tracking-tight mb-1">
                <span className="text-[20px] font-semibold opacity-60 align-top mt-1.5 mr-1">MUR</span>
                {isCredit ? fmtNum(payment) : fmtNum(finalValue)}
              </div>
              <div className="text-[13px] text-white/40 mt-2">
                {isCredit ? `Per month for ${months} months` : `Estimated after ${term} ${term === 1 ? "year" : "years"}`}
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: isCredit ? "Total Interest"   : "Interest Earned", value: isCredit ? fmtNum(totalInterest) : fmtNum(earned),     gold: isCredit },
                { label: isCredit ? "Total Repaid"     : "Principal",        value: isCredit ? fmtNum(totalRepaid)  : fmtNum(amount),      gold: false    },
                { label: "Effective APR",                                     value: `${rate.toFixed(2)}%`,                                gold: false    },
                { label: isCredit ? "Potential Saving" : "Extra Return",      value: isCredit ? fmtNum(saving)      : fmtNum(extraReturn), gold: true     },
              ].map(({ label, value, gold }) => (
                <div key={label} className="bg-white/[0.07] border border-white/[0.08] rounded-xl p-3.5">
                  <div className="text-[10px] font-bold tracking-[0.10em] uppercase text-white/35 mb-1.5">{label}</div>
                  <div className={`font-display text-[19px] font-bold ${gold ? "text-accent" : "text-white"}`}>{value}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-white/25 mt-4">
              Indicative only · figures depend on final bank approval and terms
            </p>
          </div>
        </div>

        {/* Link to full tool */}
        <div className="border-t border-ink/[0.05] px-5 py-3 flex justify-end">
          <Link to="/tools" className="text-[12px] font-bold text-ficium no-underline hover:underline">
            Open full calculator →
          </Link>
        </div>
      </div>
    </div>
  );
}
