import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { signUpInstitution } from "../../../shared/lib/auth";
import { RegisterShell } from "../../../shared/components/RegisterShell";
import { Button, Field, Input, Select } from "../../../shared/ui";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  institutionName: z.string().trim().min(2, "Institution name is required").max(150),
  institutionType: z.enum([
    "commercial_bank", "fintech", "micro_credit",
    "leasing", "insurance", "cooperative", "other",
  ], { message: "Select institution type" }),
  licenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  regulatoryBody: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const INSTITUTION_TYPES = [
  { value: "commercial_bank", label: "Commercial Bank" },
  { value: "fintech", label: "Fintech / Digital Lender" },
  { value: "micro_credit", label: "Micro-Credit Institution" },
  { value: "leasing", label: "Leasing Company" },
  { value: "insurance", label: "Insurance Company" },
  { value: "cooperative", label: "Cooperative / Credit Union" },
  { value: "other", label: "Other" },
];

const COUNTRIES = [
  "Mauritius", "Réunion", "Madagascar", "Seychelles", "Comoros",
  "India", "South Africa", "France", "United Kingdom",
  "United States", "Canada", "Australia", "Other",
];

export default function RegisterInstitution() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { country: "Mauritius" },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await signUpInstitution({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      institutionName: data.institutionName,
      institutionType: data.institutionType,
      licenseNumber: data.licenseNumber || undefined,
      regulatoryBody: data.regulatoryBody || undefined,
      phone: data.phone || undefined,
      country: data.country,
    });

    if (!result.ok) { setSubmitError(result.error.message); return; }
    navigate("/institution/pending");
  };

  return (
    <RegisterShell back={{ label: "Back", to: "/register" }}>
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-pill text-xs font-semibold mb-4">
          Financial Institution
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Join as an institution</h1>
        <p className="text-sm text-muted mt-2">
          Register to bid on client requests across Mauritius. Your account will be reviewed before activation.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-ink/[0.06]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

          {/* Institution details */}
          <div className="text-xs font-bold tracking-wide uppercase text-muted -mb-1">Institution</div>

          <Field label="Institution name" htmlFor="institutionName" error={errors.institutionName?.message}>
            <Input id="institutionName" placeholder="e.g. AfrAsia Bank" invalid={!!errors.institutionName} {...register("institutionName")} />
          </Field>

          <Field label="Institution type" htmlFor="institutionType" error={errors.institutionType?.message}>
            <Select id="institutionType" defaultValue="" invalid={!!errors.institutionType} {...register("institutionType")}>
              <option value="" disabled>Select type</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="License / Registration no." htmlFor="licenseNumber" optional error={errors.licenseNumber?.message}>
              <Input id="licenseNumber" placeholder="FSC or BOM license" {...register("licenseNumber")} />
            </Field>
            <Field label="Regulatory body" htmlFor="regulatoryBody" optional error={errors.regulatoryBody?.message}>
              <Input id="regulatoryBody" placeholder="e.g. Bank of Mauritius" {...register("regulatoryBody")} />
            </Field>
          </div>

          <Field label="Country" htmlFor="country" error={errors.country?.message}>
            <Select id="country" invalid={!!errors.country} {...register("country")}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>

          {/* Contact details */}
          <div className="border-t border-ink/[0.06] pt-4 text-xs font-bold tracking-wide uppercase text-muted -mb-1">
            Primary contact
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
              <Input id="firstName" autoComplete="given-name" invalid={!!errors.firstName} {...register("firstName")} />
            </Field>
            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
              <Input id="lastName" autoComplete="family-name" invalid={!!errors.lastName} {...register("lastName")} />
            </Field>
          </div>

          <Field label="Work email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" inputMode="email"
              invalid={!!errors.email} {...register("email")} />
          </Field>

          <Field label="Phone" htmlFor="phone" optional error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          </Field>

          {/* Password */}
          <div className="border-t border-ink/[0.06] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="new-password"
                invalid={!!errors.password} {...register("password")} />
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" autoComplete="new-password"
                invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            </Field>
          </div>

          {/* Trust note */}
          <div className="flex gap-3 px-3.5 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-blue-800 leading-relaxed">
              All institution accounts are manually reviewed before activation. You'll receive an email once approved.
            </p>
          </div>

          {submitError && (
            <div role="alert" className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]">
              {submitError}
            </div>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}
            rightIcon={!isSubmitting && <ArrowRight size={18} />} fullWidth className="mt-1">
            Submit for review
          </Button>
        </form>
      </div>
    </RegisterShell>
  );
}