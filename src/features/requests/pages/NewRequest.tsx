import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { createRequest } from "../../requests/api/requests";
import { Button, Card, Field, Input, Select } from "../../../shared/ui";

const { data: profile, isLoading: profileLoading } = useProfile();
const navigate = useNavigate();

// Gate: KYC must be verified and dossier must exist
useEffect(() => {
  if (profileLoading) return;
  if (!profile) return;
  if (profile.kycStatus !== "verified") {
    navigate("/onboarding/kyc", { replace: true });
    return;
  }
  if (!profile.hasDossier) {
    navigate("/onboarding/dossier", { replace: true });
  }
}, [profile, profileLoading, navigate]);

/* ---------- Validation schema ---------- */

const schema = z.object({
  productType: z.enum(
    [
      "sme_loan",
      "personal_loan",
      "mortgage",
      "fixed_deposit",
      "savings_account",
      "credit_card",
      "business_account",
      "investment_account",
    ],
    { message: "Choose a product" }
  ),
  amount: z
    .number({ message: "Enter an amount in MUR" })
    .min(1000, "Amount must be at least MUR 1,000")
    .max(1_000_000_000, "Amount looks unrealistic"),
  purpose: z.string().trim().min(3, "Tell us briefly why").max(500),
  preferredTermMonths: z
    .number({ message: "Enter a term in months" })
    .int("Must be a whole number")
    .min(1, "Minimum 1 month")
    .max(360, "Maximum 30 years (360 months)"),
  maxRate: z
    .number()
    .min(0, "Rate can't be negative")
    .max(100, "Rate seems too high")
    .optional()
    .or(z.nan().transform(() => undefined)),
  decisionDeadline: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function NewRequest() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    const result = await createRequest({
      productType: data.productType,
      amount: data.amount,
      purpose: data.purpose,
      preferredTermMonths: data.preferredTermMonths,
      maxRate: data.maxRate,
      decisionDeadline: data.decisionDeadline || undefined,
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
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          New request
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Tell us what you need. Banks will bid against each other for your business.
        </p>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Field
              label="Product type"
              htmlFor="productType"
              error={errors.productType?.message}
            >
              <Select
                id="productType"
                defaultValue=""
                invalid={!!errors.productType}
                {...register("productType")}
              >
                <option value="" disabled>Choose a product</option>
                <option value="personal_loan">Personal Loan</option>
                <option value="sme_loan">SME / Business Loan</option>
                <option value="mortgage">Mortgage</option>
                <option value="fixed_deposit">Fixed Deposit</option>
                <option value="savings_account">Savings Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="business_account">Business Account</option>
                <option value="investment_account">Investment Account</option>
              </Select>
            </Field>

            <Field
              label="Amount (MUR)"
              htmlFor="amount"
              error={errors.amount?.message}
            >
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 500000"
                invalid={!!errors.amount}
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="Purpose"
              htmlFor="purpose"
              hint="A short description — banks see this, not your name"
              error={errors.purpose?.message}
            >
              <Input
                id="purpose"
                type="text"
                placeholder="e.g. Expand kitchen equipment"
                invalid={!!errors.purpose}
                {...register("purpose")}
              />
            </Field>

            <Field
              label="Preferred term (months)"
              htmlFor="preferredTermMonths"
              hint="36 for 3 years, 60 for 5 years, etc."
              error={errors.preferredTermMonths?.message}
            >
              <Input
                id="preferredTermMonths"
                type="number"
                inputMode="numeric"
                placeholder="36"
                invalid={!!errors.preferredTermMonths}
                {...register("preferredTermMonths", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="Max acceptable rate (% APR)"
              htmlFor="maxRate"
              optional
              hint="Banks won't bid above this. Leave blank if no preference."
              error={errors.maxRate?.message}
            >
              <Input
                id="maxRate"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="e.g. 12"
                invalid={!!errors.maxRate}
                {...register("maxRate", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="Decision deadline"
              htmlFor="decisionDeadline"
              optional
              hint="When you'd like to accept a bid by"
              error={errors.decisionDeadline?.message}
            >
              <Input
                id="decisionDeadline"
                type="date"
                invalid={!!errors.decisionDeadline}
                {...register("decisionDeadline")}
              />
            </Field>

            {/* Privacy reassurance */}
            <div className="flex gap-3 px-3.5 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-xl">
              <Lock size={20} className="text-ficium flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink/80 leading-relaxed">
                Your identity stays private until you accept a bid. Banks only see the request details.
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
              Post request
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}