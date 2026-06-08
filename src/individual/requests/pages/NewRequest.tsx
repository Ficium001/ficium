// =============================================================
// Ficium — New Request (Smart Stepped Wizard) v2
// Per-category question sets. Common profile fields asked once.
// Steps: product → details (category-specific) → review → submit
// =============================================================
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  { type: "personal_loan",      label: "Personal Loan",     icon: HandCoins,  color: "text-ficium",      iconBg: "bg-ficium/10",     hint: "For personal expenses, travel, education or debt consolidation", minAmount: 50_000,     maxAmount: 2_000_000,  minTerm: 12, maxTerm: 84,  defaultTerm: 36,  defaultAmount: 300_000   },
  { type: "sme_loan",           label: "SME Loan",          icon: Building2,  color: "text-violet-600",  iconBg: "bg-violet-50",     hint: "Working capital, equipment or growth funding for your business",   minAmount: 200_000,    maxAmount: 10_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 60,  defaultAmount: 1_000_000 },
  { type: "mortgage",           label: "Home Loan",         icon: Home,       color: "text-amber-600",   iconBg: "bg-amber-50",      hint: "Finance your property purchase or construction",                   minAmount: 500_000,    maxAmount: 20_000_000, minTerm: 60, maxTerm: 360, defaultTerm: 240, defaultAmount: 3_000_000 },
  { type: "fixed_deposit",      label: "Place a Deposit",   icon: PiggyBank,  color: "text-emerald-600", iconBg: "bg-emerald-50",    hint: "Lock in your savings and let providers compete for your deposit",  minAmount: 50_000,     maxAmount: 10_000_000, minTerm: 3,  maxTerm: 60,  defaultTerm: 12,  defaultAmount: 500_000   },
  { type: "investment_account", label: "Grow My Savings",   icon: LineChart,  color: "text-sky-600",     iconBg: "bg-sky-50",        hint: "Providers pitch their best savings and investment products",         minAmount: 100_000,    maxAmount: 10_000_000, minTerm: 12, maxTerm: 60,  defaultTerm: 24,  defaultAmount: 500_000   },
  { type: "business_loan",      label: "Business Loan",     icon: Briefcase,  color: "text-indigo-600",  iconBg: "bg-indigo-50",     hint: "Corporate credit, expansion or acquisition financing",              minAmount: 500_000,    maxAmount: 50_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 60,  defaultAmount: 2_000_000 },
  { type: "credit_card",        label: "Credit Card",       icon: CreditCard, color: "text-pink-600",    iconBg: "bg-pink-50",       hint: "Compare card offers — cashback, rewards, travel benefits",          minAmount: 10_000,     maxAmount: 500_000,    minTerm: 12, maxTerm: 36,  defaultTerm: 12,  defaultAmount: 50_000    },
  { type: "leasing",            label: "Vehicle Loan",      icon: Car,        color: "text-orange-600",  iconBg: "bg-orange-50",     hint: "Car or commercial vehicle financing — providers compete on rates",   minAmount: 100_000,    maxAmount: 5_000_000,  minTerm: 12, maxTerm: 60,  defaultTerm: 36,  defaultAmount: 500_000   },
  { type: "overdraft",          label: "Overdraft",         icon: Banknote,   color: "text-red-600",     iconBg: "bg-red-50",        hint: "Flexible revolving credit facility for short-term needs",           minAmount: 20_000,     maxAmount: 2_000_000,  minTerm: 6,  maxTerm: 24,  defaultTerm: 12,  defaultAmount: 100_000   },
];

/* ─── URL type → ProductType map ────────────────────────── */
const URL_TYPE_MAP: Record<string, ProductType> = {
  mortgage:   "mortgage",
  personal:   "personal_loan",
  credit:     "credit_card",
  vehicle:    "leasing",
  business:   "business_loan",
  education:  "personal_loan",
  deposit:    "fixed_deposit",
  savings:    "investment_account",
};

/* ─── Category-specific fields ──────────────────────────── */
type FieldDef = {
  key:         string;
  label:       string;
  type:        "select" | "text" | "number" | "date";
  options?:    string[];
  placeholder?: string;
  required?:   boolean;
  hint?:       string;
};

const CATEGORY_FIELDS: Partial<Record<ProductType, FieldDef[]>> = {
  mortgage: [
    { key: "property_value",  label: "Property value (MUR)",     type: "number",  placeholder: "e.g. 5000000",                                                required: true  },
    { key: "deposit_amount",  label: "Deposit available (MUR)",  type: "number",  placeholder: "e.g. 500000",                                                required: true  },
    { key: "property_location", label: "Property location",      type: "text",    placeholder: "e.g. Flic en Flac, Grand Baie",                               required: true  },
    { key: "property_type",   label: "Property type",            type: "select",  options: ["Apartment", "House", "Land + build", "Commercial"],              required: true  },
    { key: "purpose",         label: "Purpose",                  type: "select",  options: ["Purchase", "Construction", "Refinance"],                         required: true  },
  ],
  personal_loan: [
    { key: "purpose",         label: "Purpose",                  type: "text",    placeholder: "e.g. Debt consolidation, home renovation",                    required: true  },
    { key: "urgency",         label: "How soon do you need it?", type: "select",  options: ["Within 1 week", "Within 1 month", "1–3 months", "No rush"],      required: false },
  ],
  credit_card: [
    { key: "credit_limit",    label: "Desired credit limit (MUR)", type: "number", placeholder: "e.g. 50000",                                                 required: true  },
    { key: "primary_use",     label: "Primary use",              type: "select",  options: ["Everyday spend", "Travel", "Business expenses", "Online shopping"], required: true },
    { key: "existing_cards",  label: "Existing credit cards",    type: "select",  options: ["None", "1 card", "2 cards", "3 or more"],                        required: false },
  ],
  leasing: [
    { key: "vehicle_type",    label: "Vehicle type",             type: "select",  options: ["Car", "Motorcycle", "Van / pickup", "Commercial vehicle"],       required: true  },
    { key: "vehicle_condition", label: "New or used?",           type: "select",  options: ["New", "Used"],                                                   required: true  },
    { key: "vehicle_value",   label: "Vehicle value (MUR)",      type: "number",  placeholder: "e.g. 800000",                                                 required: true  },
    { key: "deposit_amount",  label: "Deposit available (MUR)",  type: "number",  placeholder: "e.g. 100000",                                                 required: false },
  ],
  business_loan: [
    { key: "business_type",   label: "Business type",            type: "select",  options: ["Sole trader", "SME", "Company / Ltd"],                           required: true  },
    { key: "years_operating", label: "Years in operation",       type: "select",  options: ["Less than 1 year", "1–2 years", "3–5 years", "5+ years"],        required: true  },
    { key: "annual_turnover", label: "Annual turnover (MUR)",    type: "number",  placeholder: "e.g. 5000000",                                                required: true  },
    { key: "loan_purpose",    label: "Loan purpose",             type: "select",  options: ["Working capital", "Equipment", "Expansion", "Property", "Other"], required: true },
  ],
  sme_loan: [
    { key: "business_type",   label: "Business type",            type: "select",  options: ["Sole trader", "SME", "Company / Ltd"],                           required: true  },
    { key: "years_operating", label: "Years in operation",       type: "select",  options: ["Less than 1 year", "1–2 years", "3–5 years", "5+ years"],        required: true  },
    { key: "annual_turnover", label: "Annual turnover (MUR)",    type: "number",  placeholder: "e.g. 5000000",                                                required: true  },
    { key: "loan_purpose",    label: "Loan purpose",             type: "select",  options: ["Working capital", "Equipment", "Expansion", "Property", "Other"], required: true },
  ],
  fixed_deposit: [
    { key: "term_preference", label: "Preferred term",           type: "select",  options: ["3 months", "6 months", "12 months", "24 months", "Flexible"],    required: true  },
    { key: "currency",        label: "Currency",                 type: "select",  options: ["MUR", "USD", "EUR", "GBP"],                                      required: true  },
    { key: "withdrawal",      label: "Withdrawal flexibility",   type: "select",  options: ["Fixed (no early withdrawal)", "Notice period", "Instant access"], required: true },
  ],
  investment_account: [
    { key: "monthly_contribution", label: "Monthly contribution (MUR)", type: "number", placeholder: "e.g. 10000 (optional)", required: false },
    { key: "investment_horizon",   label: "Investment horizon",         type: "select",  options: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],  required: true  },
    { key: "risk_appetite",        label: "Risk appetite",              type: "select",  options: ["Low — capital preservation", "Medium — balanced growth", "High — max returns"], required: true },
    { key: "liquidity",            label: "Can you lock funds away?",   type: "select",  options: ["Yes — fully locked", "Partial access needed", "Need full flexibility"], required: true },
  ],
};

/* ─── Common profile fields (asked once) ────────────────── */
const COMMON_FIELDS: FieldDef[] = [
  { key: "employment_status", label: "Employment status",      type: "select",  options: ["Salaried", "Self-employed", "Business owner", "Retired", "Other"], required: true },
  { key: "monthly_income",    label: "Monthly income (MUR)",   type: "number",  placeholder: "e.g. 50000",  required: true  },
  { key: "monthly_debt",      label: "Existing monthly debt obligations (MUR)", type: "number", placeholder: "e.g. 10000 (0 if none)", required: true, hint: "Car loans, personal loans, credit card minimums" },
];

/* ─── Steps ──────────────────────────────────────────────── */
type Step = "product" | "details" | "profile" | "review";
const STEPS: Step[] = ["product", "details", "profile", "review"];
const STEP_LABELS = ["Product", "Details", "Profile", "Review"];

function fmtMUR(n: number) {
  return `MUR ${new Intl.NumberFormat("en-MU").format(n)}`;
}

/* ─── Field renderer ─────────────────────────────────────── */
function FieldInput({ field, value, onChange }: {
  field:    FieldDef;
  value:    string;
  onChange: (v: string) => void;
}) {
  const base = "w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ficium transition-colors";
  if (field.type === "select") {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={base}>
        <option value="">Select…</option>
        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      type={field.type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  );
}

/* ─── Main wizard ────────────────────────────────────────── */
export default function NewRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { getRates, getWinningBid } = useIntelligence();

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.kycStatus === "pending") { navigate("/onboarding/kyc", { replace: true }); return; }
  }, [profile, profileLoading, navigate]);

  const [step,        setStep]        = useState<Step>("product");
  const [product,     setProduct]     = useState<Product | null>(null);
  const [amount,      setAmount]      = useState(0);
  const [termMonths,  setTermMonths]  = useState(0);
  const [maxRate,     setMaxRate]     = useState<number | "">("");
  const [deadline,    setDeadline]    = useState("");
  const [catAnswers,  setCatAnswers]  = useState<Record<string, string>>({});
  const [profAnswers, setProfAnswers] = useState<Record<string, string>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  const stepIdx = STEPS.indexOf(step);

  /* Pre-select from URL */
  useEffect(() => {
    const urlType = searchParams.get("type");
    if (!urlType) return;
    const productType = URL_TYPE_MAP[urlType];
    if (!productType) return;
    const matched = PRODUCTS.find(p => p.type === productType);
    if (matched) {
      setProduct(matched);
      setAmount(matched.defaultAmount);
      setTermMonths(matched.defaultTerm);
      setStep("details");
    }
  }, [searchParams]);

  const selectProduct = (p: Product) => {
    setProduct(p);
    setAmount(p.defaultAmount);
    setTermMonths(p.defaultTerm);
    setCatAnswers({});
    setStep("details");
  };

  /* Build purpose string from category answers */
  const buildPurpose = () => {
    const parts: string[] = [];
    const allAnswers = { ...catAnswers, ...profAnswers };
    for (const [k, v] of Object.entries(allAnswers)) {
      if (v) parts.push(`${k.replace(/_/g, " ")}: ${v}`);
    }
    return parts.join(" | ");
  };

  /* Validate current step's required fields */
  const catFields   = product ? (CATEGORY_FIELDS[product.type] ?? []) : [];
  const catValid    = catFields.filter(f => f.required).every(f => !!catAnswers[f.key]?.trim());
  const profValid   = COMMON_FIELDS.filter(f => f.required).every(f => !!profAnswers[f.key]?.trim());
  const detailValid = catValid && amount > 0 && termMonths > 0;

  const submit = async () => {
    if (!product) return;
    setSubmitting(true);
    setError(null);
    const result = await createRequest({
      productType:         product.type,
      amount,
      purpose:             buildPurpose(),
      preferredTermMonths: termMonths,
      maxRate:             maxRate !== "" ? Number(maxRate) : undefined,
      decisionDeadline:    deadline || undefined,
    });
    if (!result.ok) { setError(result.error); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  if (profileLoading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <Loader2 size={32} className="text-ficium animate-spin" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-5">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="font-display text-3xl font-bold text-ink mb-2">Request posted!</h2>
        <p className="text-muted text-[15px]">Providers are reviewing your request. You'll be notified when offers arrive.</p>
        <p className="text-muted text-[13px] mt-2">Redirecting to dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      <div className="absolute top-0 left-0 right-0 h-[160px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cream to-transparent" />
      </div>

      <div className="relative z-10 max-w-[680px] mx-auto w-full px-5 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors no-underline">
            <ArrowLeft size={15} /> Back
          </Link>
          <div className="flex items-center gap-1.5 bg-white/[0.08] border border-white/10 rounded-pill px-3 py-1.5">
            <Lock size={11} className="text-white/50" />
            <span className="text-[11px] text-white/50 font-medium">Anonymous to providers</span>
          </div>
        </div>

        <h1 className="font-display text-[28px] font-extrabold text-white leading-tight mb-6">New request</h1>

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

      <div className="relative z-10 flex-1 max-w-[680px] mx-auto w-full px-5 pb-32">

        {/* ── Step 1: Product ── */}
        {step === "product" && (
          <div>
            <p className="text-[14px] text-muted mb-5">What are you looking for?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRODUCTS.map(p => {
                const rates = getRates(p.type);
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

        {/* ── Step 2: Category-specific details ── */}
        {step === "details" && product && (
          <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-6 space-y-5">

            {/* Market rate hint */}
            {(() => {
              const rates = getRates(product.type);
              const wins  = getWinningBid(product.type);
              if (!rates) return null;
              return (
                <div className="flex items-start gap-3 bg-ficium/[0.04] border border-ficium/[0.12] rounded-xl px-4 py-3.5">
                  <BarChart2 size={15} className="text-ficium flex-shrink-0 mt-0.5" />
                  <div className="text-[13px] text-ink/75 leading-relaxed">
                    <span className="font-semibold text-ficium">Market: </span>
                    {product.label} rates average <span className="font-bold text-ink">{rates.avg_rate_pct}%</span> APR
                    (range {rates.min_rate_pct}–{rates.max_rate_pct}%).
                    {wins && ` Winning offers average ${wins.avg_winning_rate_pct}% over ${wins.avg_winning_term_months} months.`}
                  </div>
                </div>
              );
            })()}

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[13px] font-semibold text-ink">Amount (MUR)</label>
                <span className="font-display text-[16px] font-bold text-ficium">{fmtMUR(amount)}</span>
              </div>
              <input type="range" min={product.minAmount} max={product.maxAmount} step={product.minAmount} value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-[11px] text-muted mt-1">
                <span>{fmtMUR(product.minAmount)}</span><span>{fmtMUR(product.maxAmount)}</span>
              </div>
              <input type="number" value={amount} onChange={e => setAmount(Math.min(product.maxAmount, Math.max(product.minAmount, Number(e.target.value))))} className="mt-2 w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] font-bold text-ink outline-none focus:border-ficium transition-colors" />
            </div>

            {/* Term — hide for credit card and deposit */}
            {product.type !== "credit_card" && product.type !== "fixed_deposit" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-semibold text-ink">Term</label>
                  <span className="font-display text-[16px] font-bold text-ficium">
                    {termMonths >= 12 ? `${Math.floor(termMonths / 12)}y${termMonths % 12 ? ` ${termMonths % 12}m` : ""}` : `${termMonths}m`}
                  </span>
                </div>
                <input type="range" min={product.minTerm} max={product.maxTerm} step={product.minTerm <= 6 ? 3 : 12} value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-[11px] text-muted mt-1">
                  <span>{product.minTerm}mo</span><span>{product.maxTerm}mo</span>
                </div>
              </div>
            )}

            {/* Category-specific fields */}
            {catFields.map(field => (
              <div key={field.key}>
                <label className="text-[13px] font-semibold text-ink block mb-1.5">
                  {field.label} {!field.required && <span className="text-muted font-normal">(optional)</span>}
                </label>
                {field.hint && <p className="text-[12px] text-muted mb-2">{field.hint}</p>}
                <FieldInput
                  field={field}
                  value={catAnswers[field.key] ?? ""}
                  onChange={v => setCatAnswers(prev => ({ ...prev, [field.key]: v }))}
                />
              </div>
            ))}

            {/* Max rate — for loan products only */}
            {["personal_loan","mortgage","business_loan","sme_loan","leasing","overdraft"].includes(product.type) && (
              <div>
                <label className="text-[13px] font-semibold text-ink block mb-1.5">
                  Max acceptable rate % <span className="text-muted font-normal">(optional)</span>
                </label>
                <p className="text-[12px] text-muted mb-2">Providers won't respond above this. Leave blank for no limit.</p>
                <input type="number" step="0.1" placeholder="e.g. 12" value={maxRate} onChange={e => setMaxRate(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ficium transition-colors" />
              </div>
            )}

            {/* Deadline */}
            <div>
              <label className="text-[13px] font-semibold text-ink block mb-1.5">
                Decision deadline <span className="text-muted font-normal">(optional)</span>
              </label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ficium transition-colors" />
            </div>

            <StepNav onBack={() => setStep("product")} onNext={() => setStep("profile")} nextDisabled={!detailValid} />
          </div>
        )}

        {/* ── Step 3: Common profile fields ── */}
        {step === "profile" && (
          <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-6 space-y-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3">
              <Lock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-900 leading-relaxed">
                This information is never shared with providers. It's used to assess your readiness and match you with the right offers.
              </p>
            </div>

            {COMMON_FIELDS.map(field => (
              <div key={field.key}>
                <label className="text-[13px] font-semibold text-ink block mb-1.5">
                  {field.label} {!field.required && <span className="text-muted font-normal">(optional)</span>}
                </label>
                {field.hint && <p className="text-[12px] text-muted mb-2">{field.hint}</p>}
                <FieldInput
                  field={field}
                  value={profAnswers[field.key] ?? ""}
                  onChange={v => setProfAnswers(prev => ({ ...prev, [field.key]: v }))}
                />
              </div>
            ))}

            <StepNav onBack={() => setStep("details")} onNext={() => setStep("review")} nextDisabled={!profValid} />
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === "review" && product && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-ficium to-ficium-deep px-6 py-5">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Ready to post</div>
                <div className="font-display text-[22px] font-bold text-white">{product.label}</div>
              </div>

              <div className="px-6 py-5 space-y-3">
                <ReviewRow label="Amount"   value={fmtMUR(amount)} />
                {product.type !== "credit_card" && product.type !== "fixed_deposit" && (
                  <ReviewRow label="Term" value={`${termMonths} months`} />
                )}
                {Object.entries(catAnswers).filter(([,v]) => v).map(([k, v]) => (
                  <ReviewRow key={k} label={k.replace(/_/g, " ")} value={v} />
                ))}
                {Object.entries(profAnswers).filter(([,v]) => v).map(([k, v]) => (
                  <ReviewRow key={k} label={k.replace(/_/g, " ")} value={v} />
                ))}
                {maxRate !== "" && <ReviewRow label="Max rate" value={`${maxRate}% APR`} />}
                {deadline && <ReviewRow label="Deadline" value={new Date(deadline).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" })} />}
              </div>

              <div className="mx-6 mb-5 flex items-start gap-2.5 bg-ficium/[0.04] border border-ficium/[0.12] rounded-xl px-4 py-3">
                <Lock size={13} className="text-ficium flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-ink/70 leading-relaxed">
                  Your identity stays private. Providers see only your request details and respond anonymously.
                </p>
              </div>

              {error && (
                <div className="mx-6 mb-5 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              <div className="px-6 pb-6 flex gap-3">
                <button onClick={submit} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[15px] disabled:opacity-60 shadow-ficium">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : <><CheckCircle2 size={16} /> Post request</>}
                </button>
                <button onClick={() => setStep("profile")} disabled={submitting} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors">
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

function StepNav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onBack} className="px-5 py-3 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors">Back</button>
      <button onClick={onNext} disabled={nextDisabled} className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3 rounded-2xl transition-colors text-[14px] disabled:opacity-40 shadow-ficium">
        Continue <ArrowRight size={15} />
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink/[0.05] last:border-0">
      <span className="text-[12px] text-muted font-medium w-28 flex-shrink-0 capitalize">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}
