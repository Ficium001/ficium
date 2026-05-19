import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Building2 } from "lucide-react";
import { signUpBank } from "../services/auth";
import { Button, Card, Field, Input, Select } from "../components/ui";

const schema = z.object({
  institutionName: z.string().trim().min(2, "Institution name is required").max(100),
  title: z.enum(["mr", "mrs", "ms", "miss", "dr", "prof", "other"]).optional(),
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().toLowerCase().email("Enter a valid work email address"),
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

export default function BankRegister() {
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
    const result = await signUpBank({
      email: data.email,
      password: data.password,
      institutionName: data.institutionName,
      firstName: data.firstName,
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
      navigate("/bank/pending");
    }
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="inline-flex items-center gap-2 bg-ficium/10 text-ficium px-3 py-1.5 rounded-pill text-xs font-semibold mb-4">
          <Building2 size={14} /> For banks
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-2">
          Register your bank
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Bid on Mauritian clients seeking loans, deposits, and business funding.
          Your account will be reviewed before activation.
        </p>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Field
              label="Institution name"
              htmlFor="institutionName"
              hint="As it appears in your banking license"
              error={errors.institutionName?.message}
            >
              <Input
                id="institutionName"
                type="text"
                placeholder="e.g. Mauritius Commercial Bank"
                invalid={!!errors.institutionName}
                {...register("institutionName")}
              />
            </Field>

            <div className="pt-2 -mb-1 text-xs font-bold tracking-[0.08em] uppercase text-muted">
              Primary contact
            </div>

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
              <Field
                label="First name"
                htmlFor="firstName"
                error={errors.firstName?.message}
              >
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  invalid={!!errors.firstName}
                  {...register("firstName")}
                />
              </Field>
            </div>

            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
              <Input
                id="lastName"
                type="text"
                autoComplete="family-name"
                invalid={!!errors.lastName}
                {...register("lastName")}
              />
            </Field>

            <Field
              label="Work email"
              htmlFor="email"
              hint="Use your institutional email — personal emails will be rejected during review"
              error={errors.email?.message}
            >
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

            <label className="flex gap-3 items-start cursor-pointer text-xs sm:text-[13px] text-muted leading-relaxed mt-1">
              <input
                type="checkbox"
                {...register("terms")}
                className="mt-0.5 w-4 h-4 accent-ficium cursor-pointer flex-shrink-0"
              />
              <span>
                I confirm I'm authorised to register this bank on Ficium, and I agree to the{" "}
                <a href="#" className="text-ficium font-semibold no-underline hover:underline">Terms</a>{" "}
                and{" "}
                <a href="#" className="text-ficium font-semibold no-underline hover:underline">Privacy Policy</a>.
              </span>
            </label>
            {errors.terms && (
              <p className="-mt-2 text-xs text-red-600">{errors.terms.message}</p>
            )}

            {submitError && (
              <div
                role="alert"
                className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]"
              >
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              rightIcon={!isSubmitting && <ArrowRight size={18} />}
              fullWidth
              className="mt-2"
            >
              Submit for review
            </Button>
          </form>
        </Card>

        <p className="text-center mt-6 sm:mt-8 text-sm text-muted">
          A client looking to compare bids?{" "}
          <Link to="/register" className="text-ficium font-semibold no-underline hover:underline">
            Sign up as a client
          </Link>
        </p>
      </div>
    </div>
  );
}