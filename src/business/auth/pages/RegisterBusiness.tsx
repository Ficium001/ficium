
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { signUpBusiness } from "../../../shared/lib/auth";
import { RegisterShell } from "../../../shared/components/RegisterShell";
import { Button, Field } from "../../../shared/ui";

const schema = z.object({
  firstName:           z.string().trim().min(1, "First name is required").max(60),
  lastName:            z.string().trim().min(1, "Last name is required").max(60),
  email:               z.string().email("Enter a valid email address"),
  phone:               z.string().trim().max(20).optional().or(z.literal("")),
  companyName:         z.string().trim().min(2, "Company name is required").max(150),
  companyRegistration: z.string().trim().max(40).optional().or(z.literal("")),
  companyType:         z.enum(["sme","corporate","startup","ngo","sole_trader","other"], { message: "Select a company type" }),
  sector:              z.string().min(1, "Select a sector"),
  annualTurnover:      z.string().optional().or(z.literal("")),
  country:             z.string().min(2, "Country is required"),
  password:            z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword:     z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match", path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = ["Mauritius","Réunion","Madagascar","Seychelles","Comoros","India","South Africa","France","United Kingdom","United States","Canada","Australia","Other"];

const COMPANY_TYPES = [
  { value: "sme",         label: "SME (Small & Medium Enterprise)" },
  { value: "corporate",   label: "Corporate / Large enterprise"    },
  { value: "startup",     label: "Startup"                         },
  { value: "ngo",         label: "NGO / Non-profit"                },
  { value: "sole_trader", label: "Sole trader"                     },
  { value: "other",       label: "Other"                           },
];

const SECTORS = [
  "Agriculture","Construction","Education","Energy","Finance","Healthcare",
  "Hospitality & Tourism","ICT","Manufacturing","Real Estate","Retail & Trade",
  "Transport & Logistics","Other",
];

const TURNOVER_RANGES = [
  { value: "under_1m",    label: "Under MUR 1M"         },
  { value: "1m_10m",      label: "MUR 1M – 10M"         },
  { value: "10m_50m",     label: "MUR 10M – 50M"        },
  { value: "50m_200m",    label: "MUR 50M – 200M"       },
  { value: "over_200m",   label: "Over MUR 200M"        },
];

const inputCls = (err?: boolean) => [
  "w-full rounded-xl border px-4 py-3.5 text-[16px] outline-hidden transition-all bg-white text-ink placeholder:text-ink/30",
  err ? "border-red-400 focus:ring-2 focus:ring-red-200" : "border-ink/12 focus:border-ficium focus:ring-2 focus:ring-ficium/20",
].join(" ");

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { country: "Mauritius" },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await signUpBusiness({
      email:               data.email,
      password:            data.password,
      firstName:           data.firstName,
      lastName:            data.lastName,
      companyName:         data.companyName,
      companyRegistration: data.companyRegistration || undefined,
      phone:               data.phone || undefined,
      country:             data.country,
    });

    if (!result.ok) { setSubmitError(result.error.message); return; }
    if (result.needsEmailConfirmation) { navigate("/onboarding/check-email"); return; }
    navigate("/dashboard");
  };

  return (
    <RegisterShell back={{ label: "Back to register", to: "/register" }}>
      <div className="mb-8">
        <h1 className="font-display text-4xl lg:text-5xl font-bold">
          <span className="hidden lg:block text-ink">Business account</span>
          <span className="lg:hidden text-white">Business account</span>
        </h1>
        <p className="text-[16px] mt-2">
          <span className="hidden lg:block text-muted">Register your SME or corporate on Ficium</span>
          <span className="lg:hidden text-white/50">Register your SME or corporate on Ficium</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
            <input id="firstName" {...register("firstName")} className={inputCls(!!errors.firstName)} placeholder="Jane" autoFocus />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
            <input id="lastName" {...register("lastName")} className={inputCls(!!errors.lastName)} placeholder="Smith" />
          </Field>
        </div>
        <Field label="Work email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" {...register("email")} className={inputCls(!!errors.email)} placeholder="jane@company.mu" />
        </Field>
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" {...register("phone")} className={inputCls()} placeholder="+230 5XXX XXXX" />
        </Field>

        {/* Company */}
        <div className="h-px bg-ink/6 my-1" />
        <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message}>
          <input id="companyName" {...register("companyName")} className={inputCls(!!errors.companyName)} placeholder="Acme Ltd" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company type" htmlFor="companyType" error={errors.companyType?.message}>
            <select id="companyType" {...register("companyType")} className={inputCls(!!errors.companyType)}>
              <option value="">Select type</option>
              {COMPANY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Sector" htmlFor="sector" error={errors.sector?.message}>
            <select id="sector" {...register("sector")} className={inputCls(!!errors.sector)}>
              <option value="">Select sector</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reg number (optional)" htmlFor="companyRegistration" error={errors.companyRegistration?.message}>
            <input id="companyRegistration" {...register("companyRegistration")} className={inputCls()} placeholder="C12345678" />
          </Field>
          <Field label="Annual turnover" htmlFor="annualTurnover" error={errors.annualTurnover?.message}>
            <select id="annualTurnover" {...register("annualTurnover")} className={inputCls()}>
              <option value="">Select range</option>
              {TURNOVER_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Country" htmlFor="country" error={errors.country?.message}>
          <select id="country" {...register("country")} className={inputCls(!!errors.country)}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {/* Password */}
        <div className="h-px bg-ink/6 my-1" />
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <input id="password" type="password" {...register("password")} className={inputCls(!!errors.password)} placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <input id="confirmPassword" type="password" {...register("confirmPassword")} className={inputCls(!!errors.confirmPassword)} placeholder="Repeat password" />
        </Field>

        {submitError && (
          <div className="px-4 py-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[14px]">{submitError}</div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} rightIcon={<ArrowRight size={18} />} fullWidth className="mt-1">
          Create business account
        </Button>
      </form>
    </RegisterShell>
  );
}
