import { Link }                    from "react-router-dom";
import { ShieldAlert, BookOpen }   from "lucide-react";

interface OnboardingBannersProps {
  kycVerified: boolean;
  hasDossier:  boolean;
}

// Pure presentational. Renders 0, 1, or 2 banners depending on profile state.
export function OnboardingBanners({ kycVerified, hasDossier }: OnboardingBannersProps) {
  return (
    <>
      {!kycVerified && (
        <div className="flex items-start gap-3 px-4 py-3.5 mb-4 bg-amber-500/15 backdrop-blur-sm border border-amber-400/25 rounded-2xl">
          <ShieldAlert size={18} className="text-amber-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-white">Finish verifying your identity</div>
            <div className="text-[13px] text-white/50 mt-0.5">Banks can't bid until KYC is complete.</div>
          </div>
          <Link to="/onboarding/kyc" className="text-[13px] font-bold text-amber-300 no-underline flex-shrink-0 pt-0.5">
            Resume →
          </Link>
        </div>
      )}
      {kycVerified && !hasDossier && (
        <div className="flex items-start gap-3 px-4 py-3.5 mb-4 bg-ficium/15 backdrop-blur-sm border border-ficium/25 rounded-2xl">
          <BookOpen size={18} className="text-indigo-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-white">Complete your financial profile</div>
            <div className="text-[13px] text-white/50 mt-0.5">Banks need this to bid accurately.</div>
          </div>
          <Link to="/onboarding/dossier" className="text-[13px] font-bold text-indigo-300 no-underline flex-shrink-0 pt-0.5">
            Start →
          </Link>
        </div>
      )}
    </>
  );
}
