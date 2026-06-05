// =============================================================
// Ficium — Journey Wizard (/journeys/new?type=X)
// Adaptive Q&A → AI calculation → Journey created → Workspace
// =============================================================
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  Home, Car, TrendingUp, GraduationCap, Plane, Briefcase,
  Building2, Sparkles,
} from "lucide-react";
import { useCreateJourney, useCalculateAffordability, type JourneyType, type JourneyAnswers, type JourneyAIResults } from "@/individual/journeys/hooks/useJourneys";
import { BottomNav } from "@/shared/ui";

// ── Journey config ────────────────────────────────────────────
type Question = {
  key:     string;
  label:   string;
  type:    "text" | "number" | "select" | "boolean" | "date";
  options?: string[];
  prefix?: string;
  suffix?: string;
  required?: boolean;
  placeholder?: string;
};

const JOURNEY_CONFIG: Record<JourneyType, {
  icon:      React.ElementType;
  color:     string;
  gradient:  string;
  title:     (a: JourneyAnswers) => string;
  questions: Question[];
  ctaLabel:  string;
  requestType: string;
}> = {
  mortgage: {
    icon: Home, color: "#2A1FE6",
    gradient: "from-[#c47b2b] to-[#7a4a1e]",
    title: (a) => a.propertyLocation ? `Home in ${a.propertyLocation}` : "Home Purchase",
    questions: [
      { key: "firstProperty",   label: "Is this your first property?",        type: "boolean",                                       required: true },
      { key: "propertyValue",   label: "Property value",                       type: "number",  prefix: "Rs", placeholder: "5000000",  required: true },
      { key: "propertyLocation",label: "Where is the property?",               type: "text",    placeholder: "e.g. Flic en Flac",      required: true },
      { key: "depositAvailable",label: "How much deposit do you have?",        type: "number",  prefix: "Rs", placeholder: "500000",   required: true },
      { key: "monthlyIncome",   label: "Your monthly income",                  type: "number",  prefix: "Rs", placeholder: "80000",    required: true },
      { key: "employmentStatus",label: "Employment status",                    type: "select",  options: ["Employed","Self-employed","Business owner","Retired"], required: true },
      { key: "existingLoans",   label: "Do you have existing loans?",          type: "boolean" },
      { key: "timeline",        label: "When do you need the mortgage?",       type: "select",  options: ["ASAP","1-3 months","3-6 months","6-12 months","Just exploring"] },
    ],
    ctaLabel: "Compare Mortgage Offers",
    requestType: "mortgage",
  },
  vehicle: {
    icon: Car, color: "#2A1FE6",
    gradient: "from-[#4b5563] to-[#1f2937]",
    title: (a) => a.vehicleModel ? String(a.vehicleModel) : "Vehicle Finance",
    questions: [
      { key: "newOrUsed",       label: "New or used vehicle?",                 type: "select",  options: ["New","Used"],              required: true },
      { key: "vehicleValue",    label: "Vehicle value",                        type: "number",  prefix: "Rs", placeholder: "1200000", required: true },
      { key: "vehicleModel",    label: "Brand / Model",                        type: "text",    placeholder: "e.g. Mercedes A250e" },
      { key: "depositAvailable",label: "Deposit available",                    type: "number",  prefix: "Rs", placeholder: "200000",  required: true },
      { key: "monthlyBudget",   label: "Max monthly instalment",               type: "number",  prefix: "Rs", placeholder: "15000",   required: true },
      { key: "monthlyIncome",   label: "Monthly income",                       type: "number",  prefix: "Rs", placeholder: "60000",   required: true },
    ],
    ctaLabel: "See Financing Options",
    requestType: "leasing",
  },
  investment: {
    icon: TrendingUp, color: "#2A1FE6",
    gradient: "from-[#0f0c29] to-[#2A1FE6]",
    title: () => "Investment Growth Plan",
    questions: [
      { key: "amount",          label: "How much would you like to invest?",   type: "number",  prefix: "Rs", placeholder: "100000",  required: true },
      { key: "monthlyContrib",  label: "Monthly contribution",                 type: "number",  prefix: "Rs", placeholder: "5000" },
      { key: "horizon",         label: "Investment horizon",                   type: "select",  options: ["1-2 years","3-5 years","5-10 years","10+ years"], required: true },
      { key: "riskAppetite",    label: "Risk appetite",                        type: "select",  options: ["Conservative","Moderate","Growth","Aggressive"], required: true },
      { key: "goal",            label: "What is this investment for?",         type: "select",  options: ["Retirement","Wealth building","Education fund","Emergency fund","Other"] },
    ],
    ctaLabel: "View Matched Products",
    requestType: "investment_account",
  },
  education: {
    icon: GraduationCap, color: "#059669",
    gradient: "from-[#059669] to-[#065f46]",
    title: (a) => a.course ? String(a.course) : "Education Funding",
    questions: [
      { key: "country",         label: "Country of study",                     type: "text",    placeholder: "e.g. France, UK, Mauritius", required: true },
      { key: "course",          label: "Course / Degree",                      type: "text",    placeholder: "e.g. MBA, Engineering",       required: true },
      { key: "tuitionCost",     label: "Total tuition cost",                   type: "number",  prefix: "Rs", placeholder: "1500000",        required: true },
      { key: "livingCost",      label: "Estimated living costs",               type: "number",  prefix: "Rs", placeholder: "600000" },
      { key: "savedAmount",     label: "How much do you already have?",        type: "number",  prefix: "Rs", placeholder: "0" },
      { key: "startDate",       label: "Course start date",                    type: "date" },
    ],
    ctaLabel: "Find Education Financing",
    requestType: "personal_loan",
  },
  travel: {
    icon: Plane, color: "#d97706",
    gradient: "from-[#0ea5e9] to-[#0369a1]",
    title: (a) => a.destination ? `Trip to ${a.destination}` : "Travel Plan",
    questions: [
      { key: "destination",     label: "Destination",                          type: "text",    placeholder: "e.g. Europe, Dubai",     required: true },
      { key: "budget",          label: "Total budget needed",                  type: "number",  prefix: "Rs", placeholder: "180000",   required: true },
      { key: "savedAmount",     label: "How much have you saved?",             type: "number",  prefix: "Rs", placeholder: "0",        required: true },
      { key: "travelDate",      label: "Travel date",                          type: "date" },
      { key: "travelers",       label: "Number of travelers",                  type: "select",  options: ["1","2","3-4","5+"] },
    ],
    ctaLabel: "See Savings & Financing Options",
    requestType: "personal_loan",
  },
  business: {
    icon: Briefcase, color: "#7c3aed",
    gradient: "from-[#7c3aed] to-[#4c1d95]",
    title: (a) => a.businessName ? String(a.businessName) : "Business Funding",
    questions: [
      { key: "industry",        label: "Industry",                             type: "select",  options: ["Retail","Food & Beverage","Technology","Healthcare","Construction","Tourism","Agriculture","Other"], required: true },
      { key: "stage",           label: "Startup or existing business?",        type: "select",  options: ["Startup (< 1 year)","Early stage (1-3 years)","Established (3+ years)"], required: true },
      { key: "businessName",    label: "Business name (optional)",             type: "text",    placeholder: "e.g. My Company Ltd" },
      { key: "amountRequired",  label: "Amount required",                      type: "number",  prefix: "Rs", placeholder: "1000000",  required: true },
      { key: "monthlyRevenue",  label: "Current monthly revenue",              type: "number",  prefix: "Rs", placeholder: "0" },
      { key: "purpose",         label: "What is the funding for?",             type: "select",  options: ["Working capital","Equipment","Expansion","Stock","Marketing","Other"], required: true },
    ],
    ctaLabel: "See SME Financing Options",
    requestType: "business_loan",
  },
};

// ── Journey Result Card ───────────────────────────────────────
function JourneyResultCard({
  type, title, answers: _answers, aiResults, onConfirm, onBack, creating,
}: {
  type: JourneyType; title: string; answers: JourneyAnswers;
  aiResults: JourneyAIResults; onConfirm: () => void; onBack: () => void; creating: boolean;
}) {
  const config = JOURNEY_CONFIG[type];
  const Icon   = config.icon;
  const fmt    = (n?: number) => n ? `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}` : "—";

  const metrics = [
    type === "mortgage"   && aiResults.monthlyRepayment && { label: "Monthly Repayment", value: fmt(aiResults.monthlyRepayment) },
    type === "mortgage"   && aiResults.depositGap !== undefined && { label: "Deposit Gap",       value: fmt(aiResults.depositGap) },
    type === "vehicle"    && aiResults.monthlyRepayment && { label: "Monthly Instalment",value: fmt(aiResults.monthlyRepayment) },
    type === "investment" && aiResults.projectedValue   && { label: "10Y Projection",    value: fmt(aiResults.projectedValue) },
    type === "education"  && aiResults.fundingGap       && { label: "Funding Gap",        value: fmt(aiResults.fundingGap) },
    type === "travel"     && aiResults.fundingGap       && { label: "Savings Gap",        value: fmt(aiResults.fundingGap) },
    type === "business"   && aiResults.eligibility      && { label: "Readiness",          value: `${aiResults.eligibility}%` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card overflow-hidden">
      <div className={`bg-gradient-to-br ${config.gradient} p-6`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center">
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Journey Created</div>
            <div className="font-display text-[20px] font-bold text-white leading-tight">{title}</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          {aiResults.affordability !== undefined && (
            <ScoreBox label="Affordability" value={`${aiResults.affordability}%`} color="#2A1FE6" />
          )}
          {aiResults.eligibility !== undefined && (
            <ScoreBox label="Eligibility" value={`${aiResults.eligibility}%`} color="#059669" />
          )}
        </div>

        {/* Key metrics */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(({ label, value }) => (
              <div key={label} className="bg-cream rounded-xl p-3">
                <div className="text-[10px] text-muted font-semibold mb-0.5">{label}</div>
                <div className="font-display text-[16px] font-bold text-ink">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Banks matched */}
        <div className="flex items-center gap-3 bg-ficium/[0.04] border border-ficium/[0.12] rounded-xl px-4 py-3">
          <Building2 size={18} className="text-ficium flex-shrink-0" />
          <span className="text-[13px] font-semibold text-ink">
            {aiResults.banksMatched ?? 4} banks ready to compete for you
          </span>
        </div>

        {/* AI summary */}
        {aiResults.summary && (
          <div className="flex items-start gap-2 bg-emerald-50 rounded-xl px-4 py-3">
            <Sparkles size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-emerald-800 leading-relaxed">{aiResults.summary}</p>
          </div>
        )}

        {/* Action plan */}
        {aiResults.actionPlan?.length && (
          <div>
            <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">Your action plan</div>
            <div className="space-y-1.5">
              {aiResults.actionPlan.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-ink/80">
                  <span className="w-5 h-5 rounded-full bg-ficium/10 text-ficium text-[10px] font-bold grid place-items-center flex-shrink-0 mt-0.5">{i+1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3 pt-2">
          <button onClick={onBack} className="px-4 py-3 rounded-xl border border-ink/10 text-[13px] text-muted font-semibold hover:bg-ink/[0.03]">
            Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={creating}
            className="flex-1 flex items-center justify-center gap-2 bg-ficium text-white py-3 rounded-xl text-[14px] font-bold shadow-ficium disabled:opacity-60"
          >
            {creating ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><CheckCircle2 size={15} /> {config.ctaLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: `${color}30`, background: `${color}08` }}>
      <div className="text-[10px] font-bold text-muted mb-1">{label}</div>
      <div className="font-display text-[24px] font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}

// ── Main wizard component ─────────────────────────────────────
export default function JourneyWizard() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const typeParam       = searchParams.get("type") as JourneyType | null;

  const { mutateAsync: createJourney } = useCreateJourney();
  const calcAffordability = useCalculateAffordability();

  const [type,       setType]       = useState<JourneyType | null>(typeParam);
  const [step,       setStep]       = useState(typeParam ? 0 : -1); // -1 = type select
  const [answers,    setAnswers]    = useState<JourneyAnswers>({});
  const [calculating,setCalculating]= useState(false);
  const [aiResults,  setAIResults]  = useState<JourneyAIResults | null>(null);
  const [creating,   setCreating]   = useState(false);
  const [done,       setDone]       = useState<string | null>(null); // journeyId when done

  const config    = type ? JOURNEY_CONFIG[type] : null;
  const questions = config?.questions ?? [];
  const currentQ  = questions[step];

  const handleTypeSelect = (t: JourneyType) => { setType(t); setStep(0); setAnswers({}); setAIResults(null); };

  const handleAnswer = (key: string, value: string | number | boolean) => {
    setAnswers((p) => ({ ...p, [key]: value }));
  };

  const handleNext = async () => {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Last question — calculate
      setCalculating(true);
      const results = await calcAffordability(type!, answers);
      setAIResults(results);
      setCalculating(false);
    }
  };

  const handleConfirm = async () => {
    if (!type || !aiResults || !config) return;
    setCreating(true);
    const title = config.title(answers);
    const result = await createJourney({ type, title, answers, aiResults });
    if (result.ok && result.journeyId) {
      setDone(result.journeyId);
      setTimeout(() => navigate(`/journeys/${result.journeyId}`), 1200);
    }
    setCreating(false);
  };

  // Done state
  if (done) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-ficium/10 grid place-items-center mx-auto mb-4">
          <CheckCircle2 size={40} className="text-ficium" />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink mb-1">Journey started!</h2>
        <p className="text-muted text-[14px]">Taking you to your workspace…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className={`bg-gradient-to-br ${config?.gradient ?? "from-[#0f0c29] to-[#2A1FE6]"}`}>
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 pt-8 pb-14">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-6">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">
            {type ?? "New Journey"}
          </div>
          <h1 className="font-display text-[28px] font-extrabold text-white leading-tight">
            {aiResults ? "Your journey is ready" : currentQ?.label ?? "What's your goal?"}
          </h1>

          {/* Progress bar */}
          {type && !aiResults && (
            <div className="flex gap-1.5 mt-4">
              {questions.map((_, i) => (
                <div key={i} className={["h-1 flex-1 rounded-full transition-all", i <= step ? "bg-white" : "bg-white/20"].join(" ")} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 sm:px-6 -mt-6 space-y-4">

        {/* ── Type select ── */}
        {step === -1 && (
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5">
            <div className="text-[13px] font-bold text-ink mb-4">Choose your journey type</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(JOURNEY_CONFIG) as JourneyType[]).map((t) => {
                const c = JOURNEY_CONFIG[t];
                const Icon = c.icon;
                return (
                  <button key={t} onClick={() => handleTypeSelect(t)}
                    className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 border-ink/[0.08] hover:border-ficium/30 hover:bg-ficium/[0.03] transition-all">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} grid place-items-center`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-ink text-center leading-tight">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI result card ── */}
        {aiResults && type && config && (
          <JourneyResultCard
            type={type}
            title={config.title(answers)}
            aiResults={aiResults}
            onConfirm={handleConfirm}
            onBack={() => { setAIResults(null); setStep(questions.length - 1); }}
            creating={creating}
          />
        )}

        {/* ── Calculating ── */}
        {calculating && (
          <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-8 text-center">
            <Loader2 size={32} className="text-ficium animate-spin mx-auto mb-3" />
            <div className="font-display text-[16px] font-bold text-ink">Ficium AI is calculating…</div>
            <p className="text-muted text-[13px] mt-1">Affordability, eligibility, bank matching</p>
          </div>
        )}

        {/* ── Question card ── */}
        {!aiResults && !calculating && currentQ && (
          <QuestionCard
            question={currentQ}
            value={answers[currentQ.key]}
            onChange={(v) => handleAnswer(currentQ.key, v)}
            onNext={handleNext}
            isLast={step === questions.length - 1}
            stepNum={step + 1}
            totalSteps={questions.length}
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
}

// ── Question card ─────────────────────────────────────────────
function QuestionCard({ question, value, onChange, onNext, isLast, stepNum, totalSteps }: {
  question: Question;
  value:    string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
  onNext:   () => void;
  isLast:   boolean;
  stepNum:  number;
  totalSteps: number;
}) {
  const canNext = !question.required || (value !== undefined && value !== "");

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5 space-y-4">
      <div className="text-[11px] text-muted font-semibold">{stepNum} of {totalSteps}</div>

      {question.type === "boolean" && (
        <div className="grid grid-cols-2 gap-3">
          {["Yes", "No"].map((opt) => (
            <button key={opt} onClick={() => onChange(opt === "Yes")}
              className={["py-4 rounded-xl border-2 text-[14px] font-bold transition-all", value === (opt === "Yes") ? "border-ficium bg-ficium/10 text-ficium" : "border-ink/[0.08] text-muted hover:border-ficium/30"].join(" ")}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "select" && (
        <div className="grid grid-cols-1 gap-2">
          {question.options?.map((opt) => (
            <button key={opt} onClick={() => onChange(opt)}
              className={["py-3 px-4 rounded-xl border-2 text-[13px] font-semibold text-left transition-all", value === opt ? "border-ficium bg-ficium/10 text-ficium" : "border-ink/[0.08] text-muted hover:border-ficium/30"].join(" ")}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {(question.type === "number" || question.type === "text") && (
        <div className="flex items-center gap-2 border border-ink/[0.10] rounded-xl px-4 py-3 bg-cream focus-within:border-ficium/50 focus-within:ring-2 focus-within:ring-ficium/10">
          {question.prefix && <span className="text-muted font-semibold text-[13px]">{question.prefix}</span>}
          <input
            type={question.type === "number" ? "number" : "text"}
            value={value as string ?? ""}
            onChange={(e) => onChange(question.type === "number" ? Number(e.target.value) : e.target.value)}
            placeholder={question.placeholder}
            className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-ink placeholder:text-muted/50"
            autoFocus
          />
          {question.suffix && <span className="text-muted text-[13px]">{question.suffix}</span>}
        </div>
      )}

      {question.type === "date" && (
        <input
          type="date"
          value={value as string ?? ""}
          onChange={(e) => onChange(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full border border-ink/[0.10] rounded-xl px-4 py-3 bg-cream text-[14px] text-ink outline-none focus:border-ficium"
        />
      )}

      <button
        onClick={onNext}
        disabled={!canNext}
        className="w-full flex items-center justify-center gap-2 bg-ficium text-white py-3.5 rounded-xl text-[14px] font-bold shadow-ficium disabled:opacity-40 hover:bg-ficium-bright transition-colors"
      >
        {isLast ? "Calculate →" : "Next"} <ArrowRight size={15} />
      </button>
    </div>
  );
}

