import { Link }                  from "react-router-dom";
import { ShieldAlert, BookOpen } from "lucide-react";

interface OnboardingBannersProps {
  kycVerified: boolean;
  hasDossier:  boolean;
}

// Solid-color banners — fully readable on both dark and light backgrounds.
export function OnboardingBanners({ kycVerified, hasDossier }: OnboardingBannersProps) {
  return (
    <>
      {!kycVerified && (
        <div className="flex items-center gap-3 px-4 py-4 mb-4 rounded-2xl"
             style={{ background: "#d97706", boxShadow: "0 4px 20px rgba(217,119,6,0.3)" }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] sm:text-[15px] font-bold text-white leading-tight">
              Finish verifying your identity
            </div>
            <div className="text-[12px] text-white/80 mt-0.5">
              Banks can't bid until KYC is complete.
            </div>
          </div>
          <Link to="/onboarding/kyc"
                className="text-[13px] font-bold text-white no-underline shrink-0 bg-white/20 px-3 py-1.5 rounded-pill hover:bg-white/30 transition-colors">
            Resume →
          </Link>
        </div>
      )}
      {kycVerified && !hasDossier && (
        <div className="flex items-center gap-3 px-4 py-4 mb-4 rounded-2xl"
             style={{ background: "#2A1FE6", boxShadow: "0 4px 20px rgba(42,31,230,0.3)" }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <BookOpen size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] sm:text-[15px] font-bold text-white leading-tight">
              Complete your financial profile
            </div>
            <div className="text-[12px] text-white/80 mt-0.5">
              Banks need this to bid accurately.
            </div>
          </div>
          <Link to="/onboarding/dossier"
                className="text-[13px] font-bold text-white no-underline shrink-0 bg-white/20 px-3 py-1.5 rounded-pill hover:bg-white/30 transition-colors">
            Start →
          </Link>
        </div>
      )}
    </>
  );
}
