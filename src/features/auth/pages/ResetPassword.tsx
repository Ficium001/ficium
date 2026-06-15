import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../auth/context/AuthContext";
import { Button, Card, Field, Input } from "../../../shared/ui";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(72),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkValid, setLinkValid] = useState<"checking" | "valid" | "invalid">("checking");

  // When the user arrives via the recovery email, Supabase's client auto-detects
  // the token in the URL hash, exchanges it for a session, and fires
  // PASSWORD_RECOVERY. After AuthContext settles, user should be non-null.
  useEffect(() => {
    if (authLoading) return;
    setLinkValid(user ? "valid" : "invalid");
  }, [authLoading, user]);

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
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSuccess(true);
    // Brief pause so user sees the success state, then go to dashboard.
    // Their recovery session converts to a normal session, so they're logged in.
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  // ---- Link invalid / expired ----
  if (linkValid === "invalid") {
    return (
      <div className="min-h-screen bg-paper px-5 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
        <div className="mx-auto w-full max-w-[440px] text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">Link expired</h1>
          <p className="text-sm sm:text-base text-muted leading-relaxed mb-8">
            This password reset link is invalid or has expired. Reset links work once and last for one hour.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-3 rounded-pill text-sm font-semibold no-underline shadow-ficium"
          >
            Request a new link <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // ---- Success ----
  if (success) {
    return (
      <div className="min-h-screen bg-paper px-5 py-8 sm:px-6 sm:py-10 flex items-center justify-center">
        <div className="mx-auto w-full max-w-[440px] text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-mint/30 text-ink grid place-items-center mb-6">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">Password updated</h1>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ---- Loading state while AuthContext settles ----
  if (linkValid === "checking") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ficium animate-spin" />
      </div>
    );
  }

  // ---- Form ----
  return (
    <div className="min-h-screen bg-paper px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[440px]">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Set a new password
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Choose something you haven't used elsewhere.
        </p>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Field
              label="New password"
              htmlFor="password"
              hint="At least 8 characters"
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                autoFocus
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>

            <Field
              label="Confirm password"
              htmlFor="confirm"
              error={errors.confirm?.message}
            >
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.confirm}
                {...register("confirm")}
              />
            </Field>

            <div className="flex gap-3 px-3.5 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-xl">
              <ShieldCheck size={20} className="text-ficium flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink/80 leading-relaxed">
                You'll be signed in automatically once your password is updated.
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
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}