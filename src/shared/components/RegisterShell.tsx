import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Props = {
  back?: { label: string; to: string };
  children: React.ReactNode;
};

// Free Pexels MP4s — loop between them for variety
const VIDEO_URL = "https://videos.pexels.com/video-files/3044128/3044128-uhd_2560_1440_25fps.mp4";

export function RegisterShell({ back, children }: Props) {
  return (
    <div className="min-h-screen relative overflow-hidden">

      {/* ── BACKGROUND VIDEO ── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_URL}
      />

      {/* ── GRADIENT OVERLAY ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-ink/80 via-ink/60 to-ficium/40" />

      {/* ── CONTENT ── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top nav */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5">
          {back ? (
            <Link
              to={back.to}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors no-underline"
            >
              <ArrowLeft size={16} /> {back.label}
            </Link>
          ) : <div />}

          <Link to="/" className="flex items-center gap-2 no-underline">
            <FLogo size={24} className="text-white" />
            <span className="font-display text-lg font-bold text-white">Ficium</span>
          </Link>
        </div>

        {/* Main content — centered card */}
        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-[560px]">
            {/* Glass card */}
            <div className="bg-white/[0.97] backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 sm:p-8">
                {children}
              </div>
            </div>

            {/* Sign in link below card */}
            <p className="text-center text-sm text-white/70 mt-5">
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