// =============================================================
// Ficium — New Request (Smart Stepped Wizard)
// Zero Claude calls. SQL-powered market hints from intelligence.
// Steps: product → amount/term → purpose → review → submit
// =============================================================
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Lock, CheckCircle2,
  Loader2, AlertCircle, HandCoins, Building2,
  PiggyBank, LineChart, CreditCard, Briefcase,
  Banknote, Home, Car, BarChart2,
} from "lucide-react";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { createRequest, type ProductType } from "../api/requests";
import { useIntelligence } from "@/shared/lib/intelligence";
import { BottomNav } from "../../../shared/ui";

/* ─── Product catalogue ─────────────────────────────────── */
type Product = {
  type: ProductType;
  label: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  hint: string;
  minAmount: number;
  maxAmount: number;
  minTerm: number;
  maxTerm: number;
  defaultTerm: number;
  defaultAmount: number;
};

const PRODUCTS: Product[] = [
  { type: "personal_loan",     label: "Personal Loan",     icon: HandCoins,  color: "text-ficium",      iconBg: "bg-ficium/10",     hint: "For personal expenses, travel, education or debt consolidation", minAmount: 50_000,     maxAmount: 2_000_000,  minTerm: 12, maxTerm: 84,  defaultTerm: 36,  defaultAmount: 300_000   },
  { type: "sme_loan",          label: "SME Loan",          icon: Building2,  color: "text-violet-600",  iconBg: "bg-violet-50",     hint: "Working capital, equipment or growth funding for your business",   minAmount: 200_000,    maxAmount: 10_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 60,  defaultAmount: 1_000_000 },
  { type: "mortgage",          label: "Mortgage",          icon: Home,       color: "text-amber-600",   iconBg: "bg-amber-50",      hint: "Finance your property purchase or construction",                   minAmount: 500_000,    maxAmount: 20_000_000, minTerm: 60, maxTerm: 360, defaultTerm: 240, defaultAmount: 3_000_000 },
  { type: "fixed_deposit",     label: "Fixed Deposit",     icon: PiggyBank,  color: "text-emerald-600", iconBg: "bg-emerald-50",    hint: "Lock in your savings and let banks compete for your deposit",      minAmount: 50_000,     maxAmount: 10_000_000, minTerm: 3,  maxTerm: 60,  defaultTerm: 12,  defaultAmount: 500_000   },
  { type: "investment_account",label: "Investment",        icon: LineChart,  color: "text-sky-600",     iconBg: "bg-sky-50",        hint: "Managed investment portfolios — banks pitch their best product",    minAmount: 100_000,    maxAmount: 10_000_000, minTerm: 12, maxTerm: 60,  defaultTerm: 24,  defaultAmount: 500_000   },
  { type: "business_loan",     label: "Business Loan",     icon: Briefcase,  color: "text-indigo-600",  iconBg: "bg-indigo-50",     hint: "Corporate credit, expansion or acquisition financing",              minAmount: 500_000,    maxAmount: 50_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 60,  defaultAmount: 2_000_000 },
  { type: "credit_card",       label: "Credit Card",       icon: CreditCard, color: "text-pink-600",    iconBg: "bg-pink-50",       hint: "Compare card offers — cashback, rewards, travel benefits",          minAmount: 10_000,     maxAmount: 500_000,    minTerm: 12, maxTerm: 36,  defaultTerm: 12,  defaultAmount: 50_000    },
  { type: "leasing",           label: "Vehicle Leasing",   icon: Car,        color: "text-orange-600",  iconBg: "bg-orange-50",     hint: "Lease a car or commercial vehicle — banks compete on rates",        minAmount: 100_000,    maxAmount: 5_000_000,  minTerm: 12, maxTerm: 60,  defaultTerm: 36,  defaultAmount: 500_000   },
  { type: "overdraft",         label: "Overdraft",         icon: Banknote,   color: "text-red-600",     iconBg: "bg-red-50",        hint: "Flexible revolving credit facility for short-term needs",           minAmount: 20_000,     maxAmount: 2_000_000,  minTerm: 6,  maxTerm: 24,  defaultTerm: 12,  defaultAmount: 100_000   },
];

/* ─── Steps ──────────────────────────────────────────────── */
type Step = "product" | "details" | "purpose" | "review";

const STEPS: Step[] = ["product", "details", "purpose", "review"];
const STEP_LABELS = ["Product", "Amount & Term", "Purpose", "Review"];

/* ─── Helpers ────────────────────────────────────────────── */
function fmtMUR(n: number) {
  return `MUR ${new Intl.NumberFormat("en-MU").format(n)}`;
}

/* ─── Main wizard ────────────────────────────────────────── */
export default function NewRequest() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { intel } = useIntelligence();

  /* Gate */
  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.kycStatus !== "verified") { navigate("/onboarding/kyc",      { replace: true }); return; }
    if (!profile.hasDossier)               { navigate("/onboarding/dossier", { replace: true }); }
  }, [profile, profileLoading, navigate]);

  const [step,        setStep]        = useState<Step>("product");
  const [product,     setProduct]     = useState<Product | null>(null);
  const [amount,      setAmount]      = useState(0);
  const [termMonths,  setTermMonths]  = useState(0);
  const [maxRate,     setMaxRate]     = useState<number | "">("");
  const [deadline,    setDeadline]    = useState("");
  const [purpose,     setPurpose]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  const stepIdx = STEPS.indexOf(step);

  const selectProduct = (p: Product) => {
    setProduct(p);
    setAmount(p.defaultAmount);
    setTermMonths(p.defaultTerm);
    setStep("details");
  };

  const submit = async () => {
    if (!product) return;
    setSubmitting(true);
    setError(null);
    const result = await createRequest({
      productType:         product.type,
      amount,
      purpose,
      preferredTermMonths: termMonths,
      maxRate:             maxRate !== "" ? Number(maxRate) : undefined,
      decisionDeadline:    deadline || undefined,
    });
    if (!result.ok) { setError(result.error); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  if (profileLoading) return null;

  /* ── Success ── */
  if (submitted) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-5">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="font-display text-3xl font-bold text-ink mb-2">Request posted!</h2>
        <p className="text-muted text-[15px]">Banks are already reviewing your request. You'll be notified when bids arrive.</p>
        <p className="text-muted text-[13px] mt-2">Redirecting to dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-[160px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cream to-transparent" />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-[680px] mx-auto w-full px-5 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors no-underline">
            <ArrowLeft size={15} /> Back
          </Link>
          {/* Privacy pill */}
          <div className="flex items-center gap-1.5 bg-white/[0.08] border border-white/10 rounded-pill px-3 py-1.5">
            <Lock size={11} className="text-white/50" />
            <span className="text-[11px] text-white/50 font-medium">Anonymous to banks</span>
          </div>
        </div>

        <h1 className="font-display text-[28px] font-extrabold text-white leading-tight mb-6">
          New request
        </h1>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={[
                "w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold flex-shrink-0 transition-all",
                i < stepIdx  ? "bg-emerald-500 text-white" :
                i === stepIdx ? "bg-ficium text-white" :
                "bg-white/15 text-white/40"
              ].join(" ")}>
                {i < stepIdx ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span className={`text-[11px] font-semibold hidden sm:block ${i === stepIdx ? "text-white" : "text-white/40"}`}>
                {STEP_LABELS[i]}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < stepIdx ? "bg-emerald-500/60" : "bg-white/15"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 max-w-[680px] mx-auto w-full px-5 pb-32">

        {/* ── Step 1: Product ── */}
        {step === "product" && (
          <div>
            <p className="text-[14px] text-muted mb-5">What are you looking for?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRODUCTS.map((p) => {
                const rates = intel?.marketRates.find((r: { product_type: string }) => r.product_type === p.type);
                const Icon  = p.icon;
                return (
                  <button
                    key={p.type}
                    onClick={() => selectProduct(p)}
                    className="bg-white border border-ink/[0.06] rounded-2xl p-5 text-left hover:border-ficium/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center ${p.iconBg}`}>
                        <Icon size={18} className={p.color} />
                      </div>
                      {rates && (
                        <div className="flex items-center gap-1 bg-ficium/[0.06] px-2 py-1 rounded-pill">
                          <BarChart2 size={10} className="text-ficium" />
                          <span className="text-[10px] font-bold text-ficium">{rates.avg_rate_pct}% avg</span>
                        </div>
                      )}
                    </div>
                    <div className="font-display text-[16px] font-bold text-ink mb-1">{p.label}</div>
                    <div className="text-[12px] text-muted leading-snug">{p.hint}</div>
                    <div className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-ficium opacity-0 group-hover:opacity-100 transition-opacity">
                      Select <ArrowRight size={12} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Amount & Term ── */}
        {step === "details" && product && (
          <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-6 space-y-6">

            {/* Market rate hint */}
            {(() => {
              const rates = intel?.marketRates.find((r: { product_type: string }) => r.product_type === product.type);
              const wins  = intel?.acceptanceIntel.find((a: { product_type: string; avg_winning_rate_pct: number; avg_winning_term_months: number }) => a.product_type === product.type);
              if (!rates) return null;
              return (
                <div className="flex items-start gap-3 bg-ficium/[0.04] border border-ficium/[0.12] rounded-xl px-4 py-3.5">
                  <BarChart2 size={15} className="text-ficium flex-shrink-0 mt-0.5" />
                  <div className="text-[13px] text-ink/75 leading-relaxed">
                    <span className="font-semibold text-ficium">Market data: </span>
                    Current {product.label.toLowerCase()} rates on Ficium average{" "}
                    <span className="font-bold text-ink">{rates.avg_rate_pct}%</span> APR
                    (range {rates.min_rate_pct}–{rates.max_rate_pct}%).
                    {wins && ` Winning bids average ${wins.avg_winning_rate_pct}% over ${wins.avg_winning_term_months} months.`}
                  </div>
                </div>
              );
            })()}

            {/* Amount slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[13px] font-semibold text-ink">Amount (MUR)</label>
                <span className="font-display text-[16px] font-bold text-ficium">{fmtMUR(amount)}</span>
              </div>
              <input
                type="range"
                min={product.minAmount}
                max={product.maxAmount}
                step={product.minAmount}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted mt-1">
                <span>{fmtMUR(product.minAmount)}</span>
                <span>{fmtMUR(product.maxAmount)}</span>
              </div>
              {/* Manual input */}
              <input
                type="number"
                value={amount}
                onChange={e => {
                  const v = Math.min(product.maxAmount, Math.max(product.minAmount, Number(e.target.value)));
                  setAmount(v);
                }}
                className="mt-2 w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] font-bold text-ink outline-none focus:border-ficium transition-colors"
              />
            </div>

            {/* Term slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[13px] font-semibold text-ink">Term</label>
                <span className="font-display text-[16px] font-bold text-ficium">
                  {termMonths >= 12
                    ? `${Math.floor(termMonths / 12)}y${termMonths % 12 ? ` ${termMonths % 12}m` : ""}`
                    : `${termMonths}m`}
                </span>
              </div>
              <input
                type="range"
                min={product.minTerm}
                max={product.maxTerm}
                step={product.minTerm <= 6 ? 3 : 12}
                value={termMonths}
                onChange={e => setTermMonths(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted mt-1">
                <span>{product.minTerm}mo</span>
                <span>{product.maxTerm}mo</span>
              </div>
            </div>

            {/* Optional: max rate */}
            <div>
              <label className="text-[13px] font-semibold text-ink block mb-1.5">
                Max acceptable rate % <span className="text-muted font-normal">(optional)</span>
              </label>
              <p className="text-[12px] text-muted mb-2">Banks won't bid above this. Leave blank for no limit.</p>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 12"
                value={maxRate}
                onChange={e => setMaxRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ficium transition-colors"
              />
            </div>

            {/* Optional: deadline */}
            <div>
              <label className="text-[13px] font-semibold text-ink block mb-1.5">
                Decision deadline <span className="text-muted font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ficium transition-colors"
              />
            </div>

            <StepNav
              onBack={() => setStep("product")}
              onNext={() => setStep("purpose")}
              nextDisabled={!amount || !termMonths}
            />
          </div>
        )}

        {/* ── Step 3: Purpose ── */}
        {step === "purpose" && product && (
          <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-6 space-y-5">
            <div>
              <label className="text-[13px] font-semibold text-ink block mb-1.5">
                What's this for?
              </label>
              <p className="text-[12px] text-muted mb-3">
                Banks see this — not your name. Be specific to attract better bids.
              </p>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                rows={4}
                placeholder={
                  product.type === "personal_loan"  ? "e.g. Consolidate existing credit card debt and fund home renovation" :
                  product.type === "sme_loan"       ? "e.g. Expand restaurant kitchen equipment for second branch opening" :
                  product.type === "fixed_deposit"  ? "e.g. Park 12-month savings at best available rate" :
                  product.type === "mortgage"       ? "e.g. Purchase 3-bedroom property in Tamarin" :
                  "Describe what you need this for…"
                }
                maxLength={500}
                className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-muted/60 outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/10 resize-none transition-all"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[11px] ${purpose.length > 450 ? "text-amber-500" : "text-muted"}`}>
                  {purpose.length}/500
                </span>
              </div>
            </div>

            <StepNav
              onBack={() => setStep("details")}
              onNext={() => setStep("review")}
              nextDisabled={purpose.trim().length < 10}
            />
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === "review" && product && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-ficium to-ficium-deep px-6 py-5">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Ready to post</div>
                <div className="font-display text-[22px] font-bold text-white">{product.label}</div>
              </div>

              {/* Details */}
              <div className="px-6 py-5 space-y-3">
                <ReviewRow label="Amount"   value={fmtMUR(amount)} />
                <ReviewRow label="Term"     value={`${termMonths} months`} />
                <ReviewRow label="Purpose"  value={purpose} />
                {maxRate !== "" && <ReviewRow label="Max rate" value={`${maxRate}% APR`} />}
                {deadline && <ReviewRow label="Deadline" value={new Date(deadline).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" })} />}
              </div>

              {/* Privacy note */}
              <div className="mx-6 mb-5 flex items-start gap-2.5 bg-ficium/[0.04] border border-ficium/[0.12] rounded-xl px-4 py-3">
                <Lock size={13} className="text-ficium flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-ink/70 leading-relaxed">
                  Your identity stays private. Banks see only the details above and bid anonymously.
                </p>
              </div>

              {error && (
                <div className="mx-6 mb-5 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[15px] disabled:opacity-60 shadow-ficium"
                >
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /> Posting…</>
                    : <><CheckCircle2 size={16} /> Post request</>
                  }
                </button>
                <button
                  onClick={() => setStep("purpose")}
                  disabled={submitting}
                  className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StepNav({ onBack, onNext, nextDisabled }: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onBack}
        className="px-5 py-3 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors"
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3 rounded-2xl transition-colors text-[14px] disabled:opacity-40 shadow-ficium"
      >
        Continue <ArrowRight size={15} />
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink/[0.05] last:border-0">
      <span className="text-[12px] text-muted font-medium w-20 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}
