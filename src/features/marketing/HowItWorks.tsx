import { Link } from "react-router-dom";
import {
  UserPlus, FileText, Building2, Trophy, ArrowRight,
  Shield, Zap, Globe, Clock, CheckCircle2, ChevronRight,
  Sparkles, TrendingDown, Users, Star,
} from "lucide-react";

/* ── NAV (reuse your existing Navbar or inline a simple one) ── */

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] text-ink">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Dark gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(201,168,76,0.2) 0%, transparent 50%)"
        }} />
        <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-ficium/15 blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f7f4] to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1100px] px-5 sm:px-8 pt-24 pb-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 px-4 py-2 rounded-pill text-[13px] font-semibold mb-6">
            <Sparkles size={13} className="text-amber-300" />
            The reverse-banking marketplace
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6">
            You post once.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-amber-300">
              Banks compete.
            </span>
          </h1>
          <p className="text-white/55 text-[18px] sm:text-[20px] leading-relaxed max-w-[580px] mx-auto mb-10">
            Ficium flips the script on banking. Instead of you begging banks for a loan, they bid against each other to win your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 bg-ficium text-white px-7 py-4 rounded-pill text-[15px] font-bold no-underline shadow-ficium hover:-translate-y-0.5 transition-transform">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link to="/register/institution" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-7 py-4 rounded-pill text-[15px] font-semibold no-underline hover:bg-white/15 transition-colors">
              I'm a bank <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════ */}
      <section className="relative z-10 -mt-8 mx-auto max-w-[1100px] px-5 sm:px-8 mb-20">
        <div className="bg-white rounded-[24px] shadow-xl border border-ink/[0.06] grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-ink/[0.06]">
          {[
            { value: "14+", label: "Financial institutions", icon: Building2 },
            { value: "24h", label: "Average first bid", icon: Clock },
            { value: "MUR 2.3B", label: "In bids placed", icon: TrendingDown },
            { value: "4.9 ★", label: "User satisfaction", icon: Star },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-6 px-4 text-center gap-1">
              <s.icon size={18} className="text-ficium mb-1" />
              <div className="font-display text-[28px] font-extrabold text-ink">{s.value}</div>
              <div className="text-[12px] text-muted font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS — INDIVIDUAL
      ══════════════════════════════════════ */}
      <section className="mx-auto max-w-[1100px] px-5 sm:px-8 mb-24">
        <div className="text-center mb-14">
          <div className="text-[12px] font-bold text-ficium uppercase tracking-widest mb-2">For individuals</div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            Get the best deal in<br /><span className="text-ficium">4 simple steps</span>
          </h2>
          <p className="text-[16px] text-muted mt-3 max-w-[500px] mx-auto">
            No more visiting branch after branch. One profile, one request — multiple competing offers.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line — desktop only */}
          <div className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-ficium/30 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INDIVIDUAL_STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <Link to="/register" className="inline-flex items-center gap-2 bg-ficium text-white px-8 py-4 rounded-pill text-[15px] font-bold no-underline shadow-ficium hover:-translate-y-0.5 transition-transform">
            Start your free profile <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VISUAL DIVIDER — "The old way vs Ficium"
      ══════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63] py-20 px-5 sm:px-8 mb-24 overflow-hidden relative">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(79,70,229,0.3) 0%, transparent 60%)" }} />
        <div className="relative z-10 mx-auto max-w-[1100px]">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
              The old way vs <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-amber-300">Ficium</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Old way */}
            <div className="rounded-[22px] bg-white/[0.05] border border-white/10 p-6 sm:p-8">
              <div className="text-[12px] font-bold uppercase tracking-widest text-red-400 mb-5">❌ The old way</div>
              <div className="flex flex-col gap-4">
                {OLD_WAY.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 grid place-items-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    </div>
                    <span className="text-[15px] text-white/60 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Ficium way */}
            <div className="rounded-[22px] bg-ficium/20 border border-ficium/30 p-6 sm:p-8">
              <div className="text-[12px] font-bold uppercase tracking-widest text-emerald-400 mb-5">✓ With Ficium</div>
              <div className="flex flex-col gap-4">
                {FICIUM_WAY.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[15px] text-white/85 font-medium leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS — INSTITUTION
      ══════════════════════════════════════ */}
      <section className="mx-auto max-w-[1100px] px-5 sm:px-8 mb-24">
        <div className="text-center mb-14">
          <div className="text-[12px] font-bold text-blue-600 uppercase tracking-widest mb-2">For financial institutions</div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            Access qualified leads.<br /><span className="text-blue-600">Bid. Win.</span>
          </h2>
          <p className="text-[16px] text-muted mt-3 max-w-[500px] mx-auto">
            Stop spending on acquisition. Every lead on Ficium is pre-screened, KYC-verified and actively looking.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INSTITUTION_STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} accent="blue" />
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <Link to="/register/institution" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-pill text-[15px] font-bold no-underline hover:-translate-y-0.5 transition-transform shadow-lg shadow-blue-600/25">
            Join as an institution <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TRUST & SECURITY
      ══════════════════════════════════════ */}
      <section className="bg-white border-y border-ink/[0.06] py-20 px-5 sm:px-8 mb-24">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-12">
            <div className="text-[12px] font-bold text-ficium uppercase tracking-widest mb-2">Security & compliance</div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold">
              Built on <span className="text-ficium">trust</span>
            </h2>
            <p className="text-[16px] text-muted mt-3 max-w-[500px] mx-auto">
              Bank-grade security, FSC-compliant, your data never sold.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-ink/[0.06] p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className={["w-11 h-11 rounded-xl grid place-items-center mb-4", item.iconBg].join(" ")}>
                  <item.icon size={20} className={item.iconColor} />
                </div>
                <div className="font-display text-[18px] font-bold mb-2">{item.title}</div>
                <p className="text-[14px] text-muted leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FAQ
      ══════════════════════════════════════ */}
      <section className="mx-auto max-w-[800px] px-5 sm:px-8 mb-24">
        <div className="text-center mb-12">
          <div className="text-[12px] font-bold text-ficium uppercase tracking-widest mb-2">FAQ</div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold">Common questions</h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden mb-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(79,70,229,0.4) 0%, transparent 60%)" }} />
        <div className="relative z-10 mx-auto max-w-[700px] px-5 sm:px-8 py-24 text-center">
          <h2 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight mb-5">
            Ready to let banks<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-amber-300">fight for you?</span>
          </h2>
          <p className="text-[17px] text-white/50 mb-10 leading-relaxed">
            Free to join. No hidden fees. Your data is never sold.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-ficium px-8 py-4 rounded-pill text-[16px] font-bold no-underline hover:-translate-y-0.5 transition-transform shadow-2xl">
            Create free account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}

/* ============================================================
   STEP CARD
   ============================================================ */
function StepCard({ step, index, accent = "ficium" }: {
  step: typeof INDIVIDUAL_STEPS[0];
  index: number;
  accent?: "ficium" | "blue";
}) {
  const accentColor = accent === "blue" ? "bg-blue-600" : "bg-ficium";
  const accentLight = accent === "blue" ? "bg-blue-50 text-blue-600" : "bg-ficium/10 text-ficium";
  const Icon = step.icon;
  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] p-6 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Number + icon */}
      <div className="flex items-center justify-between">
        <div className={["w-10 h-10 rounded-xl grid place-items-center", accentLight].join(" ")}>
          <Icon size={19} />
        </div>
        <div className={["w-8 h-8 rounded-full grid place-items-center text-white text-[13px] font-bold", accentColor].join(" ")}>
          {index + 1}
        </div>
      </div>
      <div>
        <div className="font-display text-[18px] font-bold mb-1.5">{step.title}</div>
        <p className="text-[14px] text-muted leading-relaxed">{step.description}</p>
      </div>
      {step.detail && (
        <div className="mt-auto pt-3 border-t border-ink/[0.06]">
          <span className="text-[12px] font-semibold text-ficium">{step.detail}</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   FAQ ITEM
   ============================================================ */
function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white rounded-2xl border border-ink/[0.06] overflow-hidden">
      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none">
        <span className="font-display text-[16px] font-bold">{q}</span>
        <ChevronRight size={16} className="text-muted flex-shrink-0 group-open:rotate-90 transition-transform" />
      </summary>
      <div className="px-6 pb-5 text-[14px] text-muted leading-relaxed border-t border-ink/[0.04]">
        <div className="pt-4">{a}</div>
      </div>
    </details>
  );
}

/* ============================================================
   DATA
   ============================================================ */
const INDIVIDUAL_STEPS = [
  {
    icon: UserPlus,
    title: "Create your profile",
    description: "Sign up in minutes. Complete your KYC and financial dossier once — securely stored.",
    detail: "Free · Takes ~10 minutes",
  },
  {
    icon: FileText,
    title: "Post your request",
    description: "Tell us what you need — a loan, deposit, investment. Set your preferred terms.",
    detail: "No commitment required",
  },
  {
    icon: Building2,
    title: "Banks bid for you",
    description: "Verified Mauritian institutions review your profile and compete with their best offers.",
    detail: "First bid within 24 hours",
  },
  {
    icon: Trophy,
    title: "You choose the winner",
    description: "Compare all bids side by side. Accept the one that suits you best. Done.",
    detail: "You're always in control",
  },
];

const INSTITUTION_STEPS = [
  {
    icon: UserPlus,
    title: "Register your institution",
    description: "Onboard your team, set your product offerings and bidding parameters.",
    detail: "Compliance-first onboarding",
  },
  {
    icon: Users,
    title: "Access the marketplace",
    description: "Browse KYC-verified, pre-screened client requests that match your criteria.",
    detail: "Real-time feed",
  },
  {
    icon: Zap,
    title: "Place competitive bids",
    description: "Submit your best offer — rate, term, conditions. Outbid your competition.",
    detail: "Instant submission",
  },
  {
    icon: Trophy,
    title: "Win the client",
    description: "Client accepts your bid. You get a warm, pre-qualified lead ready to convert.",
    detail: "Zero cold outreach",
  },
];

const OLD_WAY = [
  "Visit 5 different bank branches",
  "Fill the same forms over and over",
  "Wait weeks for a response",
  "Accept whatever rate they offer",
  "No visibility into competing offers",
  "Banks hold all the power",
];

const FICIUM_WAY = [
  "One profile, built once",
  "Post your request in minutes",
  "First bid within 24 hours",
  "Banks compete — you get the best rate",
  "Full transparency across all bids",
  "You hold all the power",
];

const TRUST_ITEMS = [
  {
    icon: Shield,
    iconBg: "bg-ficium/10",
    iconColor: "text-ficium",
    title: "Bank-grade security",
    description: "256-bit encryption, row-level security on all data. Your financial information is never accessible to other users.",
  },
  {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "KYC & AML compliant",
    description: "Every user is identity-verified. Every institution is licensed. Ficium is fully compliant with FSC Mauritius regulations.",
  },
  {
    icon: Globe,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "Data never sold",
    description: "Your data is used only to connect you with institutions on Ficium. We do not sell, share, or monetise your personal data.",
  },
  {
    icon: Zap,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    title: "Real-time notifications",
    description: "Get instant alerts the moment a bank places a bid on your request. Never miss an offer.",
  },
  {
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Verified institutions only",
    description: "Only FSC-licensed banks, fintechs, and micro-credit institutions are permitted to bid on the platform.",
  },
  {
    icon: TrendingDown,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    title: "Always free for users",
    description: "Ficium is completely free for individuals and businesses. We earn from institutions — never from you.",
  },
];

const FAQS = [
  {
    q: "Is Ficium free to use?",
    a: "Yes — completely free for individuals and businesses. You pay nothing to create a profile, post a request, or accept a bid. Ficium charges the institutions, not you.",
  },
  {
    q: "How many banks can bid on my request?",
    a: "All 14+ verified institutions on the platform can see and bid on your request. In practice, most requests receive between 3 and 8 bids within 48 hours.",
  },
  {
    q: "Is my financial information safe?",
    a: "Yes. Your data is encrypted at rest and in transit, protected by row-level security, and never shared with any party outside the platform. Institutions only see the information relevant to your request.",
  },
  {
    q: "Do I have to accept a bid?",
    a: "Never. You are under no obligation to accept any bid. If no offer suits you, simply let the request expire or close it yourself.",
  },
  {
    q: "How long does KYC take?",
    a: "KYC is powered by Smile ID and typically completes within 2–5 minutes. In rare cases involving manual review it may take up to 24 hours.",
  },
  {
    q: "What types of products can I request?",
    a: "Personal loans, business loans, fixed deposits, savings accounts, credit cards, investment products, and more. If a Mauritian bank offers it, you can request it on Ficium.",
  },
  {
    q: "I'm a bank. How do I join?",
    a: "Register as a Financial Institution, complete compliance onboarding, and your team will have access to the live marketplace feed. Contact us at hello@ficium.mu to fast-track your onboarding.",
  },
];