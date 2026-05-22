import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Props = {
  back?: { label: string; to: string };
  children: React.ReactNode;
};

export function RegisterShell({ back, children }: Props) {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-ficium/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-mint/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col px-5 py-8 sm:px-6 sm:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 max-w-[640px] mx-auto w-full">
          {back ? (
            <Link
              to={back.to}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors no-underline"
            >
              <ArrowLeft size={16} /> {back.label}
            </Link>
          ) : <div />}
          <Link to="/" className="flex items-center gap-2 no-underline text-ink">
            <FLogo size={24} className="text-ficium" />
            <span className="font-display text-lg font-bold">Ficium</span>
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-start">
          <div className="w-full max-w-[640px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted mt-8">
          Already have an account?{" "}
          <Link to="/login" className="text-ficium font-semibold no-underline">Sign in</Link>
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