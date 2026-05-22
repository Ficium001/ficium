import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Props = {
  back?: { label: string; to: string };
  children: React.ReactNode;
};

export function RegisterShell({ back, children }: Props) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-ink">

      {/* ── ANIMATED GRADIENT BACKGROUND ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
      <div className="absolute inset-0 opacity-60"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(139,92,246,0.3) 0%, transparent 50%)",
        }}
      />
      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-ficium/20 blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-violet-500/15 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full bg-indigo-400/10 blur-[60px] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* ── CONTENT ── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top nav */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5">
          {back ? (
            <Link
              to={back.to}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors no-underline"
            >
              <ArrowLeft size={15} /> {back.label}
            </Link>
          ) : <div />}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <FLogo size={24} className="text-white" />
            <span className="font-display text-lg font-bold text-white">Ficium</span>
          </Link>
        </div>

        {/* Centered card — phone width on all screens */}
        <div className="flex-1 flex items-center justify-center px-5 py-6">
          <div className="w-full max-w-[420px] flex flex-col gap-5">

            {/* Glass card */}
            <div className="bg-white/[0.97] backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 sm:p-8">
                {children}
              </div>
            </div>

            {/* Sign in link */}
            <p className="text-center text-sm text-white/50">
              Already have an account?{" "}
              <Link to="/login" className="text-white font-semibold no-underline hover:underline">
                Sign in
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