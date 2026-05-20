import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Briefcase,
  Wallet,
  CreditCard,
  Shield,
  Trash2,
  Plus,
  TrendingUp,
} from "lucide-react";
import { submitDossier } from "../api/dossier";
import { Button, Card, Field, Input, Select } from "../../../shared/ui";

/* ============================================================
   SCHEMA — dynamic with conditional required fields
   ============================================================ */

const employmentStatusEnum = z.enum([
  "employed", "self_employed", "business_owner", "freelance", "retired", "student", "unemployed",
]);

const loanSchema = z.object({
  loanType: z.enum(["personal", "mortgage", "vehicle", "business", "credit_card", "other"]),
  outstandingAmount: z.number().min(0).max(1_000_000_000),
  monthlyRepayment: z.number().min(0).max(10_000_000),
  bankName: z.string().trim().min(1, "Bank name required").max(100),
  remainingMonths: z.number().int().min(0).max(600).optional().or(z.nan().transform(() => undefined)),
});

const schema = z.object({
  employmentStatus: employmentStatusEnum,
  monthlyIncome: z.number().min(0).max(100_000_000),
  additionalIncome: z.number().min(0).max(100_000_000).default(0),

  // Employment conditional fields — all optional, validated by superRefine below
  employerName: z.string().max(150).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  yearsOfEmployment: z.number().min(0).max(80).optional().or(z.nan().transform(() => undefined)),
  employmentType: z.enum(["permanent", "contract", "temporary"]).optional(),
  workEmail: z.string().email("Invalid work email").optional().or(z.literal("")),
  employerAddress: z.string().max(300).optional().or(z.literal("")),

  businessName: z.string().max(150).optional().or(z.literal("")),
  brnNumber: z.string().max(40).optional().or(z.literal("")),
  yearsInBusiness: z.number().min(0).max(100).optional().or(z.nan().transform(() => undefined)),
  averageMonthlyRevenue: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  businessAddress: z.string().max(300).optional().or(z.literal("")),
  taxRegistrationNumber: z.string().max(50).optional().or(z.literal("")),

  companyType: z.string().max(60).optional().or(z.literal("")),
  numberOfEmployees: z.number().int().min(0).max(1_000_000).optional().or(z.nan().transform(() => undefined)),
  annualRevenue: z.number().min(0).optional().or(z.nan().transform(() => undefined)),

  primaryProfession: z.string().max(120).optional().or(z.literal("")),
  primaryClientsRegion: z.string().max(120).optional().or(z.literal("")),
  portfolioWebsite: z.string().max(200).optional().or(z.literal("")),

  pensionIncome: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  otherIncomeSources: z.string().max(300).optional().or(z.literal("")),

  institutionName: z.string().max(150).optional().or(z.literal("")),
  sponsorType: z.enum(["parents", "self", "scholarship", "employer", "other"]).optional(),
  monthlyAllowance: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  partTimeEmployment: z.boolean().default(false),

  // Assets
  savings: z.number().min(0).max(10_000_000_000).default(0),
  investments: z.number().min(0).max(10_000_000_000).default(0),
  propertyValue: z.number().min(0).max(10_000_000_000).default(0),
  vehicleValue: z.number().min(0).max(10_000_000_000).default(0),
  businessAssets: z.number().min(0).max(10_000_000_000).default(0),
  otherAssets: z.number().min(0).max(10_000_000_000).default(0),

  // Loans
  hasExistingLoans: z.boolean(),
  loans: z.array(loanSchema).default([]),

  // Compliance
  sourceOfWealth: z.enum(["salary", "business", "investments", "inheritance", "property", "savings", "other"]).optional(),
  sourceOfWealthOther: z.string().max(200).optional().or(z.literal("")),
  isPep: z.boolean().default(false),
  pepDetails: z.string().max(300).optional().or(z.literal("")),
  taxResidency: z.string().min(2).max(60).default("MU"),
  missedRepayments: z.boolean().default(false),
  blacklisted: z.boolean().default(false),
  bankruptcy: z.boolean().default(false),
  legalDisputes: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // Conditional required fields based on employment status
  if (data.employmentStatus === "employed") {
    if (!data.employerName?.trim()) ctx.addIssue({ code: "custom", path: ["employerName"], message: "Employer name required" });
    if (!data.jobTitle?.trim()) ctx.addIssue({ code: "custom", path: ["jobTitle"], message: "Job title required" });
    if (!data.employmentType) ctx.addIssue({ code: "custom", path: ["employmentType"], message: "Select employment type" });
  }
  if (data.employmentStatus === "self_employed") {
    if (!data.businessName?.trim()) ctx.addIssue({ code: "custom", path: ["businessName"], message: "Business name required" });
    if (!data.brnNumber?.trim()) ctx.addIssue({ code: "custom", path: ["brnNumber"], message: "BRN required" });
  }
  if (data.employmentStatus === "business_owner") {
    if (!data.businessName?.trim()) ctx.addIssue({ code: "custom", path: ["businessName"], message: "Company name required" });
    if (!data.brnNumber?.trim()) ctx.addIssue({ code: "custom", path: ["brnNumber"], message: "BRN required" });
  }
  if (data.hasExistingLoans && data.loans.length === 0) {
    ctx.addIssue({ code: "custom", path: ["loans"], message: "Add at least one loan or select 'No' above" });
  }
  if (data.isPep && !data.pepDetails?.trim()) {
    ctx.addIssue({ code: "custom", path: ["pepDetails"], message: "Please describe your PEP status" });
  }
  if (data.sourceOfWealth === "other" && !data.sourceOfWealthOther?.trim()) {
    ctx.addIssue({ code: "custom", path: ["sourceOfWealthOther"], message: "Specify your source of wealth" });
  }
});

type FormData = z.infer<typeof schema>;

/* ============================================================
   PAGE
   ============================================================ */

export default function Dossier() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<z.input<typeof schema>, any, FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      employmentStatus: undefined,
      monthlyIncome: 0,
      additionalIncome: 0,
      hasExistingLoans: false,
      loans: [],
      savings: 0,
      investments: 0,
      propertyValue: 0,
      vehicleValue: 0,
      businessAssets: 0,
      otherAssets: 0,
      taxResidency: "MU",
      isPep: false,
      partTimeEmployment: false,
      missedRepayments: false,
      blacklisted: false,
      bankruptcy: false,
      legalDisputes: false,
    },
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = form;

  // Watch fields that drive conditional rendering
  const employmentStatus = useWatch({ control, name: "employmentStatus" });
  const hasExistingLoans = useWatch({ control, name: "hasExistingLoans" });
  const isPep = useWatch({ control, name: "isPep" });
  const sourceOfWealth = useWatch({ control, name: "sourceOfWealth" });

  // Watch for live calculations
  const watchedAssets = useWatch({ control, name: ["savings", "investments", "propertyValue", "vehicleValue", "businessAssets", "otherAssets"] });
  const watchedIncome = useWatch({ control, name: ["monthlyIncome", "additionalIncome"] });

const totalNetWorth = (watchedAssets ?? []).reduce<number>((sum, v) => (sum ?? 0) + (Number(v) || 0), 0);
const totalIncome = (watchedIncome ?? []).reduce<number>((sum, v) => (sum ?? 0) + (Number(v) || 0), 0);

  const { fields: loanFields, append: appendLoan, remove: removeLoan } = useFieldArray({
    control,
    name: "loans",
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    const result = await submitDossier({
      employmentStatus: data.employmentStatus,
      monthlyIncome: data.monthlyIncome,
      additionalIncome: data.additionalIncome,
      employmentDetails: {
        employerName: data.employerName || undefined,
        industry: data.industry || undefined,
        jobTitle: data.jobTitle || undefined,
        yearsOfEmployment: data.yearsOfEmployment,
        employmentType: data.employmentType,
        workEmail: data.workEmail || undefined,
        employerAddress: data.employerAddress || undefined,
        businessName: data.businessName || undefined,
        brnNumber: data.brnNumber || undefined,
        yearsInBusiness: data.yearsInBusiness,
        averageMonthlyRevenue: data.averageMonthlyRevenue,
        businessAddress: data.businessAddress || undefined,
        taxRegistrationNumber: data.taxRegistrationNumber || undefined,
        companyType: data.companyType || undefined,
        numberOfEmployees: data.numberOfEmployees,
        annualRevenue: data.annualRevenue,
        primaryProfession: data.primaryProfession || undefined,
        primaryClientsRegion: data.primaryClientsRegion || undefined,
        portfolioWebsite: data.portfolioWebsite || undefined,
        pensionIncome: data.pensionIncome,
        otherIncomeSources: data.otherIncomeSources || undefined,
        institutionName: data.institutionName || undefined,
        sponsorType: data.sponsorType,
        monthlyAllowance: data.monthlyAllowance,
        partTimeEmployment: data.partTimeEmployment,
      },
      assets: {
        savings: data.savings,
        investments: data.investments,
        propertyValue: data.propertyValue,
        vehicleValue: data.vehicleValue,
        businessAssets: data.businessAssets,
        otherAssets: data.otherAssets,
      },
      hasExistingLoans: data.hasExistingLoans,
      loans: data.loans.map((l) => ({
        loanType: l.loanType,
        outstandingAmount: l.outstandingAmount,
        monthlyRepayment: l.monthlyRepayment,
        bankName: l.bankName,
        remainingMonths: l.remainingMonths,
      })),
      compliance: {
        sourceOfWealth: data.sourceOfWealth,
        sourceOfWealthOther: data.sourceOfWealthOther || undefined,
        isPep: data.isPep,
        pepDetails: data.pepDetails || undefined,
        taxResidency: data.taxResidency,
        missedRepayments: data.missedRepayments,
        blacklisted: data.blacklisted,
        bankruptcy: data.bankruptcy,
        legalDisputes: data.legalDisputes,
      },
    });

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[680px]">
        {/* Back */}
        <Link
          to="/onboarding/kyc"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <span className="ml-2 text-xs text-muted">Step 3 of 3</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Financial profile
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8">
          Tell us about your finances so banks can give you accurate offers. The more complete your profile, the better the bids.
        </p>

        {/* Live score preview */}
        <Card padded={false} className="p-4 mb-6 bg-gradient-to-br from-ficium/[0.04] to-mint/[0.06] border-ficium/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ficium/10 text-ficium grid place-items-center">
              <TrendingUp size={18} />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted">Profile so far</div>
              <div className="text-sm">
                <span className="font-bold text-ink">{formatMUR(totalIncome)}</span>
                <span className="text-muted"> /mo income · </span>
                <span className="font-bold text-ink">{formatMUR(totalNetWorth)}</span>
                <span className="text-muted"> net worth</span>
              </div>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

          {/* ─────────── EMPLOYMENT ─────────── */}
          <SectionCard icon={<Briefcase size={18} />} title="Employment" subtitle="Your main source of income">
            <Field label="Employment status" htmlFor="employmentStatus" error={errors.employmentStatus?.message}>
              <Select
                id="employmentStatus"
                defaultValue=""
                invalid={!!errors.employmentStatus}
                {...register("employmentStatus")}
              >
                <option value="" disabled>Choose your situation</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-employed</option>
                <option value="business_owner">Business owner</option>
                <option value="freelance">Freelancer</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="unemployed">Unemployed</option>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Monthly income (MUR)" htmlFor="monthlyIncome" error={errors.monthlyIncome?.message}>
                <Input id="monthlyIncome" type="number" inputMode="numeric" placeholder="65000"
                  invalid={!!errors.monthlyIncome}
                  {...register("monthlyIncome", { valueAsNumber: true })} />
              </Field>
              <Field label="Additional income (MUR)" htmlFor="additionalIncome" optional error={errors.additionalIncome?.message}>
                <Input id="additionalIncome" type="number" inputMode="numeric" placeholder="0"
                  invalid={!!errors.additionalIncome}
                  {...register("additionalIncome", { valueAsNumber: true })} />
              </Field>
            </div>

            {/* Conditional: Employed */}
            {employmentStatus === "employed" && (
              <ConditionalGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Employer name" htmlFor="employerName" error={errors.employerName?.message}>
                    <Input id="employerName" invalid={!!errors.employerName} {...register("employerName")} />
                  </Field>
                  <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.message}>
                    <Input id="jobTitle" invalid={!!errors.jobTitle} {...register("jobTitle")} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Industry" htmlFor="industry" optional error={errors.industry?.message}>
                    <Input id="industry" placeholder="e.g. Banking" {...register("industry")} />
                  </Field>
                  <Field label="Years of employment" htmlFor="yearsOfEmployment" optional error={errors.yearsOfEmployment?.message}>
                    <Input id="yearsOfEmployment" type="number" step="0.5" inputMode="decimal"
                      {...register("yearsOfEmployment", { valueAsNumber: true })} />
                  </Field>
                </div>
                <Field label="Employment type" htmlFor="employmentType" error={errors.employmentType?.message}>
                  <Select id="employmentType" defaultValue="" invalid={!!errors.employmentType} {...register("employmentType")}>
                    <option value="" disabled>Select type</option>
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                  </Select>
                </Field>
                <Field label="Work email" htmlFor="workEmail" optional error={errors.workEmail?.message}>
                  <Input id="workEmail" type="email" placeholder="name@company.com" {...register("workEmail")} />
                </Field>
              </ConditionalGroup>
            )}

            {/* Conditional: Self-employed */}
            {employmentStatus === "self_employed" && (
              <ConditionalGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Business name" htmlFor="businessName" error={errors.businessName?.message}>
                    <Input id="businessName" invalid={!!errors.businessName} {...register("businessName")} />
                  </Field>
                  <Field label="BRN" htmlFor="brnNumber" error={errors.brnNumber?.message}>
                    <Input id="brnNumber" placeholder="C12345678" invalid={!!errors.brnNumber} {...register("brnNumber")} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Industry" htmlFor="industry" optional>
                    <Input id="industry" {...register("industry")} />
                  </Field>
                  <Field label="Years in business" htmlFor="yearsInBusiness" optional>
                    <Input id="yearsInBusiness" type="number" step="0.5"
                      {...register("yearsInBusiness", { valueAsNumber: true })} />
                  </Field>
                </div>
                <Field label="Avg monthly revenue (MUR)" htmlFor="averageMonthlyRevenue" optional>
                  <Input id="averageMonthlyRevenue" type="number" inputMode="numeric"
                    {...register("averageMonthlyRevenue", { valueAsNumber: true })} />
                </Field>
                <Field label="Tax registration number" htmlFor="taxRegistrationNumber" optional>
                  <Input id="taxRegistrationNumber" {...register("taxRegistrationNumber")} />
                </Field>
              </ConditionalGroup>
            )}

            {/* Conditional: Business owner */}
            {employmentStatus === "business_owner" && (
              <ConditionalGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Company name" htmlFor="businessName" error={errors.businessName?.message}>
                    <Input id="businessName" invalid={!!errors.businessName} {...register("businessName")} />
                  </Field>
                  <Field label="BRN" htmlFor="brnNumber" error={errors.brnNumber?.message}>
                    <Input id="brnNumber" placeholder="C12345678" invalid={!!errors.brnNumber} {...register("brnNumber")} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Company type" htmlFor="companyType" optional>
                    <Select id="companyType" defaultValue="" {...register("companyType")}>
                      <option value="">—</option>
                      <option value="private_limited">Private Limited</option>
                      <option value="public_limited">Public Limited</option>
                      <option value="partnership">Partnership</option>
                      <option value="sole_proprietor">Sole Proprietor</option>
                    </Select>
                  </Field>
                  <Field label="Industry" htmlFor="industry" optional>
                    <Input id="industry" {...register("industry")} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Annual revenue (MUR)" htmlFor="annualRevenue" optional>
                    <Input id="annualRevenue" type="number" inputMode="numeric"
                      {...register("annualRevenue", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Employees" htmlFor="numberOfEmployees" optional>
                    <Input id="numberOfEmployees" type="number" inputMode="numeric"
                      {...register("numberOfEmployees", { valueAsNumber: true })} />
                  </Field>
                </div>
              </ConditionalGroup>
            )}

            {/* Conditional: Freelancer */}
            {employmentStatus === "freelance" && (
              <ConditionalGroup>
                <Field label="Primary profession" htmlFor="primaryProfession" optional>
                  <Input id="primaryProfession" placeholder="e.g. Software developer" {...register("primaryProfession")} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Years freelancing" htmlFor="yearsInBusiness" optional>
                    <Input id="yearsInBusiness" type="number" step="0.5"
                      {...register("yearsInBusiness", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Primary clients region" htmlFor="primaryClientsRegion" optional>
                    <Input id="primaryClientsRegion" placeholder="e.g. Europe" {...register("primaryClientsRegion")} />
                  </Field>
                </div>
                <Field label="Portfolio website" htmlFor="portfolioWebsite" optional>
                  <Input id="portfolioWebsite" placeholder="https://..." {...register("portfolioWebsite")} />
                </Field>
              </ConditionalGroup>
            )}

            {/* Conditional: Retired */}
            {employmentStatus === "retired" && (
              <ConditionalGroup>
                <Field label="Pension income (MUR/month)" htmlFor="pensionIncome" optional>
                  <Input id="pensionIncome" type="number" inputMode="numeric"
                    {...register("pensionIncome", { valueAsNumber: true })} />
                </Field>
                <Field label="Other income sources" htmlFor="otherIncomeSources" optional>
                  <Input id="otherIncomeSources" placeholder="Rental income, dividends, etc." {...register("otherIncomeSources")} />
                </Field>
              </ConditionalGroup>
            )}

            {/* Conditional: Student */}
            {employmentStatus === "student" && (
              <ConditionalGroup>
                <Field label="Institution" htmlFor="institutionName" optional>
                  <Input id="institutionName" {...register("institutionName")} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Sponsor" htmlFor="sponsorType" optional>
                    <Select id="sponsorType" defaultValue="" {...register("sponsorType")}>
                      <option value="">—</option>
                      <option value="parents">Parents</option>
                      <option value="self">Self-funded</option>
                      <option value="scholarship">Scholarship</option>
                      <option value="employer">Employer</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Monthly allowance (MUR)" htmlFor="monthlyAllowance" optional>
                    <Input id="monthlyAllowance" type="number" inputMode="numeric"
                      {...register("monthlyAllowance", { valueAsNumber: true })} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("partTimeEmployment")} className="w-4 h-4 accent-ficium" />
                  Has part-time employment
                </label>
              </ConditionalGroup>
            )}
          </SectionCard>

          {/* ─────────── ASSETS ─────────── */}
          <SectionCard icon={<Wallet size={18} />} title="Assets" subtitle="A complete picture helps banks offer better rates">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AssetField label="Savings" name="savings" register={register} errors={errors} />
              <AssetField label="Investments" name="investments" register={register} errors={errors} />
              <AssetField label="Property value" name="propertyValue" register={register} errors={errors} />
              <AssetField label="Vehicle value" name="vehicleValue" register={register} errors={errors} />
              <AssetField label="Business assets" name="businessAssets" register={register} errors={errors} />
              <AssetField label="Other assets" name="otherAssets" register={register} errors={errors} />
            </div>
            <div className="mt-3 px-3.5 py-3 bg-mint/[0.15] border border-mint/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-ink" />
                <span className="text-sm font-semibold">Total net worth</span>
              </div>
              <span className="font-display text-lg font-bold">{formatMUR(totalNetWorth)}</span>
            </div>
          </SectionCard>

          {/* ─────────── EXISTING LOANS ─────────── */}
          <SectionCard icon={<CreditCard size={18} />} title="Existing loans" subtitle="Banks need this for affordability checks">
            <div className="flex gap-2">
              <Controller
                control={control}
                name="hasExistingLoans"
                render={({ field }) => (
                  <>
                    <ToggleChip active={field.value === false} onClick={() => field.onChange(false)}>No loans</ToggleChip>
                    <ToggleChip active={field.value === true} onClick={() => field.onChange(true)}>Yes, I have loans</ToggleChip>
                  </>
                )}
              />
            </div>

            {hasExistingLoans && (
              <ConditionalGroup>
                {loanFields.map((field, index) => (
                  <Card key={field.id} padded={false} className="p-4 bg-cream">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Loan #{index + 1}</div>
                      <button type="button" onClick={() => removeLoan(index)} className="text-muted hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Type" htmlFor={`loans.${index}.loanType`} error={errors.loans?.[index]?.loanType?.message}>
                        <Select id={`loans.${index}.loanType`} defaultValue="" {...register(`loans.${index}.loanType` as const)}>
                          <option value="" disabled>Type</option>
                          <option value="personal">Personal</option>
                          <option value="mortgage">Mortgage</option>
                          <option value="vehicle">Vehicle</option>
                          <option value="business">Business</option>
                          <option value="credit_card">Credit card</option>
                          <option value="other">Other</option>
                        </Select>
                      </Field>
                      <Field label="Bank" htmlFor={`loans.${index}.bankName`} error={errors.loans?.[index]?.bankName?.message}>
                        <Input id={`loans.${index}.bankName`} {...register(`loans.${index}.bankName` as const)} />
                      </Field>
                      <Field label="Outstanding (MUR)" htmlFor={`loans.${index}.outstandingAmount`} error={errors.loans?.[index]?.outstandingAmount?.message}>
                        <Input id={`loans.${index}.outstandingAmount`} type="number" inputMode="numeric"
                          {...register(`loans.${index}.outstandingAmount` as const, { valueAsNumber: true })} />
                      </Field>
                      <Field label="Monthly repayment (MUR)" htmlFor={`loans.${index}.monthlyRepayment`} error={errors.loans?.[index]?.monthlyRepayment?.message}>
                        <Input id={`loans.${index}.monthlyRepayment`} type="number" inputMode="numeric"
                          {...register(`loans.${index}.monthlyRepayment` as const, { valueAsNumber: true })} />
                      </Field>
                    </div>
                    <Field label="Remaining months" htmlFor={`loans.${index}.remainingMonths`} optional>
                      <Input id={`loans.${index}.remainingMonths`} type="number" inputMode="numeric"
                        {...register(`loans.${index}.remainingMonths` as const, { valueAsNumber: true })} />
                    </Field>
                  </Card>
                ))}
                <button
                  type="button"
                  onClick={() => appendLoan({ loanType: "personal", outstandingAmount: 0, monthlyRepayment: 0, bankName: "" })}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-ink/15 rounded-xl text-sm font-semibold text-muted hover:border-ficium hover:text-ficium transition-colors"
                >
                  <Plus size={16} /> Add another loan
                </button>
                {errors.loans?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.loans.message as string}</p>
                )}
              </ConditionalGroup>
            )}
          </SectionCard>

          {/* ─────────── COMPLIANCE ─────────── */}
          <SectionCard icon={<Shield size={18} />} title="Compliance" subtitle="Required by financial regulations">
            <Field label="Source of wealth" htmlFor="sourceOfWealth" error={errors.sourceOfWealth?.message}>
              <Select id="sourceOfWealth" defaultValue="" {...register("sourceOfWealth")}>
                <option value="" disabled>Select source</option>
                <option value="salary">Salary / employment</option>
                <option value="business">Business income</option>
                <option value="investments">Investments</option>
                <option value="inheritance">Inheritance</option>
                <option value="property">Property</option>
                <option value="savings">Long-term savings</option>
                <option value="other">Other</option>
              </Select>
            </Field>

            {sourceOfWealth === "other" && (
              <Field label="Please specify" htmlFor="sourceOfWealthOther" error={errors.sourceOfWealthOther?.message}>
                <Input id="sourceOfWealthOther" {...register("sourceOfWealthOther")} />
              </Field>
            )}

            <Field label="Tax residency" htmlFor="taxResidency" hint="Country code where you pay tax" error={errors.taxResidency?.message}>
              <Select id="taxResidency" {...register("taxResidency")}>
                <option value="MU">Mauritius</option>
                <option value="IN">India</option>
                <option value="ZA">South Africa</option>
                <option value="FR">France</option>
                <option value="GB">United Kingdom</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>

            <div className="border-t border-ink/10 pt-4">
              <div className="text-xs font-bold tracking-wide uppercase text-muted mb-3">Politically exposed person</div>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input type="checkbox" {...register("isPep")} className="mt-0.5 w-4 h-4 accent-ficium" />
                <span>I am, or have been, a politically exposed person (PEP), or am closely related to one</span>
              </label>
              {isPep && (
                <div className="mt-3">
                  <Field label="Please describe your PEP status" htmlFor="pepDetails" error={errors.pepDetails?.message}>
                    <Input id="pepDetails" placeholder="Role, country, dates" {...register("pepDetails")} />
                  </Field>
                </div>
              )}
            </div>

            <div className="border-t border-ink/10 pt-4">
              <div className="text-xs font-bold tracking-wide uppercase text-muted mb-3">Credit history</div>
              <p className="text-xs text-muted mb-3">Have any of the following ever applied to you?</p>
              <div className="flex flex-col gap-2.5">
                <CheckboxRow label="Missed loan repayments" {...register("missedRepayments")} />
                <CheckboxRow label="Been blacklisted by a credit bureau" {...register("blacklisted")} />
                <CheckboxRow label="Declared bankruptcy" {...register("bankruptcy")} />
                <CheckboxRow label="Legal financial disputes" {...register("legalDisputes")} />
              </div>
            </div>
          </SectionCard>

          {/* Privacy reassurance */}
          <div className="flex gap-3 px-3.5 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-xl">
            <ShieldCheck size={20} className="text-ficium flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-ink/80 leading-relaxed">
              Banks see your financial profile anonymized — never your name or contact details — until you accept a bid.
            </p>
          </div>

          {submitError && (
            <div role="alert" className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]">
              {submitError}
            </div>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}
            rightIcon={!isSubmitting && <ArrowRight size={18} />} fullWidth className="mt-2">
            Complete setup
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function SectionCard({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-ink/10">
        <div className="w-10 h-10 rounded-xl bg-ficium/10 text-ficium grid place-items-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="font-display text-lg font-bold">{title}</div>
          <div className="text-xs text-muted mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function ConditionalGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-3 border-t border-dashed border-ink/15 flex flex-col gap-4 animate-in fade-in duration-200">
      {children}
    </div>
  );
}

function ToggleChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2.5 rounded-pill text-sm font-semibold border-[1.5px] transition-colors",
        active ? "bg-ink text-cream border-ink" : "bg-transparent text-ink border-ink/15 hover:border-ink/30",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function AssetField({
  label, name, register, errors,
}: { label: string; name: keyof FormData; register: any; errors: any }) {
  return (
    <Field label={label} htmlFor={name} error={errors[name]?.message}>
      <Input id={name} type="number" inputMode="numeric" placeholder="0"
        invalid={!!errors[name]}
        {...register(name, { valueAsNumber: true })} />
    </Field>
  );
}

function CheckboxRow(props: any) {
  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer">
      <input type="checkbox" {...props} className="w-4 h-4 accent-ficium" />
      <span>{props.label}</span>
    </label>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function formatMUR(amount: number): string {
  return new Intl.NumberFormat("en-MU", {
    style: "currency",
    currency: "MUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}