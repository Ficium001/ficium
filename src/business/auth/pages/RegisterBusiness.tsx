import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { signUpBusiness } from "../../../shared/lib/auth";
import { RegisterShell } from "../../../shared/components/RegisterShell";
import { Button, Field, Input, Select } from "../../../shared/ui";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  companyName: z.string().trim().min(2, "Company name is required").max(150),
  companyRegistration: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = [
  "Mauritius", "Réunion", "Madagascar", "Seychelles", "Comoros",
  "India", "South Africa", "France", "United Kingdom",
  "United States", "Canada", "Australia", "Other",
];

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
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      companyRegistration: data.companyRegistration || undefined,
      phone: data.phone || undefined,
      country: data.country,
    });

    if (!result.ok) { setSubmitError(result.error.message); return; }
    navigate("/onboarding/check-email");
  };

  return (
    <RegisterShell back={{ label: "Back", to: "/register" }}>
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-pill text-xs font-semibold mb-4">
          Business account
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Create your account</h1>
        <p className="text-sm text-muted mt-2">Company and contact details.</p>
      </div>

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-ink/[0.06]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

          {/* Company details */}
          <div className="text-xs font-bold tracking-wide uppercase text-muted -mb-1">Company</div>

          <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message}>
            <Input id="companyName" placeholder="e.g. Acme Ltd" invalid={!!errors.companyName} {...register("companyName")} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Registration / BRN" htmlFor="companyRegistration" optional error={errors.companyRegistration?.message}>
              <Input id="companyRegistration" placeholder="e.g. C12345678" {...register("companyRegistration")} />
            </Field>
            <Field label="Country" htmlFor="country" error={errors.country?.message}>
              <Select id="country" invalid={!!errors.country} {...register("country")}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>

          {/* Contact details */}
          <div className="border-t border-ink/[0.06] pt-4 text-xs font-bold tracking-wide uppercase text-muted -mb-1">
            Your details
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

          {submitError && (
            <div role="alert" className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]">
              {submitError}
            </div>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}
            rightIcon={!isSubmitting && <ArrowRight size={18} />} fullWidth className="mt-1">
            Create account
          </Button>

          <p className="text-center text-xs text-muted">
            By creating an account you agree to our{" "}
            <a href="#" className="text-ficium no-underline">Terms</a> and{" "}
            <a href="#" className="text-ficium no-underline">Privacy Policy</a>
          </p>
        </form>
      </div>
    </RegisterShell>
  );
}