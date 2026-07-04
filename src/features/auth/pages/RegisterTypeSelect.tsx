import { useNavigate } from "react-router-dom";
import { User, Building2, Landmark, ArrowRight, Check } from "lucide-react";
import { RegisterShell } from "../../../shared/components/RegisterShell";

const TYPES = [
  {
    id: "individual",
    icon: User,
    iconBg: "bg-ficium/10 text-ficium",
    title: "Individual",
    subtitle: "Personal use",
    description: "You're looking for personal loans, savings, deposits or investments.",
    features: ["Personal loans", "Fixed deposits", "Savings accounts", "Investment products"],
    href: "/register/individual",
    accent: "border-ficium/30 hover:border-ficium",
    badge: null,
  },
  {
    id: "business",
    icon: Building2,
    iconBg: "bg-amber-50 text-amber-600",
    title: "Business",
    subtitle: "SME & corporate",
    description: "Your company needs financing, working capital or banking products.",
    features: ["SME loans", "Business accounts", "Equipment leasing", "Trade finance"],
    href: "/register/business",
    accent: "border-amber-200 hover:border-amber-400",
    badge: null,
  },
  {
    id: "institution",
    icon: Landmark,
    iconBg: "bg-blue-50 text-blue-600",
    title: "Financial Institution",
    subtitle: "Banks, fintechs, micro-credit",
    description: "You're a licensed lender wanting to bid on client requests.",
    features: ["Place competitive bids", "Access qualified leads", "Manage your pipeline", "Analytics dashboard"],
    href: "/register/institution",
    accent: "border-blue-200 hover:border-blue-500",
    badge: "For institutions",
  },
] as const;

export default function RegisterTypeSelect() {
  const navigate = useNavigate();

  return (
    <RegisterShell back={{ label: "Back to home", to: "/" }}>
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">
          Who are you?
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2">
          Choose the account type that fits your needs. You can't change this later.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => navigate(t.href)}
              className={[
                "w-full text-left p-5 sm:p-6 bg-white rounded-2xl border-2 transition-all duration-200",
                "hover:shadow-md group",
                t.accent,
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={["w-12 h-12 rounded-xl grid place-items-center shrink-0", t.iconBg].join(" ")}>
                  <Icon size={22} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="font-display text-lg font-bold">{t.title}</div>
                    {t.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-blue-50 text-blue-600 border border-blue-200">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mb-2">{t.subtitle}</div>
                  <div className="text-sm text-ink/70 mb-3">{t.description}</div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-1">
                    {t.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[12px] text-muted">
                        <Check size={11} className="text-ficium shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight
                  size={18}
                  className="text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                />
              </div>
            </button>
          );
        })}
      </div>

    </RegisterShell>
  );
}