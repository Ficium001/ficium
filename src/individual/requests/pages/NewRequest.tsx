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
  TrendingUp, Layers, CalendarDays, Landmark, Globe, Sparkles,
} from "lucide-react";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { createRequest, createMultiProductRequest, type ProductType, type AllocationMode } from "../api/requests";
import { createInvitation } from "@/individual/couple/api/couple";
import { Users } from "lucide-react";
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
  { type: "equities",           label: "Listed Shares",   icon: TrendingUp, color: "text-teal-600",    iconBg: "bg-teal-50",      hint: "Invest in SEM-listed companies — institutions compete on fees and access", minAmount: 25_000,  maxAmount: 10_000_000, minTerm: 6,  maxTerm: 120, defaultTerm: 12,  defaultAmount: 100_000   },
  { type: "unit_trust",         label: "Unit Trusts",     icon: Layers,     color: "text-cyan-600",    iconBg: "bg-cyan-50",      hint: "FSC-regulated collective investment schemes — diversified portfolios",      minAmount: 10_000,  maxAmount: 10_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 36,  defaultAmount: 100_000   },
  { type: "savings_plan",       label: "Monthly Plan",    icon: CalendarDays, color: "text-emerald-700", iconBg: "bg-emerald-50", hint: "Systematic monthly investment — set a target and let providers compete",   minAmount: 2_000,   maxAmount: 200_000,    minTerm: 12, maxTerm: 120, defaultTerm: 36,  defaultAmount: 5_000     },
  { type: "government_bonds",   label: "Gov Bonds",       icon: Landmark,   color: "text-lime-700",    iconBg: "bg-lime-50",      hint: "Treasury bills and government securities — capital-protected returns",      minAmount: 50_000,  maxAmount: 20_000_000, minTerm: 3,  maxTerm: 120, defaultTerm: 24,  defaultAmount: 250_000   },
  { type: "offshore_investment",label: "Offshore",        icon: Globe,      color: "text-sky-600",     iconBg: "bg-sky-50",       hint: "International exposure through Mauritius's global financial centre",        minAmount: 50_000,  maxAmount: 50_000_000, minTerm: 12, maxTerm: 120, defaultTerm: 36,  defaultAmount: 500_000   },
];

const URL_TYPE_MAP: Record<string, ProductType> = {
  mortgage: "mortgage", personal: "personal_loan", credit: "credit_card",
  vehicle: "leasing", business: "business_loan", education: "personal_loan", renovation: "personal_loan",
  deposit: "fixed_deposit", savings: "investment_account",
  equities: "equities", shares: "equities",
  unit_trust: "unit_trust", funds: "unit_trust",
  savings_plan: "savings_plan", monthly: "savings_plan",
  government_bonds: "government_bonds", bonds: "government_bonds",
  offshore: "offshore_investment", offshore_investment: "offshore_investment",
};

/* ─── "Not sure what fits?" risk quiz ───────────────────────
   Scoped to product types that are fully wired end-to-end on the
   institution side (catalog.product row + dedicated pipeline template) —
   see ficium-portal-api migrations from Jul 2026. `savings_plan` is
   deliberately excluded: catalog.product_id_for_app_type() has no mapping
   for it yet and it silently falls through to personal_loan. Don't add it
   here until that's fixed. */
type RiskBucket = "preservation" | "balanced" | "growth";

const BUCKET_LABEL: Record<RiskBucket, string> = {
  preservation: "Capital Preservation",
  balanced:     "Balanced",
  growth:       "Growth",
};

const BUCKET_BLURB: Record<RiskBucket, string> = {
  preservation: "You'd rather protect what you have than chase higher returns.",
  balanced:     "You're comfortable with some ups and downs for better long-term growth.",
  growth:       "You're investing for the long run and can ride out volatility.",
};

const BUCKET_PRODUCTS: Record<RiskBucket, ProductType[]> = {
  preservation: ["fixed_deposit", "government_bonds"],
  balanced:     ["unit_trust", "investment_account"],
  growth:       ["equities", "offshore_investment"],
};

type QuizQuestion = {
  key:      "horizon" | "risk_tolerance" | "liquidity";
  question: string;
  subtext?: string;
  options:  { label: string; score: number }[];
};

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "horizon",
    question: "How long can you leave this money invested?",
    subtext: "Your investment horizon",
    options: [
      { label: "Under 1 year", score: 1 },
      { label: "1–5 years", score: 2 },
      { label: "5+ years", score: 3 },
    ],
  },
  {
    key: "risk_tolerance",
    question: "If your investment dropped 15% in a year, what would you do?",
    subtext: "There's no wrong answer — this just shapes what we show you",
    options: [
      { label: "Move it somewhere safer", score: 1 },
      { label: "Wait it out", score: 2 },
      { label: "See it as a buying opportunity", score: 3 },
    ],
  },
  {
    key: "liquidity",
    question: "Do you need to be able to access these funds quickly?",
    subtext: "Liquidity need",
    options: [
      { label: "Yes — I may need it any time", score: 1 },
      { label: "Occasionally, with some notice", score: 2 },
      { label: "No — this is money I can lock away", score: 3 },
    ],
  },
];

function scoreToBucket(total: number): RiskBucket {
  if (total <= 4) return "preservation";
  if (total <= 6) return "balanced";
  return "growth";
}

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
  ],
  personal_loan: [
    { key: "__amount",        question: "How much do you need?",                  subtext: "Loan amount in MUR",                                                type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  subtext: "Repayment period",                                                  type: "term"    },
    { key: "purpose",         question: "What do you need it for?",               subtext: "Providers see this — not your name",                                type: "text",    placeholder: "e.g. Debt consolidation, home renovation", required: true },
    { key: "urgency",         question: "How soon do you need it?",               type: "select",  options: ["Within 1 week", "Within 1 month", "1–3 months", "No rush"], required: false },
  ],
  credit_card: [
    { key: "credit_limit",    question: "What credit limit do you want? (MUR)",   subtext: "Desired monthly limit",                                             type: "number",  placeholder: "e.g. 50000", required: true },
    { key: "primary_use",     question: "What will you use it for mainly?",       type: "select",  options: ["Everyday spend", "Travel", "Business expenses", "Online shopping"], required: true },
    { key: "existing_cards",  question: "Do you have existing credit cards?",     type: "select",  options: ["No cards", "1 card", "2 cards", "3 or more"],     required: false },
  ],
  leasing: [
    { key: "__amount",        question: "How much do you need to finance?",       subtext: "Loan amount in MUR",                                                type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  type: "term"    },
    { key: "vehicle_type",    question: "What type of vehicle?",                  type: "select",  options: ["Car", "Motorcycle", "Van / pickup", "Commercial vehicle"], required: true },
    { key: "vehicle_condition", question: "New or used?",                         type: "select",  options: ["New", "Used"],                                    required: true  },
    { key: "vehicle_value",   question: "What is the vehicle value? (MUR)",       type: "number",  placeholder: "e.g. 800000", required: true },
    { key: "deposit_amount",  question: "Deposit available? (MUR)",               subtext: "Enter 0 if none",                                                   type: "number",  placeholder: "0", required: true },
  ],
  business_loan: [
    { key: "__amount",        question: "How much does your business need?",      subtext: "Loan amount in MUR",                                                type: "amount"  },
    { key: "__term",          question: "Over how many months?",                  type: "term"    },
    { key: "loan_purpose",    question: "What is the loan for?",                  type: "select",  options: ["Working capital", "Equipment", "Expansion", "Property acquisition", "Other"], required: true },
    { key: "business_type",   question: "What type of business?",                 type: "select",  options: ["Sole trader", "SME", "Company / Ltd", "Partnership"], required: true },
    { key: "years_operating", question: "How long have you been operating?",      type: "select",  options: ["Less than 1 year", "1–2 years", "3–5 years", "5+ years"], required: true },
    { key: "annual_turnover", question: "Annual turnover? (MUR)",                 subtext: "Most recent financial year",                                        type: "number",  placeholder: "e.g. 5000000", required: true },
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
  equities: [
    { key: "__amount",        question: "How much do you want to invest in shares?", subtext: "Initial amount in MUR",                                          type: "amount"  },
    { key: "market_focus",    question: "Which markets interest you?",            type: "select",  options: ["SEM (Mauritius)", "Pan-Africa", "Global", "Mixed"], required: true },
    { key: "investment_style",question: "What's your investment style?",          type: "select",  options: ["Buy and hold long-term", "Active trading", "Dividend income", "Growth"], required: true },
    { key: "risk_appetite",   question: "What is your risk appetite?",            type: "select",  options: ["Low — blue-chip only", "Medium — balanced portfolio", "High — growth stocks"], required: true },
    { key: "investment_horizon", question: "What is your investment horizon?",    type: "select",  options: ["Under 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"], required: true },
    { key: "sector_preference", question: "Any sector preference?",              subtext: "Optional",                                                           type: "text",    placeholder: "e.g. Banking, tourism, technology", required: false },
  ],
  unit_trust: [
    { key: "__amount",        question: "How much do you want to invest?",        subtext: "Initial lump sum in MUR",                                           type: "amount"  },
    { key: "monthly_contribution", question: "Monthly top-up? (MUR)",            subtext: "Optional — enter 0 for lump sum only",                              type: "number",  placeholder: "0", required: false },
    { key: "fund_type",       question: "What type of fund?",                    type: "select",  options: ["Equity fund", "Bond fund", "Balanced fund", "Money market", "No preference"], required: true },
    { key: "risk_appetite",   question: "What is your risk appetite?",            type: "select",  options: ["Low — capital preservation", "Medium — balanced growth", "High — maximum returns"], required: true },
    { key: "investment_horizon", question: "How long can you stay invested?",     type: "select",  options: ["1–2 years", "3–5 years", "5–10 years", "10+ years"], required: true },
    { key: "distribution",    question: "How do you want returns paid?",          type: "select",  options: ["Reinvested (accumulation)", "Paid out regularly (income)"], required: true },
  ],
  savings_plan: [
    { key: "__amount",        question: "How much can you save each month?",      subtext: "Monthly contribution in MUR",                                       type: "amount"  },
    { key: "target_amount",   question: "What is your savings target? (MUR)",    subtext: "Your goal amount",                                                   type: "number",  placeholder: "e.g. 1000000", required: true },
    { key: "target_years",    question: "When do you want to reach your target?", type: "select",  options: ["1–2 years", "3–5 years", "5–10 years", "10–15 years", "15+ years"], required: true },
    { key: "objective",       question: "What are you saving for?",              type: "select",  options: ["Retirement", "Children's education", "Buy property", "Emergency fund", "Wealth building", "Other"], required: true },
    { key: "flexibility",     question: "Do you need to be able to pause or withdraw?", type: "select", options: ["Yes — need flexibility", "No — I can commit monthly", "Partial flexibility"], required: true },
  ],
  government_bonds: [
    { key: "__amount",        question: "How much do you want to invest in bonds?", subtext: "Amount in MUR",                                                   type: "amount"  },
    { key: "maturity",        question: "What maturity do you prefer?",           type: "select",  options: ["Short-term (under 2 years)", "Medium-term (2–7 years)", "Long-term (7+ years)", "No preference"], required: true },
    { key: "income_preference", question: "How do you want income paid?",        type: "select",  options: ["Regular coupon payments", "Zero-coupon (lump sum at maturity)", "No preference"], required: true },
    { key: "currency",        question: "In which currency?",                    type: "select",  options: ["MUR", "USD", "EUR", "GBP", "Mixed"],               required: true  },
    { key: "rollover",        question: "At maturity, would you reinvest?",      type: "select",  options: ["Yes — auto-reinvest", "No — return funds", "Undecided"], required: false },
  ],
  offshore_investment: [
    { key: "__amount",        question: "How much do you want to invest offshore?", subtext: "Amount in MUR equivalent",                                        type: "amount"  },
    { key: "currency",        question: "Preferred currency?",                   type: "select",  options: ["USD", "EUR", "GBP", "Mixed / No preference"],       required: true  },
    { key: "geography",       question: "Which regions interest you?",           type: "select",  options: ["Africa", "Europe", "USA / North America", "Asia-Pacific", "Emerging markets", "Global diversified"], required: true },
    { key: "asset_class",     question: "What asset class?",                     type: "select",  options: ["Equities", "Bonds", "Multi-asset fund", "Real estate", "Private equity", "No preference"], required: true },
    { key: "risk_appetite",   question: "What is your risk appetite?",           type: "select",  options: ["Low — capital preservation", "Medium — balanced", "High — growth"], required: true },
    { key: "investment_horizon", question: "What is your investment horizon?",   type: "select",  options: ["1–3 years", "3–5 years", "5–10 years", "10+ years"], required: true },
  ],
};

/* ─── Helpers ────────────────────────────────────────────── */
function fmtMUR(n: number) {
  return `MUR ${new Intl.NumberFormat("en-MU").format(n)}`;
}

function buildPurpose(answers: Record<string, string>): string {
  return Object.entries(answers)
    .filter(([k, v]) => v && !k.startsWith("__"))
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join(" | ");
}

/* ─── Single question screen ─────────────────────────────── */
function QuestionScreen({
  question, product, answers, onAnswer, onAdvance, onBack, onSkip,
  questionNum, totalQuestions,
}: {
  question:        Question;
  product:         Product;
  answers:         Record<string, string>;
  onAnswer:        (key: string, value: string) => void;
  onAdvance:       () => void;
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
    if (question.type === "amount") { onAnswer("__amount", String(amountVal)); onAdvance(); return; }
    if (question.type === "term")   { onAnswer("__term",   String(termVal));   onAdvance(); return; }
    onAnswer(question.key, localVal);
    onAdvance();
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
              className="w-full bg-surface border border-ink/10 rounded-xl px-4 py-3 text-[16px] font-bold text-ink outline-hidden focus:border-ficium transition-colors" />
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
                    ? "border-ficium bg-ficium/5 text-ficium font-semibold"
                    : "border-ink/10 bg-white text-ink hover:border-ink/30",
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
            className="w-full bg-surface border border-ink/10 rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-muted/50 outline-hidden focus:border-ficium focus:ring-2 focus:ring-ficium/10 resize-none transition-all"
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
            className="w-full bg-surface border border-ink/10 rounded-xl px-5 py-4 text-[20px] font-bold text-ink placeholder:text-muted/40 placeholder:font-normal outline-hidden focus:border-ficium focus:ring-2 focus:ring-ficium/10 transition-all"
          />
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
          Back
        </button>
        {!question.required && onSkip && question.type !== "amount" && question.type !== "term" && (
          <button onClick={onSkip} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
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
  const [stage,      setStage]      = useState<"product" | "quiz_contrib" | "quiz" | "monthly_only" | "both_notice" | "recommend" | "allocate" | "questions" | "review">("product");
  const [isJoint,      setIsJoint]      = useState(false);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [inviteNote,   setInviteNote]   = useState<string | null>(null);
  const [deadlineDays, setDeadlineDays] = useState(14);

  // "Not sure what fits?" quiz state
  const [monthlyAmount, setMonthlyAmount] = useState(5_000);
  const [quizStep,    setQuizStep]    = useState(0);
  const [quizScores,  setQuizScores]  = useState<Partial<Record<QuizQuestion["key"], number>>>({});
  const [quizAmount,  setQuizAmount]  = useState(300_000);
  const [bucket,      setBucket]      = useState<RiskBucket | null>(null);

  // Multi-select recommendation + allocation state
  const [selectedTypes,  setSelectedTypes]  = useState<ProductType[]>([]);
  const [showAddPicker,  setShowAddPicker]  = useState(false);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("client_specified");
  const [lineAmounts,    setLineAmounts]    = useState<Record<string, number>>({});
  const [multiPurpose,   setMultiPurpose]   = useState("");
  const [multiTermMonths,setMultiTermMonths]= useState(24);

  const toggleProduct = (type: ProductType) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  // Any of the products already wired end-to-end (own catalog/pipeline) are
  // fair game to add manually, not just the ones the quiz recommended.
  const ADDABLE_PRODUCT_TYPES: ProductType[] = [
    "fixed_deposit", "investment_account", "equities", "unit_trust",
    "government_bonds", "offshore_investment", "savings_plan",
  ];

  const proceedFromRecommend = () => {
    if (selectedTypes.length === 0) return;
    if (selectedTypes.length === 1) {
      const p = PRODUCTS.find(p => p.type === selectedTypes[0])!;
      selectRecommended(p);
      return;
    }
    const base = Math.floor(quizAmount / selectedTypes.length / 1000) * 1000;
    const remainder = quizAmount - base * (selectedTypes.length - 1);
    const evenSplit = Object.fromEntries(
      selectedTypes.map((t, i) => [t, i === selectedTypes.length - 1 ? remainder : base])
    );
    setLineAmounts(evenSplit);
    setAllocationMode("client_specified");
    setStage("allocate");
  };

  const lineAmountSum = selectedTypes.reduce((sum, t) => sum + (lineAmounts[t] || 0), 0);
  const allocationValid = allocationMode === "institution_decides" || lineAmountSum === quizAmount;

  const submitMultiProduct = async () => {
    setSubmitting(true); setError(null);
    const decisionDeadline = new Date(Date.now() + deadlineDays * 86_400_000).toISOString();
    const result = await createMultiProductRequest({
      totalAmount:          quizAmount,
      purpose:              multiPurpose,
      preferredTermMonths:  multiTermMonths,
      decisionDeadline,
      allocationMode,
      allocations: selectedTypes.map(t => ({
        productType: t,
        amount: allocationMode === "client_specified" ? (lineAmounts[t] ?? null) : null,
      })),
    });
    if (!result.ok) { setError(result.error); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => navigate("/requests"), 2500);
  };

  const startQuiz = () => { setSelectedTypes([]); setShowAddPicker(false); setStage("quiz_contrib"); };

  const chooseContrib = (type: "lump_sum" | "monthly" | "both") => {
    if (type === "lump_sum") { setQuizStep(0); setQuizScores({}); setStage("quiz"); }
    else if (type === "monthly") { setStage("monthly_only"); }
    else { setStage("both_notice"); }
  };

  // Monthly-only path has exactly one fitting product today (Monthly Plan /
  // savings_plan) — no risk quiz needed, go straight to its own question flow.
  const continueMonthlyOnly = () => {
    const savingsPlan = PRODUCTS.find(p => p.type === "savings_plan")!;
    setProduct(savingsPlan);
    setAnswers({ __amount: String(monthlyAmount), __term: String(savingsPlan.defaultTerm), contribution_type: "Monthly" });
    setQIndex(0);
    setStage("questions");
  };

  const answerQuiz = (key: QuizQuestion["key"], score: number) => {
    const next = { ...quizScores, [key]: score };
    setQuizScores(next);
    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setQuizStep(s => s + 1), 200);
    } else {
      const total = Object.values(next).reduce((a, b) => a + (b ?? 0), 0);
      setBucket(scoreToBucket(total));
      setTimeout(() => setStage("recommend"), 200);
    }
  };

  // From the recommendation screen: jump into that product's own question
  // flow with the quiz amount pre-filled as a starting point (still editable —
  // per-product min/max amounts differ, so it's clamped there, not here).
  const selectRecommended = (p: Product) => {
    setProduct(p);
    setAnswers({ __amount: String(quizAmount), __term: String(p.defaultTerm), contribution_type: "Lump sum" });
    setQIndex(0);
    setStage("questions");
  };

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
    const decisionDeadline = new Date(Date.now() + deadlineDays * 86_400_000).toISOString();
    const result = await createRequest({
      productType:         product.type,
      amount,
      purpose:             buildPurpose(answers),
      preferredTermMonths: termMonths,
      decisionDeadline,
    });
    if (!result.ok) { setError(result.error); setSubmitting(false); return; }

    if (isJoint && partnerEmail.trim()) {
      const inviteResult = await createInvitation({
        requestId: result.requestId,
        invitedEmail: partnerEmail.trim(),
      });
      setInviteNote(
        inviteResult.ok
          ? `Invitation sent to ${partnerEmail.trim()}.`
          : `Request posted, but the invite couldn't be sent: ${inviteResult.error}. You can invite your partner from the request page.`,
      );
    }

    setSubmitted(true);
    setTimeout(() => navigate("/requests"), 2500);
  };

  if (profileLoading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <Loader2 size={32} className="text-ficium animate-spin" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="font-display text-3xl font-bold text-ink mb-2">Request posted!</h2>
        <p className="text-muted text-[15px]">Providers are reviewing your request. You'll be notified when offers arrive.</p>
        {inviteNote && <p className="text-ficium text-[13px] mt-3 font-medium max-w-xs mx-auto">{inviteNote}</p>}
        <p className="text-muted text-[13px] mt-2">Redirecting to dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-[160px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-paper to-transparent" />
      </div>

      <div className="relative z-10 max-w-[680px] mx-auto w-full px-5 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors no-underline">
            <ArrowLeft size={15} /> Back
          </Link>
          <div className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-pill px-3 py-1.5">
            <Lock size={11} className="text-white/50" />
            <span className="text-[11px] text-white/50 font-medium">Anonymous to providers</span>
          </div>
        </div>
        <h1 className="font-display text-[28px] font-extrabold text-white leading-tight mb-8">
          {stage === "product"     ? "New request"
            : stage === "quiz_contrib" ? "Quick questions"
            : stage === "quiz"        ? "Quick questions"
            : stage === "monthly_only" ? "Quick questions"
            : stage === "both_notice"  ? "Quick questions"
            : stage === "recommend"   ? "Your recommendation"
            : stage === "allocate"   ? "Split your investment"
            : product?.label ?? "New request"}
        </h1>
      </div>

      <div className="relative z-10 flex-1 max-w-[680px] mx-auto w-full px-5 pb-32">

        {/* ── Product picker ── */}
        {stage === "product" && (
          <div>
            <button
              type="button"
              onClick={startQuiz}
              className="w-full flex items-center gap-3 bg-white border border-ficium/20 rounded-2xl px-5 py-4 mb-5 text-left hover:border-ficium/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-ficium/10 grid place-items-center shrink-0">
                <Sparkles size={18} className="text-ficium" />
              </div>
              <div className="flex-1">
                <div className="font-display text-[14px] font-bold text-ink">Not sure what fits?</div>
                <div className="text-[12px] text-muted">Answer 3 quick questions and we'll point you to the right investment options</div>
              </div>
              <ArrowRight size={15} className="text-ficium opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>

            <p className="text-[14px] text-muted mb-5">What are you looking for?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRODUCTS.map(p => {
                const rates = getRates(p.type);
                const Icon  = p.icon;
                return (
                  <button key={p.type} onClick={() => selectProduct(p)}
                    className="bg-white border border-ink/6 rounded-2xl p-5 text-left hover:border-ficium/30 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center ${p.iconBg}`}>
                        <Icon size={18} className={p.color} />
                      </div>
                      {rates && (
                        <div className="flex items-center gap-1 bg-ficium/6 px-2 py-1 rounded-pill">
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

        {/* ── Step 0: how do you want to invest? ── */}
        {stage === "quiz_contrib" && (
          <div>
            <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-2 leading-tight">How do you want to invest?</h2>
            <p className="text-[13px] text-muted mb-6">This decides which questions we ask next</p>
            <div className="space-y-2">
              <button onClick={() => chooseContrib("lump_sum")} className="w-full text-left px-5 py-4 rounded-2xl border border-ink/10 bg-white text-ink text-[14px] font-medium hover:border-ficium/30 transition-all">
                A fixed amount, one-time
              </button>
              <button onClick={() => chooseContrib("monthly")} className="w-full text-left px-5 py-4 rounded-2xl border border-ink/10 bg-white text-ink text-[14px] font-medium hover:border-ficium/30 transition-all">
                Monthly contributions only
              </button>
              <button onClick={() => chooseContrib("both")} className="w-full text-left px-5 py-4 rounded-2xl border border-ink/10 bg-white text-ink text-[14px] font-medium hover:border-ficium/30 transition-all">
                Both — a lump sum plus monthly top-ups
              </button>
            </div>
            <button onClick={() => setStage("product")} className="mt-6 text-[13px] font-semibold text-muted hover:text-ink transition-colors">
              ← Back
            </button>
          </div>
        )}

        {/* ── Monthly-only: straight to Monthly Plan, no risk quiz needed ── */}
        {stage === "monthly_only" && (
          <div className="flex flex-col min-h-[60vh]">
            <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-2 leading-tight">How much can you set aside monthly?</h2>
            <p className="text-[13px] text-muted mb-6">You can adjust this later</p>
            <div className="flex-1 space-y-4">
              <div className="text-[32px] font-display font-extrabold text-ficium">{fmtMUR(monthlyAmount)}<span className="text-[14px] text-muted font-medium">/mo</span></div>
              <input type="range" min={2_000} max={200_000} step={1_000} value={monthlyAmount}
                onChange={e => setMonthlyAmount(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-[11px] text-muted">
                <span>{fmtMUR(2_000)}</span><span>{fmtMUR(200_000)}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setStage("quiz_contrib")} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
                Back
              </button>
              <button onClick={continueMonthlyOnly} className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] shadow-ficium">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Both lump sum + monthly: not yet a single combined submission,
             say so plainly rather than fake it. Lets them proceed with the
             lump-sum side today. ── */}
        {stage === "both_notice" && (
          <div>
            <div className="bg-white rounded-2xl border border-ink/6 shadow-xs p-6 mb-5">
              <p className="text-[14px] text-ink leading-relaxed mb-3">
                Combined lump-sum-plus-monthly requests aren't a single submission yet — we're still building that.
              </p>
              <p className="text-[13px] text-muted leading-relaxed">
                For now you can post your lump sum through this wizard, then add a separate Monthly Plan
                request from your dashboard whenever you're ready.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStage("quiz_contrib")} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
                Back
              </button>
              <button onClick={() => chooseContrib("lump_sum")} className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] shadow-ficium">
                Continue with lump sum <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── "Not sure?" quiz ── */}
        {stage === "quiz" && (() => {
          const q = QUIZ_QUESTIONS[quizStep];
          const pct = Math.round(((quizStep + 1) / (QUIZ_QUESTIONS.length + 1)) * 100);
          return (
            <div className="flex flex-col min-h-[60vh]">
              <div className="mb-8">
                <div className="flex items-center justify-between text-[11px] text-muted mb-2">
                  <span>{quizStep + 1} of {QUIZ_QUESTIONS.length + 1}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1 bg-ink/[0.07] rounded-full overflow-hidden">
                  <div className="h-full bg-ficium rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {quizStep === 0 && (
                <>
                  <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-2 leading-tight">How much are you looking to invest?</h2>
                  <p className="text-[13px] text-muted mb-6">A rough figure is fine — you can adjust it later</p>
                  <div className="flex-1 space-y-4">
                    <div className="text-[32px] font-display font-extrabold text-ficium">{fmtMUR(quizAmount)}</div>
                    <input type="range" min={10_000} max={10_000_000} step={10_000} value={quizAmount}
                      onChange={e => setQuizAmount(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>{fmtMUR(10_000)}</span><span>{fmtMUR(10_000_000)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                    <button onClick={() => setStage("quiz_contrib")} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
                      Back
                    </button>
                    <button onClick={() => setQuizStep(1)} className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] shadow-ficium">
                      Continue <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              )}

              {quizStep > 0 && q && (
                <>
                  <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-2 leading-tight">{q.question}</h2>
                  {q.subtext && <p className="text-[13px] text-muted mb-6">{q.subtext}</p>}
                  <div className="flex-1 space-y-2">
                    {q.options.map(opt => (
                      <button key={opt.label} onClick={() => answerQuiz(q.key, opt.score)}
                        className="w-full text-left px-5 py-4 rounded-2xl border border-ink/10 bg-white text-ink text-[14px] font-medium hover:border-ficium/30 transition-all">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-8">
                    <button onClick={() => setQuizStep(s => s - 1)} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ── Quiz result: recommended products ── */}
        {stage === "recommend" && bucket && (
          <div>
            <div className="bg-white rounded-2xl border border-ink/6 shadow-xs p-6 mb-5">
              <div className="text-[11px] font-bold text-ficium uppercase tracking-widest mb-1">Your profile</div>
              <div className="font-display text-[22px] font-bold text-ink mb-2">{BUCKET_LABEL[bucket]}</div>
              <p className="text-[13px] text-muted leading-relaxed">{BUCKET_BLURB[bucket]}</p>
            </div>

            <p className="text-[14px] text-muted mb-4">Products that typically suit this profile — select one or more:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {PRODUCTS.filter(p => BUCKET_PRODUCTS[bucket].includes(p.type)).map(p => {
                const Icon = p.icon;
                const isSelected = selectedTypes.includes(p.type);
                return (
                  <button key={p.type} onClick={() => toggleProduct(p.type)}
                    className={`bg-white border rounded-2xl p-5 text-left transition-all group ${isSelected ? "border-ficium shadow-md ring-2 ring-ficium/20" : "border-ink/6 hover:border-ficium/30 hover:shadow-md"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center ${p.iconBg}`}>
                        <Icon size={18} className={p.color} />
                      </div>
                      {isSelected && <CheckCircle2 size={18} className="text-ficium" />}
                    </div>
                    <div className="font-display text-[16px] font-bold text-ink mb-1">{p.label}</div>
                    <div className="text-[12px] text-muted leading-snug">{p.hint}</div>
                  </button>
                );
              })}

              {/* Manually added products, outside the bucket's suggestions */}
              {selectedTypes.filter(t => !BUCKET_PRODUCTS[bucket].includes(t)).map(t => {
                const p = PRODUCTS.find(pp => pp.type === t)!;
                const Icon = p.icon;
                return (
                  <button key={p.type} onClick={() => toggleProduct(p.type)}
                    className="bg-white border border-ficium shadow-md ring-2 ring-ficium/20 rounded-2xl p-5 text-left transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center ${p.iconBg}`}>
                        <Icon size={18} className={p.color} />
                      </div>
                      <CheckCircle2 size={18} className="text-ficium" />
                    </div>
                    <div className="font-display text-[16px] font-bold text-ink mb-1">{p.label}</div>
                    <div className="text-[12px] text-muted leading-snug">Added manually</div>
                  </button>
                );
              })}
            </div>

            {!showAddPicker ? (
              <button onClick={() => setShowAddPicker(true)} className="text-[13px] font-semibold text-ficium hover:text-ficium-deep transition-colors mb-5">
                + Add another product
              </button>
            ) : (
              <div className="bg-white border border-ink/6 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-semibold text-ink">Add a product</p>
                  <button onClick={() => setShowAddPicker(false)} className="text-[12px] text-muted hover:text-ink">Close</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ADDABLE_PRODUCT_TYPES.filter(t => !selectedTypes.includes(t)).map(t => {
                    const p = PRODUCTS.find(pp => pp.type === t)!;
                    return (
                      <button key={t} onClick={() => { toggleProduct(t); setShowAddPicker(false); }}
                        className="px-3.5 py-2 rounded-xl border border-ink/10 text-[13px] font-medium text-ink hover:border-ficium/30 transition-all">
                        {p.label}
                      </button>
                    );
                  })}
                  {ADDABLE_PRODUCT_TYPES.every(t => selectedTypes.includes(t)) && (
                    <p className="text-[12px] text-muted">All available products are already added.</p>
                  )}
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted mb-4">This is informational only, not financial advice — you choose which request to post, and institutions bid on it like any other request.</p>

            <div className="flex gap-3">
              <button onClick={() => setStage("product")} className="text-[13px] font-semibold text-muted hover:text-ink transition-colors">
                ← See all options instead
              </button>
              <div className="flex-1" />
              <button onClick={proceedFromRecommend} disabled={selectedTypes.length === 0}
                className="flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-2xl transition-colors text-[14px] shadow-ficium">
                Continue{selectedTypes.length > 1 ? ` with ${selectedTypes.length}` : ""} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Allocation: how the total splits across the selected products ── */}
        {stage === "allocate" && (
          <div>
            <div className="mb-6">
              <p className="text-[13px] text-muted mb-2">Total amount</p>
              <div className="text-[32px] font-display font-extrabold text-ficium mb-2">{fmtMUR(quizAmount)}</div>
              <input type="range" min={10_000} max={10_000_000} step={10_000} value={quizAmount}
                onChange={e => setQuizAmount(Number(e.target.value))} className="w-full" />
            </div>

            <div className="flex gap-2 mb-5">
              <button onClick={() => setAllocationMode("client_specified")}
                className={`flex-1 px-4 py-3 rounded-2xl border text-[13px] font-semibold transition-all ${allocationMode === "client_specified" ? "border-ficium bg-ficium/5 text-ficium" : "border-ink/10 text-muted hover:border-ink/20"}`}>
                I'll specify the split
              </button>
              <button onClick={() => setAllocationMode("institution_decides")}
                className={`flex-1 px-4 py-3 rounded-2xl border text-[13px] font-semibold transition-all ${allocationMode === "institution_decides" ? "border-ficium bg-ficium/5 text-ficium" : "border-ink/10 text-muted hover:border-ink/20"}`}>
                Let institutions propose it
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {selectedTypes.map(t => {
                const p = PRODUCTS.find(pp => pp.type === t)!;
                const Icon = p.icon;
                return (
                  <div key={t} className="bg-white border border-ink/6 rounded-2xl p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${p.iconBg}`}>
                      <Icon size={16} className={p.color} />
                    </div>
                    <div className="flex-1 text-[14px] font-semibold text-ink">{p.label}</div>
                    {allocationMode === "client_specified" ? (
                      <input type="number" min={0} step={1000} value={lineAmounts[t] ?? 0}
                        onChange={e => setLineAmounts(prev => ({ ...prev, [t]: Number(e.target.value) }))}
                        className="w-32 text-right px-3 py-2 rounded-xl border border-ink/10 text-[14px] font-semibold text-ink" />
                    ) : (
                      <span className="text-[12px] text-muted">Institution decides</span>
                    )}
                    <button onClick={() => toggleProduct(t)} className="text-muted hover:text-ink text-[12px] font-medium ml-1">✕</button>
                  </div>
                );
              })}
            </div>

            {!showAddPicker ? (
              <button onClick={() => setShowAddPicker(true)} className="text-[13px] font-semibold text-ficium hover:text-ficium-deep transition-colors mb-5">
                + Add another product
              </button>
            ) : (
              <div className="bg-white border border-ink/6 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-semibold text-ink">Add a product</p>
                  <button onClick={() => setShowAddPicker(false)} className="text-[12px] text-muted hover:text-ink">Close</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ADDABLE_PRODUCT_TYPES.filter(t => !selectedTypes.includes(t)).map(t => {
                    const p = PRODUCTS.find(pp => pp.type === t)!;
                    return (
                      <button key={t} onClick={() => { setSelectedTypes(prev => [...prev, t]); setLineAmounts(prev => ({ ...prev, [t]: 0 })); setShowAddPicker(false); }}
                        className="px-3.5 py-2 rounded-xl border border-ink/10 text-[13px] font-medium text-ink hover:border-ficium/30 transition-all">
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {allocationMode === "client_specified" && !allocationValid && (
              <p className="text-[12px] text-amber-600 mb-4">
                Lines add up to {fmtMUR(lineAmountSum)} — needs to match the total ({fmtMUR(quizAmount)}).
              </p>
            )}

            <div className="mb-4">
              <label className="text-[13px] font-semibold text-ink block mb-2">What's this for? <span className="text-muted font-normal">(providers see this, not your name)</span></label>
              <input type="text" value={multiPurpose} onChange={e => setMultiPurpose(e.target.value)}
                placeholder="e.g. Diversifying savings, retirement planning"
                className="w-full px-4 py-3 rounded-xl border border-ink/10 text-[14px]" />
            </div>

            <div className="mb-6">
              <label className="text-[13px] font-semibold text-ink block mb-2">Preferred term: {multiTermMonths} months</label>
              <input type="range" min={6} max={120} step={6} value={multiTermMonths}
                onChange={e => setMultiTermMonths(Number(e.target.value))} className="w-full" />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-[13px] mb-4">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStage("recommend")} className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
                Back
              </button>
              <button onClick={submitMultiProduct} disabled={!allocationValid || !multiPurpose.trim() || submitting || selectedTypes.length < 2}
                className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] shadow-ficium">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Post request <ArrowRight size={15} /></>}
              </button>
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
              setAnswers(prev => ({ ...prev, [key]: value }));
              // select auto-advances on tap; all other types wait for Continue button
              if (currentQ.type === "select") {
                if (qIndex < questions.length - 1) setTimeout(() => setQIndex(i => i + 1), 200);
                else setTimeout(() => setStage("review"), 200);
              }
            }}
            onAdvance={advanceFromQ}
            onBack={handleBack}
            onSkip={!currentQ.required ? handleSkip : undefined}
            questionNum={qIndex + 1}
            totalQuestions={questions.length}
          />
        )}

        {/* ── Review ── */}
        {stage === "review" && product && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/6 shadow-xs overflow-hidden">
              <div className="bg-linear-to-r from-ficium to-ficium-deep px-6 py-5">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Ready to post</div>
                <div className="font-display text-[22px] font-bold text-white">{product.label}</div>
              </div>

              <div className="px-6 py-5 space-y-3">
                <ReviewRow label="Amount" value={fmtMUR(Number(answers["__amount"] || product.defaultAmount))} />
                {answers["__term"] && product.type !== "credit_card" && product.type !== "fixed_deposit" && (
                  <ReviewRow label="Term" value={`${answers["__term"]} months`} />
                )}
                {Object.entries(answers)
                  .filter(([k, v]) => v && !k.startsWith("__"))
                  .map(([k, v]) => <ReviewRow key={k} label={k.replace(/_/g, " ")} value={v} />)
                }
              </div>

              <div className="mx-6 mb-5 rounded-xl border border-line overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsJoint(j => !j)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-line/20 transition-colors"
                >
                  <div className={["w-9 h-9 rounded-lg grid place-items-center shrink-0", isJoint ? "bg-ficium/10" : "bg-ink/4"].join(" ")}>
                    <Users size={16} className={isJoint ? "text-ficium" : "text-muted"} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-semibold text-ink">Make this a joint request</p>
                    <p className="text-[11px] text-muted mt-0.5">Invite a spouse to apply together</p>
                  </div>
                  <div className={["w-10 h-6 rounded-pill flex items-center px-0.5 transition-colors shrink-0", isJoint ? "bg-ficium justify-end" : "bg-ink/15 justify-start"].join(" ")}>
                    <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </div>
                </button>
                {isJoint && (
                  <div className="px-4 pb-4 pt-1 bg-white">
                    <input
                      type="email"
                      value={partnerEmail}
                      onChange={e => setPartnerEmail(e.target.value)}
                      placeholder="partner@email.com"
                      className="w-full bg-surface border border-ink/10 rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-muted/50 outline-hidden focus:border-ficium transition-colors"
                    />
                    <p className="text-[11px] text-muted mt-2">
                      They'll need to verify their identity and confirm a marriage certificate before the request goes to market.
                    </p>
                  </div>
                )}
              </div>

              <div className="mx-6 mb-5 rounded-xl border border-line overflow-hidden bg-white px-4 py-3.5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-ficium/10 grid place-items-center shrink-0">
                    <CalendarDays size={16} className="text-ficium" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Bidding window</p>
                    <p className="text-[11px] text-muted mt-0.5">How long should providers have to respond?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDeadlineDays(d)}
                      className={[
                        "flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors",
                        deadlineDays === d
                          ? "bg-ficium text-white shadow-ficium"
                          : "bg-ink/4 text-muted hover:bg-ink/8",
                      ].join(" ")}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <div className="mx-6 mb-5 flex items-start gap-2.5 bg-ficium/4 border border-ficium/12 rounded-xl px-4 py-3">
                <Lock size={13} className="text-ficium shrink-0 mt-0.5" />
                <p className="text-[12px] text-ink/70 leading-relaxed">
                  Your identity stays private. Providers see only your request details and respond anonymously.
                </p>
              </div>

              {error && (
                <div className="mx-6 mb-5 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              <div className="px-6 pb-6 flex gap-3">
                <button onClick={submit} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[15px] disabled:opacity-60 shadow-ficium">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : <><CheckCircle2 size={16} /> Post request</>}
                </button>
                <button onClick={() => { setStage("questions"); setQIndex(questions.length - 1); }} disabled={submitting}
                  className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/3 transition-colors">
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
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink/5 last:border-0">
      <span className="text-[12px] text-muted font-medium w-32 shrink-0 capitalize">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}
