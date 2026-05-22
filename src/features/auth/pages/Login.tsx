import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn } from "../../../shared/lib/auth";
import { Button, Field, Input } from "../../../shared/ui";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  useEffect(() => {
    const remembered = localStorage.getItem("ficium_remembered_email");
    if (remembered) {
      setValue("email", remembered);
      setValue("rememberMe", true);
    }
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await signIn(data.email, data.password, data.rememberMe ?? false);
    if (!result.ok) {
      setSubmitError("Incorrect email or password. Please try again.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-ink">

      {/* ── ANIMATED GRADIENT BACKGROUND ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
      <div className="absolute inset-0 opacity-60"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(139,92,246,0.3) 0%, transparent 50%)",
        }}
      />
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-ficium/20 blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-violet-500/15 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full bg-indigo-400/10 blur-[60px] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* ── CONTENT ── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top nav */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <FLogo size={24} className="text-white" />
            <span className="font-display text-lg font-bold text-white">Ficium</span>
          </Link>
          <Link to="/register" className="text-sm font-semibold text-white/60 hover:text-white transition-colors no-underline">
            Create account →
          </Link>
        </div>

        {/* Centered — phone width on all screens */}
        <div className="flex-1 flex items-center justify-center px-5 py-6">
          <div className="w-full max-w-[390px] flex flex-col gap-5">

            {/* Heading */}
            <div className="text-center">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Welcome back
              </h1>
              <p className="text-sm text-white/50 mt-1.5">
                Sign in to your Ficium account
              </p>
            </div>

            {/* Glass card */}
            <div className="bg-white/[0.97] backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-7">
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

                <Field label="Email address" htmlFor="email" error={errors.email?.message}>
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      invalid={!!errors.password}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" {...register("rememberMe")} className="w-4 h-4 accent-ficium rounded" />
                  <span className="text-sm text-ink/70">Remember me</span>
                </label>

                {submitError && (
                  <div role="alert" className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]">
                    {submitError}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  rightIcon={!isSubmitting && <ArrowRight size={18} />}
                  fullWidth
                  className="mt-1"
                >
                  Sign in
                </Button>
              </form>
            </div>

            <p className="text-center text-sm text-white/50">
              New to Ficium?{" "}
              <Link to="/register" className="text-white font-semibold no-underline hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58 L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z" fill="currentColor" />
    </svg>
  );
}