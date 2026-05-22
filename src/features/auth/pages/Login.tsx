import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { signIn } from "../../../shared/lib/auth";
import { Button, Card, Field, Input } from "../../../shared/ui";

/* ---------- Validation schema ---------- */

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Where the user was trying to go before they got bounced to /login.
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

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
    const result = await signIn(data.email, data.password);

    if (!result.ok) {
      // Generic message — don't leak which of email/password was wrong.
      setSubmitError("Incorrect email or password. Please try again.");
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[440px]">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Header */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Welcome back
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Sign in to see your bids and manage your requests.
        </p>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                invalid={!!errors.email}
                {...register("email")}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              rightLabel={
                <Link to="/forgot-password" className="text-xs text-ficium font-semibold no-underline hover:underline">
                Forgot password?
               </Link>
              }
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>

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
              Sign in
            </Button>
          </form>
        </Card>

        <p className="text-center mt-6 sm:mt-8 text-sm text-muted">
          New to Ficium?{" "}
          <Link to="/register" className="text-ficium font-semibold no-underline hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}