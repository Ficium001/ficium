import { useState, useEffect } from "react";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Shield, Zap, Globe } from "lucide-react";
import { signIn } from "../../../shared/lib/auth";
import { Button, Field } from "../../../shared/ui";
import { GradText } from "@/shared/ui/dashboard";

// Drifting background blade — same motif as the dashboard hero.
function Blade({ className, both = true }: { className: string; both?: boolean }) {
  return (
    <svg viewBox="0 0 310 153"
      className={`absolute opacity-50 blur-[2px] motion-safe:animate-drift will-change-transform pointer-events-none ${className}`}
      aria-hidden>
      <defs>
        <linearGradient id="loginBladeB" x1="85" y1="79" x2="266" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3536DC" /><stop offset="0.5" stopColor="#356EF4" /><stop offset="1" stopColor="#4C90F6" />
        </linearGradient>
        <linearGradient id="loginBladeP" x1="85" y1="141" x2="238" y2="91" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3A148F" /><stop offset="1" stopColor="#8231EC" />
        </linearGradient>
      </defs>
      {both && <path d="M 121.78,31.83 Q 131,20 146,20 L 251,20 Q 266,20 257.28,32.21 L 244.72,49.79 Q 236,62 221.09,63.68 L 99.91,77.32 Q 85,79 94.22,67.17 Z" fill="url(#loginBladeB)" />}
      <path d="M 108.10,103.75 Q 116,91 131,91 L 223,91 Q 238,91 230.12,103.77 L 216.88,125.23 Q 209,138 194,138.36 L 100,140.64 Q 85,141 92.90,128.25 Z" fill="url(#loginBladeP)" />
    </svg>
  );
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

/* Shared input class — bypasses the Input wrapper to guarantee all attrs reach the DOM */
const inputCls = (invalid: boolean) =>
  [
    "w-full rounded-xl border px-4 py-3.5 text-[16px] outline-none transition-all",
    "bg-white text-ink placeholder:text-ink/30",
    invalid
      ? "border-red-400 focus:ring-2 focus:ring-red-200"
      : "border-ink/[0.12] focus:border-ficium focus:ring-2 focus:ring-ficium/20",
  ].join(" ");

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  useEffect(() => {
    const remembered = localStorage.getItem("ficium_remembered_email");
    if (remembered) {
      setValue("email", remembered.trim().toLowerCase());
      setValue("rememberMe", true);
    }
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const email = data.email.trim().toLowerCase();
    const result = await signIn(email, data.password, data.rememberMe ?? false);
    if (!result.ok) {
      setSubmitError("Incorrect email or password. Please try again.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col relative overflow-hidden text-white">
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 160% at 8% 0%, #181842 0%, #0B0B1E 55%)" }} />
        <Blade className="w-[420px] -top-20 -right-16 [animation-delay:-2s]" />
        <Blade className="w-[320px] bottom-[12%] -right-10 [animation-duration:18s]" both={false} />
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link to="/" className="no-underline mb-auto">
            <FiciumLogo heightPx={22} withWordmark wordmarkClassName="text-[20px] text-white" />
          </Link>
          <div className="py-16">
            <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-indigo-300/80 mb-5">
              The reverse-banking marketplace
            </div>
            <h2 className="font-display text-5xl xl:text-6xl font-bold tracking-display leading-[1.08] mb-6">
              Banks compete.<br /><GradText>You choose.</GradText>
            </h2>
            <p className="text-[#A6A6C8] text-[17px] leading-relaxed max-w-[320px]">
              Post what you need once. Banks across Mauritius bid against each other with their best offer.
            </p>
            <div className="flex flex-col gap-4 mt-12">
              {[
                { icon: Shield, text: "Bank-grade security" },
                { icon: Zap, text: "Bids in as little as 24 hours" },
                { icon: Globe, text: "All major Mauritian banks" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                       style={{ background: "linear-gradient(135deg,rgba(30,108,245,.16),rgba(124,58,237,.16))" }}>
                    <item.icon size={17} className="text-white/80" />
                  </div>
                  <span className="text-[15px] text-[#8E8EB4]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/25">© {new Date().getFullYear()} Ficium · Mauritius</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col min-h-screen relative bg-paper">

        {/* Mobile dark bg */}
        <div className="absolute inset-0 lg:hidden" style={{ background: "radial-gradient(120% 160% at 8% 0%, #181842 0%, #0B0B1E 55%)" }} />
        

        <div className="relative z-10 flex flex-col h-full">

          {/* Mobile top nav */}
          <div className="flex lg:hidden items-center justify-between px-5 py-5">
            <Link to="/" className="no-underline">
              <FiciumLogo heightPx={20} withWordmark wordmarkClassName="text-base text-white" />
            </Link>
            <Link to="/register" className="text-sm text-white/60 font-semibold no-underline">Register →</Link>
          </div>

          {/* Desktop top bar */}
          <div className="hidden lg:flex items-center justify-end px-8 xl:px-12 py-6 border-b border-ink/[0.06]">
            <div className="text-[15px] text-muted">
              New to Ficium?{" "}
              <Link to="/register" className="text-ficium font-semibold no-underline hover:underline">
                Create account
              </Link>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-5 py-8 lg:px-12 xl:px-20">
            <div className="w-full max-w-[400px]">

              <div className="mb-10">
                <h1 className="font-display text-4xl lg:text-5xl font-bold">
                  <span className="hidden lg:block text-ink">Welcome back</span>
                  <span className="lg:hidden text-white">Welcome back</span>
                </h1>
                <p className="text-[16px] mt-2">
                  <span className="hidden lg:block text-muted">Sign in to your Ficium account</span>
                  <span className="lg:hidden text-white/50">Sign in to your Ficium account</span>
                </p>
              </div>

              {/* Single form instance — styled differently via inner className */}
              <LoginForm
                register={register}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                errors={errors}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />

              <p className="lg:hidden text-center text-[15px] text-white/50 mt-5">
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

/* ============================================================
   LOGIN FORM
   — Uses raw <input> elements instead of the shared Input
     wrapper so every HTML attribute is guaranteed to reach
     the DOM node (the wrapper may not forward unknown attrs).
   ============================================================ */

// Props are a passthrough of react-hook-form's useForm() bundle; typing the
// full shape here adds noise without safety. Matches the api/chat.ts convention.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LoginForm({ register, handleSubmit, onSubmit, errors, isSubmitting, submitError }: any) {
  const [showPassword, setShowPassword] = useState(false);

  const { ref: emailRef, ...emailRest } = register("email");
  const { ref: passwordRef, ...passwordRest } = register("password");

  return (
    <div className="lg:hidden-wrapper">
      {/* Glass card on mobile, plain on desktop */}
      <div className="bg-white/[0.97] backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-5 lg:bg-transparent lg:backdrop-blur-none lg:rounded-none lg:shadow-none lg:p-0 lg:mb-0">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

      {/* ── EMAIL ── */}
      <Field label="Email address" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          ref={emailRef}
          {...emailRest}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          spellCheck={false}
          className={inputCls(!!errors.email)}
          placeholder="you@example.com"
        />
      </Field>

      {/* ── PASSWORD ── */}
      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        rightLabel={
          <Link to="/forgot-password" className="text-[13px] text-ficium font-semibold no-underline hover:underline">
            Forgot password?
          </Link>
        }
      >
        <div className="relative">
          <input
            id="password"
            ref={passwordRef}
            {...passwordRest}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={inputCls(!!errors.password)}
            placeholder="••••••••"
            style={{ paddingRight: "2.75rem" }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>

      {/* ── REMEMBER ME ── */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" {...register("rememberMe")} className="w-4 h-4 accent-ficium rounded" />
        <span className="text-[14px] text-ink/70">Remember me</span>
      </label>

      {/* ── ERROR ── */}
      {submitError && (
        <div role="alert" className="px-4 py-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[14px]">
          {submitError}
        </div>
      )}

      {/* ── SUBMIT ── */}
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
    </div>
  );
}
