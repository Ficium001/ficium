import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { signUp } from "../../auth/api/auth";
import { Button, Card, Field, Input, Select } from "../../../shared/ui";

/* ---------- Validation schema ---------- */

const schema = z.object({
  title: z.enum(["mr", "mrs", "ms", "miss", "dr", "prof", "other"]).optional(),
  firstName: z.string().trim().min(1, "First name is required").max(50),
  middleName: z.string().trim().max(50).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s+()-]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  terms: z.literal(true, { message: "You must accept the terms to continue" }),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function Register() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { terms: false as unknown as true },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await signUp({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      phone: data.phone || undefined,
      title: data.title,
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      return;
    }

    if (result.needsEmailConfirmation) {
      navigate("/onboarding/check-email", { state: { email: data.email } });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ink/10" />
          <div className="h-1 w-8 rounded-pill bg-ink/10" />
          <span className="ml-2 text-xs text-muted">Step 1 of 3</span>
        </div>

        {/* Header */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Create your account
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Banks will compete for your business. Let's start with the basics.
        </p>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Title + First name */}
            <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[120px_1fr] gap-3">
              <Field label="Title" htmlFor="title">
                <Select id="title" defaultValue="" {...register("title")}>
                  <option value="">—</option>
                  <option value="mr">Mr</option>
                  <option value="mrs">Mrs</option>
                  <option value="ms">Ms</option>
                  <option value="miss">Miss</option>
                  <option value="dr">Dr</option>
                  <option value="prof">Prof</option>
                  <option value="other">Other</option>
                </Select>
              </Field>

              <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  invalid={!!errors.firstName}
                  {...register("firstName")}
                />
              </Field>
            </div>

            <Field label="Middle name" htmlFor="middleName" optional error={errors.middleName?.message}>
              <Input
                id="middleName"
                type="text"
                autoComplete="additional-name"
                invalid={!!errors.middleName}
                {...register("middleName")}
              />
            </Field>

            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
              <Input
                id="lastName"
                type="text"
                autoComplete="family-name"
                invalid={!!errors.lastName}
                {...register("lastName")}
              />
            </Field>

            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                invalid={!!errors.email}
                {...register("email")}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor="phone"
              optional
              hint="With country code, e.g. +230 5xxx xxxx"
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+230 5xxx xxxx"
                invalid={!!errors.phone}
                {...register("phone")}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              hint="At least 8 characters"
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>

            {/* Terms */}
            <label className="flex gap-3 items-start cursor-pointer text-xs sm:text-[13px] text-muted leading-relaxed mt-1">
              <input
                type="checkbox"
                {...register("terms")}
                className="mt-0.5 w-4 h-4 accent-ficium cursor-pointer flex-shrink-0"
              />
              <span>
                I agree to Ficium's{" "}
                <a href="#" className="text-ficium font-semibold no-underline hover:underline">Terms</a>{" "}
                and{" "}
                <a href="#" className="text-ficium font-semibold no-underline hover:underline">Privacy Policy</a>.
              </span>
            </label>
            {errors.terms && (
              <p className="-mt-2 text-xs text-red-600">{errors.terms.message}</p>
            )}

            {/* Server error */}
            {submitError && (
              <div
                role="alert"
                className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]"
              >
                {submitError}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              rightIcon={!isSubmitting && <ArrowRight size={18} />}
              fullWidth
              className="mt-2"
            >
              Continue
            </Button>
          </form>
        </Card>

        {/* Sign-in link */}
        <p className="text-center mt-6 sm:mt-8 text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-ficium font-semibold no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}