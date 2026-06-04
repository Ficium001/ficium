import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight, ArrowLeft, Trash2, Plus, TrendingUp,
  Sparkles, ChevronRight, Check, Users,
  Building2, Briefcase, Coffee, GraduationCap, Palmtree, UserX, Wrench,
} from "lucide-react";
import { submitDossier } from "../api/dossier";
import { Field, Input, Select } from "../../../shared/ui";

/* ================================================================
   SCHEMA
================================================================ */

const loanSchema = z.object({
  loanType: z.enum(["personal", "mortgage", "vehicle", "business", "credit_card", "other"]),
  outstandingAmount: z.number().min(0).max(1_000_000_000),
  monthlyRepayment: z.number().min(0).max(10_000_000),
  bankName: z.string().trim().min(1, "Bank name required").max(100),
  remainingMonths: z.number().int().min(0).max(600).optional().or(z.nan().transform(() => undefined)),
});

const schema = z.object({
  employmentStatus: z.enum(["employed","self_employed","business_owner","freelance","retired","student","unemployed"]),
  monthlyIncome: z.number().min(0).max(100_000_000),
  additionalIncome: z.number().min(0).max(100_000_000).default(0),
  dependants: z.number().int().min(0).max(20).default(0),
  employerName: z.string().max(150).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  yearsOfEmployment: z.number().min(0).max(80).optional().or(z.nan().transform(() => undefined)),
  employmentType: z.enum(["permanent","contract","temporary"]).optional(),
  workEmail: z.string().email("Invalid work email").optional().or(z.literal("")),
  businessName: z.string().max(150).optional().or(z.literal("")),
  brnNumber: z.string().max(40).optional().or(z.literal("")),
  yearsInBusiness: z.number().min(0).max(100).optional().or(z.nan().transform(() => undefined)),
  averageMonthlyRevenue: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  taxRegistrationNumber: z.string().max(50).optional().or(z.literal("")),
  companyType: z.string().max(60).optional().or(z.literal("")),
  numberOfEmployees: z.number().int().min(0).max(1_000_000).optional().or(z.nan().transform(() => undefined)),
  annualRevenue: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  primaryProfession: z.string().max(120).optional().or(z.literal("")),
  primaryClientsRegion: z.string().max(120).optional().or(z.literal("")),
  pensionIncome: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  otherIncomeSources: z.string().max(300).optional().or(z.literal("")),
  institutionName: z.string().max(150).optional().or(z.literal("")),
  sponsorType: z.enum(["parents","self","scholarship","employer","other"]).optional(),
  monthlyAllowance: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  savings: z.number().min(0).max(10_000_000_000).default(0),
  investments: z.number().min(0).max(10_000_000_000).default(0),
  propertyValue: z.number().min(0).max(10_000_000_000).default(0),
  vehicleValue: z.number().min(0).max(10_000_000_000).default(0),
  businessAssets: z.number().min(0).max(10_000_000_000).default(0),
  otherAssets: z.number().min(0).max(10_000_000_000).default(0),
  hasExistingLoans: z.boolean(),
  loans: z.array(loanSchema).default([]),
  sourceOfWealth: z.enum(["salary","business","investments","inheritance","property","savings","other"]).optional(),
  sourceOfWealthOther: z.string().max(200).optional().or(z.literal("")),
  isPep: z.boolean().default(false),
  pepDetails: z.string().max(300).optional().or(z.literal("")),
  taxResidency: z.string().min(2).max(60).default("MU"),
  missedRepayments: z.boolean().default(false),
  blacklisted: z.boolean().default(false),
  bankruptcy: z.boolean().default(false),
  legalDisputes: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.employmentStatus === "employed") {
    if (!data.employerName?.trim()) ctx.addIssue({ code: "custom", path: ["employerName"], message: "Employer name required" });
    if (!data.jobTitle?.trim()) ctx.addIssue({ code: "custom", path: ["jobTitle"], message: "Job title required" });
    if (!data.employmentType) ctx.addIssue({ code: "custom", path: ["employmentType"], message: "Select employment type" });
  }
  if ((data.employmentStatus === "self_employed" || data.employmentStatus === "business_owner")) {
    if (!data.businessName?.trim()) ctx.addIssue({ code: "custom", path: ["businessName"], message: "Business name required" });
  }
  if (data.hasExistingLoans && data.loans.length === 0)
    ctx.addIssue({ code: "custom", path: ["loans"], message: "Add at least one loan" });
  if (data.isPep && !data.pepDetails?.trim())
    ctx.addIssue({ code: "custom", path: ["pepDetails"], message: "Please describe your PEP status" });
  if (data.sourceOfWealth === "other" && !data.sourceOfWealthOther?.trim())
    ctx.addIssue({ code: "custom", path: ["sourceOfWealthOther"], message: "Specify your source of wealth" });
});

type FormData = z.infer<typeof schema>;

/* ================================================================
   HEALTH SCORE
================================================================ */

function calcHealth(data: Partial<FormData>) {
  let pts = 0;
  const income = (Number(data.monthlyIncome)||0) + (Number(data.additionalIncome)||0);
  if (income > 0) pts += 10;
  if (income >= 30_000) pts += 10;
  if (income >= 80_000) pts += 10;
  const assets = [data.savings,data.investments,data.propertyValue,data.vehicleValue,data.businessAssets,data.otherAssets]
    .reduce<number>((s,v)=>s+(Number(v)||0),0);
  if (assets > 0) pts += 5;
  if (assets >= 500_000) pts += 8;
  if (assets >= 2_000_000) pts += 7;
  const rep = (data.loans??[]).reduce<number>((s,l)=>s+(Number(l.monthlyRepayment)||0),0);
  const dti = income > 0 ? rep/income : 0;
  if (!data.hasExistingLoans || (data.loans??[]).length===0) pts += 20;
  else if (dti < 0.2) pts += 20;
  else if (dti < 0.35) pts += 12;
  else if (dti < 0.5) pts += 5;
  if (data.employmentStatus) pts += 5;
  if (data.employmentStatus === "employed" && data.employerName) pts += 10;
  else if (data.employmentStatus && data.employmentStatus !== "unemployed") pts += 7;
  if (data.sourceOfWealth) pts += 8;
  if (data.taxResidency) pts += 4;
  if (!data.isPep && !data.missedRepayments && !data.blacklisted && !data.bankruptcy) pts += 3;
  const score = Math.min(100, pts);
  const colour = score>=80?"#10b981":score>=60?"#3D6EF5":score>=40?"#f59e0b":score>=20?"#f97316":"#94a3b8";
  const label  = score>=80?"Excellent":score>=60?"Strong":score>=40?"Good":score>=20?"Fair":"Getting started";
  const insight= score>=80?"Your profile is highly attractive. Expect competitive bids."
    :score>=60?"Good profile. Complete the assets section to strengthen your bids."
    :score>=40?"Banks can see you. Add your assets to attract more bids."
    :"Fill in your employment and income to unlock bank bids.";
  return { score, colour, label, insight, dti: dti*100, totalIncome: income, totalAssets: assets, totalRepayment: rep };
}

/* ================================================================
   EMPLOYMENT CARDS
================================================================ */

const EMP_OPTIONS = [
  { value: "employed",       label: "Employed",       icon: Briefcase,   desc: "Work for a company" },
  { value: "self_employed",  label: "Self-employed",  icon: Wrench,      desc: "Run your own work" },
  { value: "business_owner", label: "Business owner", icon: Building2,   desc: "Own a company" },
  { value: "freelance",      label: "Freelancer",     icon: Coffee,      desc: "Project-based work" },
  { value: "retired",        label: "Retired",        icon: Palmtree,    desc: "Pension / savings" },
  { value: "student",        label: "Student",        icon: GraduationCap, desc: "Currently studying" },
  { value: "unemployed",     label: "Unemployed",     icon: UserX,       desc: "Between jobs" },
];

const WEALTH_OPTIONS = [
  { value: "salary",      label: "Salary",      icon: "💼" },
  { value: "business",    label: "Business",    icon: "🏢" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "inheritance", label: "Inheritance", icon: "🏛️" },
  { value: "property",    label: "Property",    icon: "🏠" },
  { value: "savings",     label: "Savings",     icon: "🏦" },
  { value: "other",       label: "Other",       icon: "✦" },
];

const ASSET_ROWS = [
  { name: "savings" as const,      label: "Savings",        icon: "💰", desc: "Bank accounts, cash" },
  { name: "investments" as const,  label: "Investments",    icon: "📈", desc: "Stocks, funds, crypto" },
  { name: "propertyValue" as const,label: "Property",       icon: "🏠", desc: "Real estate value" },
  { name: "vehicleValue" as const, label: "Vehicles",       icon: "🚗", desc: "Cars, motorcycles" },
  { name: "businessAssets" as const,label:"Business assets",icon: "🏢", desc: "Equipment, inventory" },
  { name: "otherAssets" as const,  label: "Other assets",   icon: "📦", desc: "Jewellery, art, etc." },
];

/* ================================================================
   PAGE
================================================================ */

export default function Dossier() {
  const navigate  = useNavigate();
  const [step, setStep]           = useState(1); // 1 | 2 | 3
  const [submitError, setSubmitError] = useState<string|null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string|null>(null);
  const [done, setDone]           = useState(false);

  const form = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      employmentStatus: undefined, monthlyIncome: 0, additionalIncome: 0, dependants: 0,
      hasExistingLoans: false, loans: [],
      savings: 0, investments: 0, propertyValue: 0, vehicleValue: 0, businessAssets: 0, otherAssets: 0,
      taxResidency: "MU", isPep: false,
      missedRepayments: false, blacklisted: false, bankruptcy: false, legalDisputes: false,
    },
  });

  const { register, handleSubmit, control, setValue, trigger,
          formState: { errors, isSubmitting } } = form;

  const allWatched       = useWatch({ control });
  const employmentStatus = useWatch({ control, name: "employmentStatus" });
  const hasLoans         = useWatch({ control, name: "hasExistingLoans" });
  const isPep            = useWatch({ control, name: "isPep" });
  const sourceOfWealth   = useWatch({ control, name: "sourceOfWealth" });
  

  const { fields: loanFields, append: appendLoan, remove: removeLoan } = useFieldArray({ control, name: "loans" });

  const h = useMemo(() => calcHealth(allWatched as Partial<FormData>), [allWatched]);

  // Scroll to top on step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const goNext = async () => {
    const fields: (keyof FormData)[] = step === 1
      ? ["employmentStatus","monthlyIncome","dependants","employerName","jobTitle","employmentType","businessName"]
      : ["savings","investments","propertyValue","vehicleValue","businessAssets","otherAssets","loans"];
    const ok = await trigger(fields);
    if (ok) setStep(s => s + 1);
  };

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await submitDossier({
      employmentStatus: data.employmentStatus,
      monthlyIncome: data.monthlyIncome, additionalIncome: data.additionalIncome, dependants: data.dependants,
      employmentDetails: {
        employerName: data.employerName||undefined, industry: data.industry||undefined,
        jobTitle: data.jobTitle||undefined, yearsOfEmployment: data.yearsOfEmployment,
        employmentType: data.employmentType, workEmail: data.workEmail||undefined,
        businessName: data.businessName||undefined, brnNumber: data.brnNumber||undefined,
        yearsInBusiness: data.yearsInBusiness, averageMonthlyRevenue: data.averageMonthlyRevenue,
        taxRegistrationNumber: data.taxRegistrationNumber||undefined,
        companyType: data.companyType||undefined, numberOfEmployees: data.numberOfEmployees,
        annualRevenue: data.annualRevenue, primaryProfession: data.primaryProfession||undefined,
        primaryClientsRegion: data.primaryClientsRegion||undefined,
        pensionIncome: data.pensionIncome, otherIncomeSources: data.otherIncomeSources||undefined,
        institutionName: data.institutionName||undefined, sponsorType: data.sponsorType,
        monthlyAllowance: data.monthlyAllowance, partTimeEmployment: false,
      },
      assets: { savings: data.savings, investments: data.investments, propertyValue: data.propertyValue,
        vehicleValue: data.vehicleValue, businessAssets: data.businessAssets, otherAssets: data.otherAssets },
      hasExistingLoans: data.hasExistingLoans, loans: data.loans,
      compliance: {
        sourceOfWealth: data.sourceOfWealth, sourceOfWealthOther: data.sourceOfWealthOther||undefined,
        isPep: data.isPep, pepDetails: data.pepDetails||undefined, taxResidency: data.taxResidency,
        missedRepayments: data.missedRepayments, blacklisted: data.blacklisted,
        bankruptcy: data.bankruptcy, legalDisputes: data.legalDisputes,
      },
    });
    if (!result.ok) { setSubmitError(result.error); return; }
    setDone(true);
    setTimeout(() => navigate("/dashboard"), 2200);
  };

  /* ── DONE SCREEN ── */
  if (done) return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-ficium/20 flex items-center justify-center">
          <Check size={44} className="text-ficium" strokeWidth={3} />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
      </div>
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-white">Your financial passport is ready.</h1>
        <p className="text-white/50 mt-2 text-lg">Banks are about to compete for you.</p>
      </div>
      <div className="flex gap-6 mt-2">
        {[["Score", h.score + "/100"],["Income", formatMUR(h.totalIncome)+"/mo"],["Net worth", formatMUR(h.totalAssets)]].map(([l,v]) => (
          <div key={l} className="text-center">
            <div className="text-white/40 text-xs uppercase tracking-wider">{l}</div>
            <div className="text-white font-bold text-lg mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── STEP HEADER ── */
  const STEP_LABELS = ["Income & Employment", "Assets & Loans", "Compliance"];

  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-ink/[0.06] px-5 py-3">
        <div className="mx-auto max-w-[600px] flex items-center gap-4">
          {step > 1 && (
            <button onClick={() => setStep(s=>s-1)} className="w-8 h-8 rounded-full bg-ink/[0.06] flex items-center justify-center flex-shrink-0">
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex-1">
            <div className="flex gap-1.5 mb-1.5">
              {[1,2,3].map(i => (
                <div key={i} className={[
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  i < step ? "bg-ficium" : i === step ? "bg-ficium/60" : "bg-ink/10"
                ].join(" ")} />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Step {step + 2} of 5 — {STEP_LABELS[step-1]}</span>
              <span className="text-xs font-bold" style={{ color: h.colour }}>Score: {h.score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health score mini bar */}
      <div className="mx-auto max-w-[600px] px-5 pt-5 pb-2">
        <div className="rounded-2xl border border-ink/[0.07] bg-white p-4 flex items-center gap-4 shadow-sm">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-medium">Financial health</span>
              <span className="text-sm font-bold" style={{ color: h.colour }}>{h.label} · {h.score}/100</span>
            </div>
            <div className="w-full h-2 bg-ink/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width:`${h.score}%`, backgroundColor: h.colour }} />
            </div>
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{h.insight}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-display text-3xl font-bold" style={{ color: h.colour }}>{h.score}</div>
            <div className="text-[10px] text-muted">/ 100</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[600px] px-5 pb-16">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>

          {/* ================================================================ STEP 1 ================================================================ */}
          {step === 1 && (
            <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">How do you earn?</h2>
                <p className="text-sm text-muted mt-1">Select what best describes you</p>
              </div>

              {/* Employment card grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {EMP_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = employmentStatus === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setValue("employmentStatus", opt.value as FormData["employmentStatus"], { shouldValidate: true })}
                      className={[
                        "relative flex flex-col items-start gap-2 p-4 rounded-2xl border-[1.5px] transition-all text-left",
                        active
                          ? "bg-ficium text-white border-ficium shadow-lg shadow-ficium/20 scale-[1.02]"
                          : "bg-white border-ink/10 hover:border-ficium/40 hover:bg-ficium/[0.02]"
                      ].join(" ")}>
                      <div className={["w-9 h-9 rounded-xl grid place-items-center", active?"bg-white/20":"bg-ficium/10"].join(" ")}>
                        <Icon size={18} className={active?"text-white":"text-ficium"} />
                      </div>
                      <div>
                        <div className="font-semibold text-[14px]">{opt.label}</div>
                        <div className={["text-[11px] mt-0.5", active?"text-white/70":"text-muted"].join(" ")}>{opt.desc}</div>
                      </div>
                      {active && <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center"><Check size={11} className="text-ficium" strokeWidth={3}/></div>}
                    </button>
                  );
                })}
              </div>
              {errors.employmentStatus && <p className="text-xs text-red-600 -mt-3">{errors.employmentStatus.message}</p>}

              {/* Conditional employer fields */}
              {employmentStatus === "employed" && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Employment details</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Employer" htmlFor="employerName" error={errors.employerName?.message}>
                      <Input id="employerName" invalid={!!errors.employerName} {...register("employerName")} />
                    </Field>
                    <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.message}>
                      <Input id="jobTitle" invalid={!!errors.jobTitle} {...register("jobTitle")} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Industry" htmlFor="industry" optional>
                      <Input id="industry" placeholder="e.g. Banking" {...register("industry")} />
                    </Field>
                    <Field label="Employment type" htmlFor="employmentType" error={errors.employmentType?.message}>
                      <Select id="employmentType" defaultValue="" invalid={!!errors.employmentType} {...register("employmentType")}>
                        <option value="" disabled>Select</option>
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Years at this employer" htmlFor="yearsOfEmployment" optional>
                    <Select id="yearsOfEmployment" defaultValue="" {...register("yearsOfEmployment", { valueAsNumber: true })}>
                      <option value="">—</option>
                      <option value={0.5}>Less than 1 year</option>
                      <option value={2}>1–3 years</option>
                      <option value={4}>3–5 years</option>
                      <option value={7}>5–10 years</option>
                      <option value={15}>10+ years</option>
                    </Select>
                  </Field>
                </div>
              )}

              {(employmentStatus === "self_employed" || employmentStatus === "business_owner") && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Business details</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={employmentStatus==="business_owner"?"Company name":"Business name"} htmlFor="businessName" error={errors.businessName?.message}>
                      <Input id="businessName" invalid={!!errors.businessName} {...register("businessName")} />
                    </Field>
                    <Field label="BRN" htmlFor="brnNumber" optional>
                      <Input id="brnNumber" placeholder="C12345678" {...register("brnNumber")} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Industry" htmlFor="industry" optional>
                      <Input id="industry" {...register("industry")} />
                    </Field>
                    <Field label="Years in business" htmlFor="yearsInBusiness" optional>
                      <Select id="yearsInBusiness" defaultValue="" {...register("yearsInBusiness", { valueAsNumber: true })}>
                        <option value="">—</option>
                        <option value={0.5}>Less than 1 year</option>
                        <option value={2}>1–3 years</option>
                        <option value={4}>3–5 years</option>
                        <option value={7}>5+ years</option>
                      </Select>
                    </Field>
                  </div>
                  {employmentStatus === "business_owner" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Annual revenue (MUR)" htmlFor="annualRevenue" optional>
                        <Input id="annualRevenue" type="number" inputMode="numeric" {...register("annualRevenue", { valueAsNumber: true })} />
                      </Field>
                      <Field label="Employees" htmlFor="numberOfEmployees" optional>
                        <Input id="numberOfEmployees" type="number" inputMode="numeric" {...register("numberOfEmployees", { valueAsNumber: true })} />
                      </Field>
                    </div>
                  )}
                  {employmentStatus === "self_employed" && (
                    <Field label="Avg monthly revenue (MUR)" htmlFor="averageMonthlyRevenue" optional>
                      <Input id="averageMonthlyRevenue" type="number" inputMode="numeric" {...register("averageMonthlyRevenue", { valueAsNumber: true })} />
                    </Field>
                  )}
                </div>
              )}

              {employmentStatus === "freelance" && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Freelance details</div>
                  <Field label="Primary profession" htmlFor="primaryProfession" optional>
                    <Input id="primaryProfession" placeholder="e.g. Software developer" {...register("primaryProfession")} />
                  </Field>
                  <Field label="Primary clients region" htmlFor="primaryClientsRegion" optional>
                    <Input id="primaryClientsRegion" placeholder="e.g. Europe, Middle East" {...register("primaryClientsRegion")} />
                  </Field>
                </div>
              )}

              {employmentStatus === "student" && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <Field label="Institution" htmlFor="institutionName" optional>
                    <Input id="institutionName" {...register("institutionName")} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Sponsor" htmlFor="sponsorType" optional>
                      <Select id="sponsorType" defaultValue="" {...register("sponsorType")}>
                        <option value="">—</option>
                        <option value="parents">Parents</option>
                        <option value="self">Self</option>
                        <option value="scholarship">Scholarship</option>
                        <option value="employer">Employer</option>
                        <option value="other">Other</option>
                      </Select>
                    </Field>
                    <Field label="Monthly allowance" htmlFor="monthlyAllowance" optional>
                      <Input id="monthlyAllowance" type="number" inputMode="numeric" {...register("monthlyAllowance", { valueAsNumber: true })} />
                    </Field>
                  </div>
                </div>
              )}

              {employmentStatus === "retired" && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <Field label="Pension income (MUR/month)" htmlFor="pensionIncome" optional>
                    <Input id="pensionIncome" type="number" inputMode="numeric" {...register("pensionIncome", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Other income sources" htmlFor="otherIncomeSources" optional>
                    <Input id="otherIncomeSources" placeholder="Rental, dividends…" {...register("otherIncomeSources")} />
                  </Field>
                </div>
              )}

              {/* Income inputs */}
              {employmentStatus && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in duration-200">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Monthly income</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Main income (MUR)" htmlFor="monthlyIncome" error={errors.monthlyIncome?.message}>
                      <Input id="monthlyIncome" type="number" inputMode="numeric" placeholder="65 000"
                        invalid={!!errors.monthlyIncome} {...register("monthlyIncome", { valueAsNumber: true })} />
                    </Field>
                    <Field label="Additional income" htmlFor="additionalIncome" optional>
                      <Input id="additionalIncome" type="number" inputMode="numeric" placeholder="0"
                        {...register("additionalIncome", { valueAsNumber: true })} />
                    </Field>
                  </div>

                  {/* Dependants bubbles */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-muted" />
                      <span className="text-sm font-medium text-ink">Financial dependants</span>
                      <span className="text-xs text-muted">(children, spouse, parents)</span>
                    </div>
                    <Controller control={control} name="dependants" render={({ field }) => (
                      <div className="flex gap-2 flex-wrap">
                        {[0,1,2,3,4,5,6,7].map(n => (
                          <button key={n} type="button"
                            onClick={() => field.onChange(n)}
                            className={[
                              "w-10 h-10 rounded-full text-sm font-bold border-[1.5px] transition-all",
                              field.value === n
                                ? "bg-ficium text-white border-ficium scale-110 shadow-md shadow-ficium/20"
                                : "bg-white text-ink border-ink/15 hover:border-ficium/50"
                            ].join(" ")}>
                            {n === 7 ? "7+" : n}
                          </button>
                        ))}
                      </div>
                    )} />
                  </div>
                </div>
              )}

              <StepButton onClick={goNext} disabled={!employmentStatus} />
            </div>
          )}

          {/* ================================================================ STEP 2 ================================================================ */}
          {step === 2 && (
            <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">What do you own?</h2>
                <p className="text-sm text-muted mt-1">Tap each category to add a value</p>
              </div>

              {/* Asset accordion cards */}
              <div className="flex flex-col gap-2">
                {ASSET_ROWS.map(row => {
                  const isOpen = expandedAsset === row.name;
                  const val = Number((allWatched as Record<string, unknown>)[row.name]) || 0;
                  return (
                    <div key={row.name} className={[
                      "rounded-2xl border overflow-hidden transition-all",
                      isOpen ? "border-ficium/40 bg-white shadow-sm" : "border-ink/[0.07] bg-white"
                    ].join(" ")}>
                      <button type="button" onClick={() => setExpandedAsset(isOpen ? null : row.name)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                        <span className="text-2xl w-8 text-center">{row.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-[14px]">{row.label}</div>
                          <div className="text-xs text-muted">{row.desc}</div>
                        </div>
                        <div className="text-right">
                          <div className={["text-sm font-bold", val>0?"text-ficium":"text-muted"].join(" ")}>
                            {val > 0 ? formatMUR(val) : "Rs 0"}
                          </div>
                          <ChevronRight size={14} className={["text-muted transition-transform", isOpen?"rotate-90":""].join(" ")} />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                          <Input type="number" inputMode="numeric" placeholder="0" autoFocus
                            {...register(row.name, { valueAsNumber: true })} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Net worth ticker */}
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-ink text-white">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} />
                  <span className="font-semibold">Total net worth</span>
                </div>
                <span className="font-display text-2xl font-bold">{formatMUR(h.totalAssets)}</span>
              </div>

              {/* Loans */}
              <div>
                <h2 className="font-display text-xl font-bold mb-1">Existing loans?</h2>
                <p className="text-sm text-muted mb-4">Banks use this for affordability checks</p>

                <div className="flex gap-3 mb-4">
                  <Controller control={control} name="hasExistingLoans" render={({ field }) => (
                    <>
                      {[{v:false,l:"No loans 🎉"},{v:true,l:"Yes, I have loans"}].map(opt => (
                        <button key={String(opt.v)} type="button"
                          onClick={() => field.onChange(opt.v)}
                          className={[
                            "flex-1 py-3 rounded-2xl text-sm font-semibold border-[1.5px] transition-all",
                            field.value === opt.v
                              ? "bg-ink text-white border-ink"
                              : "bg-white text-ink border-ink/15 hover:border-ink/30"
                          ].join(" ")}>
                          {opt.l}
                        </button>
                      ))}
                    </>
                  )} />
                </div>

                {hasLoans && (
                  <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* DTI indicator */}
                    {h.totalRepayment > 0 && h.totalIncome > 0 && (
                      <div className={`px-4 py-3 rounded-xl text-[13px] font-medium border ${
                        h.dti < 30 ? "bg-green-50 border-green-200 text-green-700"
                        : h.dti < 45 ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-red-50 border-red-200 text-red-700"
                      }`}>
                        Debt-to-income: <strong>{h.dti.toFixed(0)}%</strong> —{" "}
                        {h.dti<30?"Great. Banks will be comfortable with this."
                        :h.dti<45?"Moderate. May affect some rates."
                        :"High. This could limit your bids."}
                      </div>
                    )}

                    {loanFields.map((field, i) => (
                      <div key={field.id} className="p-4 rounded-2xl bg-white border border-ink/[0.07]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold">Loan #{i+1}</span>
                          <button type="button" onClick={() => removeLoan(i)}
                            className="text-muted hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Type" htmlFor={`loans.${i}.loanType`}>
                            <Select id={`loans.${i}.loanType`} defaultValue="" {...register(`loans.${i}.loanType` as const)}>
                              <option value="" disabled>Type</option>
                              <option value="personal">Personal</option>
                              <option value="mortgage">Mortgage</option>
                              <option value="vehicle">Vehicle</option>
                              <option value="business">Business</option>
                              <option value="credit_card">Credit card</option>
                              <option value="other">Other</option>
                            </Select>
                          </Field>
                          <Field label="Bank" htmlFor={`loans.${i}.bankName`} error={errors.loans?.[i]?.bankName?.message}>
                            <Input id={`loans.${i}.bankName`} {...register(`loans.${i}.bankName` as const)} />
                          </Field>
                          <Field label="Outstanding (MUR)" htmlFor={`loans.${i}.outstandingAmount`}>
                            <Input id={`loans.${i}.outstandingAmount`} type="number" inputMode="numeric"
                              {...register(`loans.${i}.outstandingAmount` as const, { valueAsNumber: true })} />
                          </Field>
                          <Field label="Monthly repayment" htmlFor={`loans.${i}.monthlyRepayment`}>
                            <Input id={`loans.${i}.monthlyRepayment`} type="number" inputMode="numeric"
                              {...register(`loans.${i}.monthlyRepayment` as const, { valueAsNumber: true })} />
                          </Field>
                        </div>
                      </div>
                    ))}

                    <button type="button"
                      onClick={() => appendLoan({ loanType:"personal", outstandingAmount:0, monthlyRepayment:0, bankName:"" })}
                      className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-ink/15 rounded-2xl text-sm font-semibold text-muted hover:border-ficium hover:text-ficium transition-colors">
                      <Plus size={16} /> Add another loan
                    </button>
                    {errors.loans?.message && <p className="text-xs text-red-600">{errors.loans.message as string}</p>}
                  </div>
                )}
              </div>

              <StepButton onClick={goNext} />
            </div>
          )}

          {/* ================================================================ STEP 3 ================================================================ */}
          {step === 3 && (
            <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">Almost done.</h2>
                <p className="text-sm text-muted mt-1">Required by financial regulations — takes 1 minute</p>
              </div>

              {/* Source of wealth icon grid */}
              <div>
                <div className="text-sm font-semibold text-ink mb-3">Where does your money primarily come from?</div>
                <div className="grid grid-cols-4 gap-2">
                  {WEALTH_OPTIONS.map(opt => {
                    const active = sourceOfWealth === opt.value;
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => setValue("sourceOfWealth", opt.value as FormData["sourceOfWealth"], { shouldValidate: true })}
                        className={[
                          "flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-[1.5px] transition-all",
                          active ? "bg-ficium border-ficium text-white shadow-md shadow-ficium/20 scale-[1.04]"
                          : "bg-white border-ink/10 hover:border-ficium/40"
                        ].join(" ")}>
                        <span className="text-2xl leading-none">{opt.icon}</span>
                        <span className={["text-[11px] font-semibold", active?"text-white":"text-ink"].join(" ")}>{opt.label}</span>
                        {active && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
                {sourceOfWealth === "other" && (
                  <div className="mt-3">
                    <Field label="Please specify" htmlFor="sourceOfWealthOther" error={errors.sourceOfWealthOther?.message}>
                      <Input id="sourceOfWealthOther" {...register("sourceOfWealthOther")} />
                    </Field>
                  </div>
                )}
              </div>

              {/* Tax residency */}
              <Field label="Tax residency" htmlFor="taxResidency" hint="Country where you pay tax">
                <Select id="taxResidency" {...register("taxResidency")}>
                  <option value="MU">🇲🇺 Mauritius</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="ZA">🇿🇦 South Africa</option>
                  <option value="RE">🇷🇪 Réunion</option>
                  <option value="SC">🇸🇨 Seychelles</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="OTHER">🌍 Other</option>
                </Select>
              </Field>

              {/* PEP */}
              <div>
                <div className="text-sm font-semibold text-ink mb-2">Are you a politically exposed person (PEP)?</div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller control={control} name="isPep" render={({ field }) => (
                    <>
                      {[{v:false,l:"No",e:"✓"},{v:true,l:"Yes",e:"!"}].map(opt => (
                        <button key={String(opt.v)} type="button"
                          onClick={() => field.onChange(opt.v)}
                          className={[
                            "flex items-center justify-center gap-2 py-4 rounded-2xl border-[1.5px] text-sm font-bold transition-all",
                            field.value === opt.v
                              ? opt.v ? "bg-amber-500 text-white border-amber-500" : "bg-green-500 text-white border-green-500"
                              : "bg-white text-ink border-ink/15 hover:border-ink/30"
                          ].join(" ")}>
                          <span className="text-lg">{opt.e}</span> {opt.l}
                        </button>
                      ))}
                    </>
                  )} />
                </div>
                {isPep && (
                  <div className="mt-3">
                    <Field label="Describe your PEP status" htmlFor="pepDetails" error={errors.pepDetails?.message}>
                      <Input id="pepDetails" placeholder="Role, country, dates" {...register("pepDetails")} />
                    </Field>
                  </div>
                )}
              </div>

              {/* Credit history toggle cards */}
              <div>
                <div className="text-sm font-semibold text-ink mb-1">Credit history</div>
                <p className="text-xs text-muted mb-3">Have any of these ever applied to you?</p>
                <div className="flex flex-col gap-2">
                  {[
                    { name: "missedRepayments" as const, label: "Missed loan repayments", icon: "⚠️" },
                    { name: "blacklisted" as const,      label: "Blacklisted by a credit bureau", icon: "🚫" },
                    { name: "bankruptcy" as const,       label: "Declared bankruptcy", icon: "📉" },
                    { name: "legalDisputes" as const,    label: "Legal financial disputes", icon: "⚖️" },
                  ].map(item => (
                    <Controller key={item.name} control={control} name={item.name} render={({ field }) => (
                      <button type="button" onClick={() => field.onChange(!field.value)}
                        className={[
                          "flex items-center gap-3 px-4 py-3.5 rounded-2xl border-[1.5px] text-left transition-all",
                          field.value
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-white border-ink/[0.08] text-ink hover:border-ink/20"
                        ].join(" ")}>
                        <span className="text-xl w-7 text-center">{item.icon}</span>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        <div className={[
                          "w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0",
                          field.value ? "bg-red-500 border-red-500" : "border-ink/20"
                        ].join(" ")}>
                          {field.value && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    )} />
                  ))}
                </div>
              </div>

              {/* Privacy note */}
              <div className="flex gap-3 px-4 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-2xl">
                <span className="text-lg flex-shrink-0">🔒</span>
                <p className="text-[12px] text-ink/70 leading-relaxed">
                  Banks see your profile anonymized — never your name or contact details — until you accept a bid.
                </p>
              </div>

              {/* Final score encouragement */}
              {h.score >= 50 && (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-ficium/10 to-mint/10 border border-ficium/20 rounded-2xl">
                  <Sparkles size={20} className="text-ficium flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Score: {h.score}/100 — {h.label}</p>
                    <p className="text-[12px] text-muted">{h.insight}</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-[13px]">
                  {submitError}
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-ficium text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-ficium/90 transition-all disabled:opacity-60 shadow-lg shadow-ficium/25">
                {isSubmitting ? (
                  <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
                ) : (
                  <>Complete my profile <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
================================================================ */

function StepButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl bg-ficium text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-ficium/90 transition-all disabled:opacity-40 shadow-lg shadow-ficium/25">
      Continue <ArrowRight size={18} />
    </button>
  );
}

function formatMUR(n: number): string {
  return new Intl.NumberFormat("en-MU", { style: "currency", currency: "MUR", maximumFractionDigits: 0 }).format(n || 0);
}
