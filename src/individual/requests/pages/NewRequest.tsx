// =============================================================
// Ficium — New Request Wizard v3
// One question at a time, full-screen step per field
// =============================================================
import { useState, useEffect, useRef } from "react";
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
  type: ProductType; label: string; icon: React.ElementType;
  color: string; iconBg: string; hint: string;
  minAmount: number; maxAmount: number;
  minTerm: number; maxTerm: number;
  defaultTerm: number; defaultAmount: number;
};

const PRODUCTS: Product[] = [
  { type: "personal_loan",      label: "Personal Loan",   icon: HandCoins,  color: "text-ficium",      iconBg: "bg-ficium/10",    hint: "For personal expenses, travel, education or debt consolidation", minAmount: 50_000,     maxAmount: 2_000_000,  minTerm: 12, maxTerm: 84,  defaultTerm: 36,  defaultAmount: 300_000   },
  { type: "sme_loan",           label: "SME Loan",        icon: Building2,  color: "text-violet-600",  iconBg: "bg-violet-50",    hint: "Working capital, equipment or growth funding for your business",  minAmount: 200_000,    maxAmount: 10_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 60,  defaultAmount: 1_000_000 },
  { type: "mortgage",           label: "Home Loan",       icon: Home,       color: "text-amber-600",   iconBg: "bg-amber-50",     hint: "Finance your property purchase or construction",                  minAmount: 500_000,    maxAmount: 20_000_000, minTerm: 60, maxTerm: 360, defaultTerm: 240, defaultAmount: 3_000_000 },
  { type: "fixed_deposit",      label: "Place a Deposit", icon: PiggyBank,  color: "text-emerald-600", iconBg: "bg-emerald-50",   hint: "Lock in your savings and let providers compete for your deposit", minAmount: 50_000,     maxAmount: 10_000_000, minTerm: 3,  maxTerm: 60,  defaultTerm: 12,  defaultAmount: 500_000   },
  { type: "investment_account", label: "Grow My Savings", icon: LineChart,  color: "text-sky-600",     iconBg: "bg-sky-50",       hint: "Providers pitch their best savings and investment products",        minAmount: 100_000,    maxAmount: 10_000_000, minTerm: 12, maxTerm: 60,  defaultTerm: 24,  defaultAmount: 500_000   },
  { type: "business_loan",      label: "Business Loan",   icon: Briefcase,  color: "text-indigo-600",  iconBg: "bg-indigo-50",    hint: "Corporate credit, expansion or acquisition financing",             minAmount: 500_000,    maxAmount: 50_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 60,  defaultAmount: 2_000_000 },
  { type: "credit_card",        label: "Credit Card",     icon: CreditCard, color: "text-pink-600",    iconBg: "bg-pink-50",      hint: "Compare card offers — cashback, rewards, travel benefits",         minAmount: 10_000,     maxAmount: 500_000,    minTerm: 12, maxTerm: 36,  defaultTerm: 12,  defaultAmount: 50_000    },
  { type: "leasing",            label: "Vehicle Loan",    icon: Car,        color: "text-orange-600",  iconBg: "bg-orange-50",    hint: "Car or commercial vehicle — providers compete on rates",           minAmount: 100_000,    maxAmount: 5_000_000,  minTerm: 12, maxTerm: 60,  defaultTerm: 36,  defaultAmount: 500_000   },
  { type: "overdraft",          label: "Overdraft",       icon: Banknote,   color: "text-red-600",     iconBg: "bg-red-50",       hint: "Flexible revolving credit for short-term needs",                  minAmount: 20_000,     maxAmount: 2_000_000,  minTerm: 6,  maxTerm: 24,  defaultTerm: 12,  defaultAmount: 100_000   },
];

const URL_TYPE_MAP: Record<string, ProductType> = {
  mortgage: "mortgage", personal: "personal_loan", credit: "credit_card",
  vehicle: "leasing", business: "business_loan", education: "personal_loan",
  deposit: "fixed_deposit", savings: "investment_account",
};

/* ─── Question definition ───────────────────────────────── */
type QuestionType = "amount" | "term" | "select" | "text" | "number";
type Question = {
  key:          string;
  question:     string;
  subtext?:     string;
  type:         QuestionType;
  options?:     string[];
  placeholder?: string;
  required?:    boolean;
  min?:         number;
  max?:         number;
  step?:        number;
  unit?:        string;
};

/* ─── Per-product question sequences ────────────────────── */
const QUESTION_SETS: Partial<Record<ProductType, Question[]>> = {
  mortgage: [
    { key: "__amount",        question: "How much do you need?",                  subtext: "Total loan amount in MUR",                                          type: "amount"  },
    { key: "__term",          question: "Over how many years?",                   subtext: "Typical home loans run 15–25 years",                                type: "term"    },
    { key: "purpose",         question: "What's this for?",                       type: "select",  options: ["Purchase", "Construction", "Refinance"],           required: true  },
    { key: "property_type",   question: "What type of property?",                 type: "select",  options: ["Apartment", "House", "Land + build", "Commercial"],required: true  },
    { key: "property_location", question: "Where is the property?",              subtext: "Town or region",                                                    type: "text",    placeholder: "e.g. Flic en Flac, Grand Baie", required: true },
    { key: "property_value",  question: "What is the property value? (MUR)",      subtext: "Estimated market value",                                            type: "number",  placeholder: "e.g. 6000000", required: true },
    { key: "deposit_amount",  question: "How much deposit do you have? (MUR)",    subtext: "Leave 0 if none",                                                   type: "number",  placeholder: "e.g. 500000", required: true },
    { key: "employment_status", question: "What is your employment status?",      type: "select",  options: ["Salaried", "Self-employed", "Business owner", "Retired", "Other"], required: true },
    { key: "monthly_income",  question: "What is your monthly income? (MUR)",     subtext: "Net take-home pay",                                                 type: "number",  placeholder: "e.g. 50000", required: true },
    { key: "monthly_debt",    question: "Any existing monthly debt? (MUR)",       subtext: "Car loans, credit cards, other loans. Enter 0 if none",             type: "number",  placeholder: "0", required: true },
    { key: "max_rate",        question: "Maximum rate you'd accept? (%)",         subtext: "Providers won't respond above this. Skip if no limit",              type: "number",  placeholder: "e.g. 7", required: false },
  ],
  personal_loan: [
    { key: "__amount",        question: "How much do you need?",                  subtext: "Loan amount in MUR",                                                type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  subtext: "Repayment period",                                                  type: "term"    },
    { key: "purpose",         question: "What do you need it for?",               subtext: "Providers see this — not your name",                                type: "text",    placeholder: "e.g. Debt consolidation, home renovation", required: true },
    { key: "urgency",         question: "How soon do you need it?",               type: "select",  options: ["Within 1 week", "Within 1 month", "1–3 months", "No rush"], required: false },
    { key: "employment_status", question: "What is your employment status?",      type: "select",  options: ["Salaried", "Self-employed", "Business owner", "Retired", "Other"], required: true },
    { key: "monthly_income",  question: "What is your monthly income? (MUR)",     subtext: "Net take-home pay",                                                 type: "number",  placeholder: "e.g. 50000", required: true },
    { key: "monthly_debt",    question: "Any existing monthly debt? (MUR)",       subtext: "Car loans, credit cards, other loans. Enter 0 if none",             type: "number",  placeholder: "0", required: true },
    { key: "max_rate",        question: "Maximum rate you'd accept? (%)",         subtext: "Skip if no limit",                                                  type: "number",  placeholder: "e.g. 12", required: false },
  ],
  credit_card: [
    { key: "credit_limit",    question: "What credit limit do you want? (MUR)",   subtext: "Desired monthly limit",                                             type: "number",  placeholder: "e.g. 50000", required: true },
    { key: "primary_use",     question: "What will you use it for mainly?",       type: "select",  options: ["Everyday spend", "Travel", "Business expenses", "Online shopping"], required: true },
    { key: "existing_cards",  question: "Do you have existing credit cards?",     type: "select",  options: ["No cards", "1 card", "2 cards", "3 or more"],     required: false },
    { key: "employment_status", question: "What is your employment status?",      type: "select",  options: ["Salaried", "Self-employed", "Business owner", "Retired", "Other"], required: true },
    { key: "monthly_income",  question: "What is your monthly income? (MUR)",     type: "number",  placeholder: "e.g. 50000", required: true },
  ],
  leasing: [
    { key: "__amount",        question: "How much do you need to finance?",       subtext: "Loan amount in MUR",                                                type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  type: "term"    },
    { key: "vehicle_type",    question: "What type of vehicle?",                  type: "select",  options: ["Car", "Motorcycle", "Van / pickup", "Commercial vehicle"], required: true },
    { key: "vehicle_condition", question: "New or used?",                         type: "select",  options: ["New", "Used"],                                    required: true  },
    { key: "vehicle_value",   question: "What is the vehicle value? (MUR)",       type: "number",  placeholder: "e.g. 800000", required: true },
    { key: "deposit_amount",  question: "Deposit available? (MUR)",               subtext: "Enter 0 if none",                                                   type: "number",  placeholder: "0", required: true },
    { key: "employment_status", question: "What is your employment status?",      type: "select",  options: ["Salaried", "Self-employed", "Business owner", "Retired", "Other"], required: true },
    { key: "monthly_income",  question: "What is your monthly income? (MUR)",     type: "number",  placeholder: "e.g. 50000", required: true },
    { key: "monthly_debt",    question: "Any existing monthly debt? (MUR)",       subtext: "Enter 0 if none",                                                   type: "number",  placeholder: "0", required: true },
  ],
  business_loan: [
    { key: "__amount",        question: "How much does your business need?",      subtext: "Loan amount in MUR",                                                type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  type: "term"    },
    { key: "loan_purpose",    question: "What is the loan for?",                  type: "select",  options: ["Working capital", "Equipment", "Expansion", "Property acquisition", "Other"], required: true },
    { key: "business_type",   question: "What type of business?",                 type: "select",  options: ["Sole trader", "SME", "Company / Ltd", "Partnership"], required: true },
    { key: "years_operating", question: "How long have you been operating?",      type: "select",  options: ["Less than 1 year", "1–2 years", "3–5 years", "5+ years"], required: true },
    { key: "annual_turnover", question: "Annual turnover? (MUR)",                 subtext: "Most recent financial year",                                        type: "number",  placeholder: "e.g. 5000000", required: true },
    { key: "max_rate",        question: "Maximum rate you'd accept? (%)",         subtext: "Skip if no limit",                                                  type: "number",  placeholder: "e.g. 10", required: false },
  ],
  sme_loan: [
    { key: "__amount",        question: "How much does your business need?",      type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  type: "term"    },
    { key: "loan_purpose",    question: "What is the loan for?",                  type: "select",  options: ["Working capital", "Equipment", "Expansion", "Property acquisition", "Other"], required: true },
    { key: "business_type",   question: "What type of business?",                 type: "select",  options: ["Sole trader", "SME", "Company / Ltd", "Partnership"], required: true },
    { key: "years_operating", question: "How long have you been operating?",      type: "select",  options: ["Less than 1 year", "1–2 years", "3–5 years", "5+ years"], required: true },
    { key: "annual_turnover", question: "Annual turnover? (MUR)",                 type: "number",  placeholder: "e.g. 5000000", required: true },
  ],
  fixed_deposit: [
    { key: "__amount",        question: "How much do you want to deposit?",       subtext: "Amount in MUR",                                                     type: "amount"  },
    { key: "term_preference", question: "For how long?",                          type: "select",  options: ["3 months", "6 months", "12 months", "24 months", "Flexible"], required: true },
    { key: "currency",        question: "In which currency?",                     type: "select",  options: ["MUR", "USD", "EUR", "GBP"],                       required: true  },
    { key: "withdrawal",      question: "Do you need early access?",              type: "select",  options: ["No — fixed term", "Notice period acceptable", "Yes — instant access needed"], required: true },
  ],
  investment_account: [
    { key: "__amount",        question: "How much do you have to invest?",        subtext: "Initial amount in MUR",                                             type: "amount"  },
    { key: "monthly_contribution", question: "Monthly top-up? (MUR)",            subtext: "Optional — enter 0 if lump sum only",                               type: "number",  placeholder: "0", required: false },
    { key: "investment_horizon", question: "How long is your investment horizon?", type: "select", options: ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"], required: true },
    { key: "risk_appetite",   question: "What is your risk appetite?",            type: "select",  options: ["Low — preserve capital", "Medium — balanced growth", "High — maximise returns"], required: true },
    { key: "liquidity",       question: "Can you lock the funds away?",           type: "select",  options: ["Yes — fully locked", "Partial access needed", "Need full flexibility"], required: true },
  ],
};

/* ─── Helpers ────────────────────────────────────────────── */
function fmtMUR(n: number) {
  return `MUR ${new Intl.NumberFormat("en-MU").format(n)}`;
}

function buildPurpose(answers: Record<string, string>): string {
  return Object.entries(answers)
    .filter(([k, v]) => v && !k.startsWith("__") && k !== "max_rate")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join(" | ");
}

/* ─── Single question screen ─────────────────────────────── */
function QuestionScreen({
  question, product, answers, onAnswer, onBack, onSkip,
  questionNum, totalQuestions,
}: {
  question:        Question;
  product:         Product;
  answers:         Record<string, string>;
  onAnswer:        (key: string, value: string) => void;
  onBack:          () => void;
  onSkip?:         () => void;
  questionNum:     number;
  totalQuestions:  number;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const currentVal = answers[question.key] ?? "";
  const [localVal, setLocalVal] = useState(currentVal);

  useEffect(() => {
    setLocalVal(answers[question.key] ?? "");
    setTimeout(() => (inputRef.current as HTMLElement | null)?.focus(), 100);
  }, [question.key, answers]);

  // For amount/term: read from __amount/__term special keys
  const amountVal = Number(answers["__amount"] || product.defaultAmount);
  const termVal   = Number(answers["__term"]   || product.defaultTerm);

  const canContinue = question.required === false
    ? true
    : question.type === "amount" ? amountVal > 0
    : question.type === "term"   ? termVal > 0
    : !!localVal.trim();

  const handleContinue = () => {
    if (question.type === "amount") { onAnswer("__amount", String(amountVal)); return; }
    if (question.type === "term")   { onAnswer("__term",   String(termVal));   return; }
    onAnswer(question.key, localVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue && question.type !== "text") handleContinue();
  };

  const pct = Math.round((questionNum / totalQuestions) * 100);

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-[11px] text-muted mb-2">
          <span>{questionNum} of {totalQuestions}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1 bg-ink/[0.07] rounded-full overflow-hidden">
          <div className="h-full bg-ficium rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Question */}
      <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-2 leading-tight">
        {question.question}
      </h2>
      {question.subtext && (
        <p className="text-[13px] text-muted mb-6">{question.subtext}</p>
      )}
      {!question.subtext && <div className="mb-6" />}

      {/* Input */}
      <div className="flex-1">

        {/* Amount slider */}
        {question.type === "amount" && (
          <div className="space-y-4">
            <div className="text-[32px] font-display font-extrabold text-ficium">{fmtMUR(amountVal)}</div>
            <input type="range" min={product.minAmount} max={product.maxAmount} step={product.minAmount} value={amountVal}
              onChange={e => onAnswer("__amount", e.target.value)} className="w-full" />
            <div className="flex justify-between text-[11px] text-muted">
              <span>{fmtMUR(product.minAmount)}</span><span>{fmtMUR(product.maxAmount)}</span>
            </div>
            <input type="number" value={amountVal}
              onChange={e => onAnswer("__amount", String(Math.min(product.maxAmount, Math.max(product.minAmount, Number(e.target.value)))))}
              className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-3 text-[16px] font-bold text-ink outline-none focus:border-ficium transition-colors" />
          </div>
        )}

        {/* Term slider */}
        {question.type === "term" && (
          <div className="space-y-4">
            <div className="text-[32px] font-display font-extrabold text-ficium">
              {termVal >= 12
                ? `${Math.floor(termVal / 12)}y${termVal % 12 ? ` ${termVal % 12}m` : ""}`
                : `${termVal} months`}
            </div>
            <input type="range" min={product.minTerm} max={product.maxTerm} step={product.minTerm <= 6 ? 3 : 12} value={termVal}
              onChange={e => onAnswer("__term", e.target.value)} className="w-full" />
            <div className="flex justify-between text-[11px] text-muted">
              <span>{product.minTerm} mo</span><span>{product.maxTerm} mo</span>
            </div>
          </div>
        )}

        {/* Select options as big tap targets */}
        {question.type === "select" && (
          <div className="space-y-2">
            {question.options?.map(opt => (
              <button key={opt} onClick={() => { setLocalVal(opt); onAnswer(question.key, opt); }}
                className={[
                  "w-full text-left px-5 py-4 rounded-2xl border text-[14px] font-medium transition-all",
                  localVal === opt
                    ? "border-ficium bg-ficium/[0.05] text-ficium font-semibold"
                    : "border-ink/[0.10] bg-white text-ink hover:border-ink/30",
                ].join(" ")}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        {question.type === "text" && (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={question.placeholder}
            rows={3}
            className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-muted/50 outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/10 resize-none transition-all"
          />
        )}

        {/* Number input */}
        {question.type === "number" && (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={question.placeholder}
            className="w-full bg-cream border border-ink/10 rounded-xl px-5 py-4 text-[20px] font-bold text-ink placeholder:text-muted/40 placeholder:font-normal outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/10 transition-all"
          />
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors">
          Back
        </button>
        {!question.required && onSkip && question.type !== "amount" && question.type !== "term" && (
          <button onClick={onSkip} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors">
            Skip
          </button>
        )}
        {question.type !== "select" && (
          <button onClick={handleContinue} disabled={!canContinue}
            className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] disabled:opacity-40 shadow-ficium">
            Continue <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main wizard ────────────────────────────────────────── */
export default function NewRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { getRates } = useIntelligence();

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.kycStatus === "pending") { navigate("/onboarding/kyc", { replace: true }); return; }
  }, [profile, profileLoading, navigate]);

  const [product,    setProduct]    = useState<Product | null>(null);
  const [qIndex,     setQIndex]     = useState(0);
  const [answers,    setAnswers]    = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [stage,      setStage]      = useState<"product" | "questions" | "review">("product");

  const questions = product ? (QUESTION_SETS[product.type] ?? []) : [];
  const currentQ  = questions[qIndex];

  useEffect(() => {
    const urlType = searchParams.get("type");
    if (!urlType) return;
    const pt = URL_TYPE_MAP[urlType];
    if (!pt) return;
    const matched = PRODUCTS.find(p => p.type === pt);
    if (matched) {
      setProduct(matched);
      setAnswers({ __amount: String(matched.defaultAmount), __term: String(matched.defaultTerm) });
      setQIndex(0);
      setStage("questions");
    }
  }, [searchParams]);

  const selectProduct = (p: Product) => {
    setProduct(p);
    setAnswers({ __amount: String(p.defaultAmount), __term: String(p.defaultTerm) });
    setQIndex(0);
    setStage("questions");
  };

  const handleBack = () => {
    if (qIndex === 0) { navigate("/dashboard"); }
    else setQIndex(i => i - 1);
  };

  const advanceFromQ = () => {
    if (qIndex < questions.length - 1) setQIndex(i => i + 1);
    else setStage("review");
  };

  const handleSkip = () => {
    if (qIndex < questions.length - 1) setQIndex(i => i + 1);
    else setStage("review");
  };

  const submit = async () => {
    if (!product) return;
    setSubmitting(true); setError(null);
    const amount      = Number(answers["__amount"] || product.defaultAmount);
    const termMonths  = Number(answers["__term"]   || product.defaultTerm);
    const maxRateRaw  = answers["max_rate"];
    const result = await createRequest({
      productType:         product.type,
      amount,
      purpose:             buildPurpose(answers),
      preferredTermMonths: termMonths,
      maxRate:             maxRateRaw ? Number(maxRateRaw) : undefined,
    });
    if (!result.ok) { setError(result.error); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => navigate("/requests"), 2000);
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
        <h1 className="font-display text-[28px] font-extrabold text-white leading-tight mb-8">
          {stage === "product" ? "New request" : product?.label ?? "New request"}
        </h1>
      </div>

      <div className="relative z-10 flex-1 max-w-[680px] mx-auto w-full px-5 pb-32">

        {/* ── Product picker ── */}
        {stage === "product" && (
          <div>
            <p className="text-[14px] text-muted mb-5">What are you looking for?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRODUCTS.map(p => {
                const rates = getRates(p.type);
                const Icon  = p.icon;
                return (
                  <button key={p.type} onClick={() => selectProduct(p)}
                    className="bg-white border border-ink/[0.06] rounded-2xl p-5 text-left hover:border-ficium/30 hover:shadow-md transition-all group">
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

        {/* ── Question by question ── */}
        {stage === "questions" && product && currentQ && (
          <QuestionScreen
            question={currentQ}
            product={product}
            answers={answers}
            onAnswer={(key, value) => {
              const updated = { ...answers, [key]: value };
              setAnswers(updated);
              if (currentQ.type === "select") {
                if (qIndex < questions.length - 1) setTimeout(() => setQIndex(i => i + 1), 200);
                else setTimeout(() => setStage("review"), 200);
              } else if (currentQ.type === "amount" || currentQ.type === "term" || currentQ.type === "text" || currentQ.type === "number") {
                advanceFromQ();
              }
            }}
            onBack={handleBack}
            onSkip={!currentQ.required ? handleSkip : undefined}
            questionNum={qIndex + 1}
            totalQuestions={questions.length}
          />
        )}

        {/* ── Review ── */}
        {stage === "review" && product && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/[0.06] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-ficium to-ficium-deep px-6 py-5">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Ready to post</div>
                <div className="font-display text-[22px] font-bold text-white">{product.label}</div>
              </div>

              <div className="px-6 py-5 space-y-3">
                <ReviewRow label="Amount" value={fmtMUR(Number(answers["__amount"] || product.defaultAmount))} />
                {answers["__term"] && product.type !== "credit_card" && product.type !== "fixed_deposit" && (
                  <ReviewRow label="Term" value={`${answers["__term"]} months`} />
                )}
                {Object.entries(answers)
                  .filter(([k, v]) => v && !k.startsWith("__") && k !== "max_rate")
                  .map(([k, v]) => <ReviewRow key={k} label={k.replace(/_/g, " ")} value={v} />)
                }
                {answers["max_rate"] && <ReviewRow label="Max rate" value={`${answers["max_rate"]}% APR`} />}
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
                <button onClick={submit} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[15px] disabled:opacity-60 shadow-ficium">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : <><CheckCircle2 size={16} /> Post request</>}
                </button>
                <button onClick={() => { setStage("questions"); setQIndex(questions.length - 1); }} disabled={submitting}
                  className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors">
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink/[0.05] last:border-0">
      <span className="text-[12px] text-muted font-medium w-32 flex-shrink-0 capitalize">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}
