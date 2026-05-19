import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { submitDossier } from "../../onboarding/api/dossier";
import { Button, Card, Field, Input, Select } from "../../../shared/ui";

/* ---------- Validation schema ---------- */

const schema = z.object({
  employmentStatus: z.enum(
    ["employed", "self_employed", "business_owner", "freelance", "unemployed", "retired", "student"],
    { message: "Select your employment status" }
  ),
  monthlyIncome: z
    .number({ message: "Enter your monthly income in MUR" })
    .min(0, "Income can't be negative")
    .max(100_000_000, "Please enter a realistic amount"),
  totalAssets: z
    .number({ message: "Enter your total assets in MUR" })
    .min(0, "Assets can't be negative")
    .max(10_000_000_000, "Please enter a realistic amount"),
  existingLoans: z.enum(["none", "1", "2-3", "4+"], { message: "Select your loan situation" }),
  creditHistory: z.enum(
    ["clean", "mostly_clean", "some_defaults", "significant_issues"],
    { message: "Select your credit history" }
  ),
  addressLine1: z.string().trim().min(2, "Address is required").max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(100),
  country: z.string().trim().min(2, "Country is required"),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function Dossier() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { country: "Mauritius" },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    const result = await submitDossier({
      employmentStatus: data.employmentStatus,
      monthlyIncome: data.monthlyIncome,
      totalAssets: data.totalAssets,
      existingLoans: data.existingLoans,
      creditHistory: data.creditHistory,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || undefined,
      city: data.city,
      country: data.country,
      postalCode: data.postalCode || undefined,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        {/* Back link */}
        <Link
          to="/onboarding/kyc"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
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
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Tell us about your income and assets. We use this to help banks bid more accurately.
        </p>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Field
              label="Employment status"
              htmlFor="employmentStatus"
              error={errors.employmentStatus?.message}
            >
              <Select
                id="employmentStatus"
                defaultValue=""
                invalid={!!errors.employmentStatus}
                {...register("employmentStatus")}
              >
                <option value="" disabled>Choose one</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-employed</option>
                <option value="business_owner">Business owner</option>
                <option value="freelance">Freelance</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="unemployed">Unemployed</option>
              </Select>
            </Field>

            <Field
              label="Monthly income (MUR)"
              htmlFor="monthlyIncome"
              hint="Your net monthly income, before any bonuses"
              error={errors.monthlyIncome?.message}
            >
              <Input
                id="monthlyIncome"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 65000"
                invalid={!!errors.monthlyIncome}
                {...register("monthlyIncome", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="Total assets (MUR)"
              htmlFor="totalAssets"
              hint="Savings, investments, property — rough total"
              error={errors.totalAssets?.message}
            >
              <Input
                id="totalAssets"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 1200000"
                invalid={!!errors.totalAssets}
                {...register("totalAssets", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="Existing loans"
              htmlFor="existingLoans"
              error={errors.existingLoans?.message}
            >
              <Select
                id="existingLoans"
                defaultValue=""
                invalid={!!errors.existingLoans}
                {...register("existingLoans")}
              >
                <option value="" disabled>Choose one</option>
                <option value="none">None</option>
                <option value="1">1 existing loan</option>
                <option value="2-3">2-3 loans</option>
                <option value="4+">4 or more</option>
              </Select>
            </Field>

            <Field
              label="Credit history"
              htmlFor="creditHistory"
              error={errors.creditHistory?.message}
            >
              <Select
                id="creditHistory"
                defaultValue=""
                invalid={!!errors.creditHistory}
                {...register("creditHistory")}
              >
                <option value="" disabled>Choose one</option>
                <option value="clean">Clean — no missed payments</option>
                <option value="mostly_clean">Mostly clean — minor history</option>
                <option value="some_defaults">Some defaults</option>
                <option value="significant_issues">Significant issues</option>
              </Select>
            </Field>

            {/* Address section divider */}
            <div className="pt-3 -mb-1 text-xs font-bold tracking-[0.08em] uppercase text-muted">
              Address
            </div>

            <Field
              label="Address line 1"
              htmlFor="addressLine1"
              error={errors.addressLine1?.message}
            >
              <Input
                id="addressLine1"
                type="text"
                autoComplete="address-line1"
                placeholder="Street + number"
                invalid={!!errors.addressLine1}
                {...register("addressLine1")}
              />
            </Field>

            <Field
              label="Address line 2"
              htmlFor="addressLine2"
              optional
              error={errors.addressLine2?.message}
            >
              <Input
                id="addressLine2"
                type="text"
                autoComplete="address-line2"
                placeholder="Apartment, suite, etc."
                invalid={!!errors.addressLine2}
                {...register("addressLine2")}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
              <Field label="City" htmlFor="city" error={errors.city?.message}>
                <Input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  invalid={!!errors.city}
                  {...register("city")}
                />
              </Field>

              <Field
                label="Postal code"
                htmlFor="postalCode"
                optional
                error={errors.postalCode?.message}
              >
                <Input
                  id="postalCode"
                  type="text"
                  autoComplete="postal-code"
                  invalid={!!errors.postalCode}
                  {...register("postalCode")}
                />
              </Field>
            </div>

            <Field label="Country" htmlFor="country" error={errors.country?.message}>
              <Select
                id="country"
                invalid={!!errors.country}
                {...register("country")}
              >
                <option value="Mauritius">Mauritius</option>
                <option value="India">India</option>
                <option value="Madagascar">Madagascar</option>
                <option value="South Africa">South Africa</option>
                <option value="France">France</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Other">Other</option>
              </Select>
            </Field>

{/* Privacy reassurance */}
            <div className="flex gap-3 px-3.5 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-xl">
              <ShieldCheck size={20} className="text-ficium flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink/80 leading-relaxed">
                Banks see your financial profile anonymized — never your name or contact details — until you accept a bid.
              </p>
            </div>

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
              Complete setup
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}