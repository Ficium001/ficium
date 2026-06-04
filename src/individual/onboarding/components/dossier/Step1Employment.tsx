import { Controller }      from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Users, Check }    from "lucide-react";
import { Field, Input, Select } from "@/shared/ui";
import { EMP_OPTIONS }     from "@/individual/onboarding/config/dossierOptions";
import { StepButton }      from "./DossierShared";
import type { DossierInput, DossierData } from "@/individual/onboarding/types/dossier";

interface Step1Props {
  control:          Control<DossierInput>;
  register:         UseFormRegister<DossierInput>;
  errors:           FieldErrors<DossierInput>;
  setValue:         UseFormSetValue<DossierInput>;
  employmentStatus: DossierData["employmentStatus"] | undefined;
  onNext:           () => void;
}

export function Step1Employment({ control, register, errors, setValue, employmentStatus, onNext }: Step1Props) {
  return (
    <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="font-display text-2xl font-bold">How do you earn?</h2>
        <p className="text-sm text-muted mt-1">Select what best describes you</p>
      </div>

      {/* Employment cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {EMP_OPTIONS.map((opt) => {
          const Icon   = opt.icon;
          const active = employmentStatus === opt.value;
          return (
            <button key={opt.value} type="button"
              onClick={() => setValue("employmentStatus", opt.value as DossierData["employmentStatus"], { shouldValidate: true })}
              className={[
                "relative flex flex-col items-start gap-2 p-4 rounded-2xl border-[1.5px] transition-all text-left",
                active
                  ? "bg-ficium text-white border-ficium shadow-lg shadow-ficium/20 scale-[1.02]"
                  : "bg-white border-ink/10 hover:border-ficium/40 hover:bg-ficium/[0.02]",
              ].join(" ")}>
              <div className={["w-9 h-9 rounded-xl grid place-items-center", active ? "bg-white/20" : "bg-ficium/10"].join(" ")}>
                <Icon size={18} className={active ? "text-white" : "text-ficium"} />
              </div>
              <div>
                <div className="font-semibold text-[14px]">{opt.label}</div>
                <div className={["text-[11px] mt-0.5", active ? "text-white/70" : "text-muted"].join(" ")}>{opt.desc}</div>
              </div>
              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <Check size={11} className="text-ficium" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {errors.employmentStatus && <p className="text-xs text-red-600 -mt-3">{errors.employmentStatus.message}</p>}

      {/* Conditional detail panels */}
      {employmentStatus === "employed" && (
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-xs font-bold text-muted uppercase tracking-wider">Employment details</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employer"  htmlFor="employerName" error={errors.employerName?.message}><Input id="employerName" invalid={!!errors.employerName} {...register("employerName")} /></Field>
            <Field label="Job title" htmlFor="jobTitle"     error={errors.jobTitle?.message}><Input id="jobTitle" invalid={!!errors.jobTitle} {...register("jobTitle")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry" htmlFor="industry" optional><Input id="industry" placeholder="e.g. Banking" {...register("industry")} /></Field>
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
            <Field label={employmentStatus === "business_owner" ? "Company name" : "Business name"} htmlFor="businessName" error={errors.businessName?.message}>
              <Input id="businessName" invalid={!!errors.businessName} {...register("businessName")} />
            </Field>
            <Field label="BRN" htmlFor="brnNumber" optional><Input id="brnNumber" placeholder="C12345678" {...register("brnNumber")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry"        htmlFor="industry"        optional><Input id="industry" {...register("industry")} /></Field>
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
              <Field label="Annual revenue (MUR)" htmlFor="annualRevenue" optional><Input id="annualRevenue" type="number" inputMode="numeric" {...register("annualRevenue", { valueAsNumber: true })} /></Field>
              <Field label="Employees" htmlFor="numberOfEmployees" optional><Input id="numberOfEmployees" type="number" inputMode="numeric" {...register("numberOfEmployees", { valueAsNumber: true })} /></Field>
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
          <Field label="Primary profession" htmlFor="primaryProfession" optional><Input id="primaryProfession" placeholder="e.g. Software developer" {...register("primaryProfession")} /></Field>
          <Field label="Primary clients region" htmlFor="primaryClientsRegion" optional><Input id="primaryClientsRegion" placeholder="e.g. Europe, Middle East" {...register("primaryClientsRegion")} /></Field>
        </div>
      )}

      {employmentStatus === "student" && (
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Field label="Institution" htmlFor="institutionName" optional><Input id="institutionName" {...register("institutionName")} /></Field>
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
            <Field label="Monthly allowance" htmlFor="monthlyAllowance" optional><Input id="monthlyAllowance" type="number" inputMode="numeric" {...register("monthlyAllowance", { valueAsNumber: true })} /></Field>
          </div>
        </div>
      )}

      {employmentStatus === "retired" && (
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Field label="Pension income (MUR/month)" htmlFor="pensionIncome" optional><Input id="pensionIncome" type="number" inputMode="numeric" {...register("pensionIncome", { valueAsNumber: true })} /></Field>
          <Field label="Other income sources" htmlFor="otherIncomeSources" optional><Input id="otherIncomeSources" placeholder="Rental, dividends…" {...register("otherIncomeSources")} /></Field>
        </div>
      )}

      {/* Income inputs */}
      {employmentStatus && (
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-ink/[0.07] animate-in fade-in duration-200">
          <div className="text-xs font-bold text-muted uppercase tracking-wider">Monthly income</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Main income (MUR)" htmlFor="monthlyIncome" error={errors.monthlyIncome?.message}>
              <Input id="monthlyIncome" type="number" inputMode="numeric" placeholder="65 000" invalid={!!errors.monthlyIncome} {...register("monthlyIncome", { valueAsNumber: true })} />
            </Field>
            <Field label="Additional income" htmlFor="additionalIncome" optional>
              <Input id="additionalIncome" type="number" inputMode="numeric" placeholder="0" {...register("additionalIncome", { valueAsNumber: true })} />
            </Field>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-muted" />
              <span className="text-sm font-medium text-ink">Financial dependants</span>
              <span className="text-xs text-muted">(children, spouse, parents)</span>
            </div>
            <Controller control={control} name="dependants" render={({ field }) => (
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} type="button" onClick={() => field.onChange(n)}
                    className={[
                      "w-10 h-10 rounded-full text-sm font-bold border-[1.5px] transition-all",
                      field.value === n
                        ? "bg-ficium text-white border-ficium scale-110 shadow-md shadow-ficium/20"
                        : "bg-white text-ink border-ink/15 hover:border-ficium/50",
                    ].join(" ")}>
                    {n === 7 ? "7+" : n}
                  </button>
                ))}
              </div>
            )} />
          </div>
        </div>
      )}

      <StepButton onClick={onNext} disabled={!employmentStatus} />
    </div>
  );
}
