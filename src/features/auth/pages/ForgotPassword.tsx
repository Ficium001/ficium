import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { supabase } from "../../../shared/lib/supabase";
import { Button, Card, Field, Input } from "../../../shared/ui";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null);
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

    // Tell Supabase to email a recovery link.
    // Important: redirectTo controls where the email's link lands the user.
    // It MUST be on our allowed redirect URLs (which we already set in Supabase
    // when we configured auth: ficium.net/** and the codespace preview).
    const redirectTo = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    // Show confirmation. We deliberately show the same success message even if
    // the email isn't registered — preventing user enumeration.
    setSentTo(data.email);
  };

  // ---- After-submit success view ----
  if (sentTo) {
    return (
      <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
        <div className="mx-auto w-full max-w-[440px] text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-ficium/10 text-ficium grid place-items-center mb-6">
            <Mail size={28} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            Check your email
          </h1>
          <p className="text-sm sm:text-base text-muted leading-relaxed mb-2">
            If an account exists for <span className="font-semibold text-ink">{sentTo}</span>,
            we've sent a password reset link.
          </p>
          <p className="text-sm text-muted leading-relaxed mb-8">
            The link expires in 1 hour. Check spam if you don't see it.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-ficium font-semibold no-underline hover:underline"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ---- Form ----
  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[440px]">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Forgot your password?
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Enter your email and we'll send you a link to reset it.
        </p>

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
              Send reset link
            </Button>
          </form>
        </Card>

        <p className="text-center mt-6 sm:mt-8 text-sm text-muted">
          Remembered it?{" "}
          <Link to="/login" className="text-ficium font-semibold no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}