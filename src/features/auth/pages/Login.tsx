import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Shield, Zap, Globe } from "lucide-react";
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
      console.log("SUBMIT DATA:", JSON.stringify(data)); // ← add this
    setSubmitError(null);
    const result = await signIn(data.email, data.password, data.rememberMe ?? false);
    if (!result.ok) {
      setSubmitError("Incorrect email or password. Please try again.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── LEFT PANEL — dark branding ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 40%, rgba(79,70,229,0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.3) 0%, transparent 50%)" }} />
        <div className="absolute top-1/3 -left-10 w-72 h-72 rounded-full bg-ficium/20 blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-violet-500/20 blur-[80px] animate-pulse" style={{ animationDelay: "1.5s" }} />

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link to="/" className="flex items-center gap-2.5 no-underline mb-auto">
            <FLogo size={28} className="text-white" />
            <span className="font-display text-xl font-bold text-white">Ficium</span>
          </Link>
          <div className="py-16">
            <div className="text-xs font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
              The reverse-banking marketplace
            </div>
            <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-6">
              Banks compete.<br />You choose.
            </h2>
            <p className="text-white/50 text-base leading-relaxed max-w-[320px]">
              Post what you need once. Banks across Mauritius bid against each other with their best offer.
            </p>
            <div className="flex flex-col gap-3 mt-10">
              {[
                { icon: Shield, text: "Bank-grade security" },
                { icon: Zap, text: "Bids in as little as 24 hours" },
                { icon: Globe, text: "All major Mauritian banks" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center flex-shrink-0">
                    <item.icon size={15} className="text-white/70" />
                  </div>
                  <span className="text-sm text-white/60">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/25">© {new Date().getFullYear()} Ficium · Mauritius</div>
        </div>
      </div>

      {/* ── RIGHT PANEL — light form ── */}
      <div className="flex-1 flex flex-col min-h-screen relative bg-[#f8f7f4]">

        {/* Mobile: dark gradient bg */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
        <div className="absolute inset-0 lg:hidden" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.4) 0%, transparent 60%)" }} />

        <div className="relative z-10 flex flex-col h-full">

          {/* Mobile top nav */}
          <div className="flex lg:hidden items-center justify-between px-5 py-5">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <FLogo size={22} className="text-white" />
              <span className="font-display text-base font-bold text-white">Ficium</span>
            </Link>
            <Link to="/register" className="text-sm text-white/60 font-semibold no-underline">Register →</Link>
          </div>

          {/* Desktop top bar */}
          <div className="hidden lg:flex items-center justify-end px-8 xl:px-12 py-6 border-b border-ink/[0.06]">
            <div className="text-sm text-muted">
              New to Ficium?{" "}
              <Link to="/register" className="text-ficium font-semibold no-underline hover:underline">
                Create account
              </Link>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-5 py-8 lg:px-12 xl:px-20">
            <div className="w-full max-w-[400px]">

              <div className="mb-8">
                <h1 className="font-display text-3xl font-bold">
                  <span className="hidden lg:block text-ink">Welcome back</span>
                  <span className="lg:hidden text-white">Welcome back</span>
                </h1>
                <p className="text-sm mt-1.5">
                  <span className="hidden lg:block text-muted">Sign in to your Ficium account</span>
                  <span className="lg:hidden text-white/50">Sign in to your Ficium account</span>
                </p>
              </div>

              {/* Mobile: glass card */}
              <div className="lg:hidden bg-white/[0.97] backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-5">
                <LoginForm
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                />
              </div>

              {/* Desktop: plain form on light bg */}
              <div className="hidden lg:block">
                <LoginForm
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                />
              </div>

              <p className="lg:hidden text-center text-sm text-white/50 mt-5">
                New to Ficium?{" "}
                <Link to="/register" className="text-white font-semibold no-underline">
                  Create an account
                </Link>
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ register, handleSubmit, onSubmit, errors, isSubmitting, submitError }: any) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Field label="Email address" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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
            autoCapitalize="none"
            autoCorrect="off"
            invalid={!!errors.password}
            {...register("password")}
          />
          <button type="button" onClick={() => setShowPassword((v: boolean) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
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

      <Button type="submit" size="lg" loading={isSubmitting}
        rightIcon={!isSubmitting && <ArrowRight size={18} />} fullWidth className="mt-1">
        Sign in
      </Button>
    </form>
  );
}

function FLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58 L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z" fill="currentColor" />
    </svg>
  );
}
