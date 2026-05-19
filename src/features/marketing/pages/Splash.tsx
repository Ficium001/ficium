import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Shield,
  TrendingDown,
  Building2,
  Bell,
  Lock,
  Globe,
  LineChart,
  HandCoins,
  PiggyBank,
  Check,
} from "lucide-react";

/* ---------- Types ---------- */

type Offer = {
  bank: string;
  product: string;
  rate: string;
  badge: string;
  color: string;
};

type Scene = {
  label: string;
  product: string;
  amount: string;
  term: string;
  bidsLabel: string;
  offers: Offer[];
};

/* ---------- Hooks ---------- */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;

}

function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf: number | null = null;
    const tick = () => {
      setY(window.scrollY);
      raf = null;
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  threshold = 0.15
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
}

/* ---------- Scenes (Mauritius, banks-only, MUR) ---------- */

const SCENES: Scene[] = [
  {
    label: "Personal Loan",
    product: "Personal Loan",
    amount: "MUR 500,000",
    term: "36 months · Mauritius",
    bidsLabel: "12 banks bidding",
    offers: [
      { bank: "MCB Bank",     product: "Personal Loan · MUR 500K", rate: "8.2%", badge: "Best rate",        color: "#FFD84D" },
      { bank: "SBM Bank",     product: "Personal Loan · MUR 500K", rate: "9.1%", badge: "Fastest decision", color: "#7DF9C5" },
      { bank: "AfrAsia Bank", product: "Personal Loan · MUR 500K", rate: "9.4%", badge: "No fees",          color: "#FF9F7A" },
    ],
  },
  {
    label: "Business Funding",
    product: "SME Working Capital",
    amount: "MUR 2,500,000",
    term: "60 months · Port Louis SME",
    bidsLabel: "8 banks bidding",
    offers: [
      { bank: "AfrAsia Bank", product: "SME Loan · MUR 2.5M", rate: "7.9%", badge: "Best rate",     color: "#FFD84D" },
      { bank: "MCB Bank",     product: "SME Loan · MUR 2.5M", rate: "8.3%", badge: "Relationship",  color: "#7DF9C5" },
      { bank: "MauBank",      product: "SME Loan · MUR 2.5M", rate: "8.7%", badge: "Fast approval", color: "#FF9F7A" },
    ],
  },
  {
    label: "Fixed Deposit",
    product: "Fixed Deposit",
    amount: "MUR 1,000,000",
    term: "24 months · p.a.",
    bidsLabel: "9 banks bidding",
    offers: [
      { bank: "ABC Banking", product: "FD · MUR 1M · 24mo", rate: "5.4%", badge: "Best yield", color: "#FFD84D" },
      { bank: "SBM Bank",    product: "FD · MUR 1M · 24mo", rate: "5.1%", badge: "Tier 1",     color: "#7DF9C5" },
      { bank: "MauBank",     product: "FD · MUR 1M · 24mo", rate: "4.9%", badge: "Bonus tier", color: "#FF9F7A" },
    ],
  },
  {
    label: "Investments",
    product: "Investment Account",
    amount: "MUR 750,000",
    term: "Managed · 12mo target",
    bidsLabel: "6 banks bidding",
    offers: [
      { bank: "MCB Capital",    product: "Balanced · MUR 750K", rate: "+7.4%", badge: "Top return",  color: "#FFD84D" },
      { bank: "AfrAsia Wealth", product: "Growth · MUR 750K",   rate: "+8.1%", badge: "Higher risk", color: "#7DF9C5" },
      { bank: "SBM Asset Mgmt", product: "Income · MUR 750K",   rate: "+5.6%", badge: "Lowest fee",  color: "#FF9F7A" },
    ],
  },
];

/* ---------- Main page ---------- */

export default function Splash() {
  const reducedMotion = useReducedMotion();
  const scrollY = useScrollY();

  const [sceneIndex, setSceneIndex] = useState(0);
  const [activeOffer, setActiveOffer] = useState(0);

  // Detect Supabase auth errors arriving in the URL hash (e.g., expired
  // password reset link) and redirect to a friendly explanation page.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error=access_denied") || hash.includes("error_code=otp_expired")) {
      window.history.replaceState(null, "", window.location.pathname);
      window.location.href = "/auth/reset-password";
    }
  }, []);


  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => {
      setSceneIndex((i) => (i + 1) % SCENES.length);
      setActiveOffer(0);
    }, 5200);
    return () => clearInterval(t);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => {
      setActiveOffer((o) => (o + 1) % 3);
    }, 1700);
    return () => clearInterval(t);
  }, [sceneIndex, reducedMotion]);

  const scene = SCENES[sceneIndex];

  return (
    <div className="min-h-screen bg-cream text-ink overflow-x-hidden">
      <Nav scrollY={scrollY} />
      <Hero scene={scene} sceneIndex={sceneIndex} activeOffer={activeOffer} />
      <HowItWorks />
      <Products />
      <Trust />
      <CTA />
      <Footer />
    </div>
  );
}

/* ---------- Nav ---------- */

function Nav({ scrollY }: { scrollY: number }) {
  const scrolled = scrollY > 40;
  return (
    <nav
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-cream/85 backdrop-blur-xl border-b border-ink/[0.06]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-4 sm:py-[18px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-ink">
          <FLogo size={28} className="sm:hidden" colorClass="text-ficium" />
          <FLogo size={32} className="hidden sm:block" colorClass="text-ficium" />
          <span className="font-display text-xl sm:text-2xl font-bold">Ficium</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-9">
          {/* Desktop nav links — hidden on mobile/tablet */}
          <div className="hidden lg:flex gap-7 text-[15px] font-medium">
            {[
              { l: "Loans", h: "#products" },
              { l: "Deposits", h: "#products" },
              { l: "Business", h: "#products" },
              { l: "How it works", h: "#how-it-works" },
            ].map((it) => (
              <a key={it.l} href={it.h} className="text-ink/75 hover:text-ink no-underline transition-colors">
                {it.l}
              </a>
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3">
            <Link
              to="/login"
              className="inline-flex items-center bg-transparent px-3 sm:px-4 py-2 text-sm font-semibold text-ink no-underline"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center bg-ink text-cream px-4 sm:px-5 py-2.5 rounded-pill text-sm font-semibold no-underline"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ---------- Hero ---------- */

function Hero({ scene, sceneIndex, activeOffer }: { scene: Scene; sceneIndex: number; activeOffer: number }) {
  return (
    <section className="relative pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-24 lg:pb-28 min-h-[calc(100vh-80px)]">
      {/* Decorative blobs — sized smaller on mobile so they don't overflow */}
      <div className="absolute top-40 -right-20 sm:-right-24 w-60 sm:w-80 lg:w-96 h-60 sm:h-80 lg:h-96 rounded-full bg-accent opacity-55 blur-[2px] pointer-events-none" />
      <div className="absolute top-[480px] -left-12 sm:-left-20 w-40 sm:w-56 lg:w-60 h-40 sm:h-56 lg:h-60 rounded-full bg-mint opacity-50 pointer-events-none" />

      <div className="relative z-[2] max-w-[1280px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
        {/* Left column — text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-ficium/10 text-ficium px-3.5 py-2 rounded-pill text-xs sm:text-[13px] font-semibold mb-6 sm:mb-7">
            <Sparkles size={14} /> The reverse-banking marketplace
          </div>
          <h1 className="font-display font-bold text-ink m-0 text-[44px] leading-[0.95] sm:text-6xl md:text-7xl lg:text-[88px] xl:text-[96px]">
            Loans, deposits,
            <br />
            <span className="text-ficium">business funding</span> —
            <br />
            <span className="relative inline-block">
              let banks
              <svg
                className="absolute left-0 -bottom-2 w-full"
                viewBox="0 0 400 14"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8 Q 100 2, 200 7 T 398 6"
                  stroke="#FFD84D"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br />
            come to you.
          </h1>
          <p className="text-base sm:text-lg lg:text-[19px] leading-snug text-muted mt-6 sm:mt-8 max-w-[480px]">
            Post what you need once. Banks across Mauritius compete with their best offer. You pick. That's it.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 sm:mt-10">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-ficium text-white px-6 sm:px-7 py-4 rounded-pill text-base font-semibold no-underline shadow-ficium"
            >
              Get my offers <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center bg-transparent text-ink px-6 py-4 rounded-pill text-base font-semibold border-[1.5px] border-ink/15 no-underline"
             >
              See how it works
            </a>
          </div>

          {/* Scene pagination */}
          <div className="flex gap-2 mt-8 sm:mt-10 items-center">
            {SCENES.map((s, i) => (
              <div
                key={s.label}
                className={[
                  "h-2 rounded-pill transition-[width] duration-400",
                  i === sceneIndex ? "w-7 bg-ficium" : "w-2 bg-ink/15",
                ].join(" ")}
              />
            ))}
            <div className="ml-3 text-xs sm:text-[13px] text-muted">{scene.label}</div>
          </div>
        </div>

        {/* Right column — phone */}
        <div className="relative flex justify-center mt-6 lg:mt-0 animate-[float_6s_ease-in-out_infinite] motion-reduce:animate-none">
          <Phone scene={scene} sceneIndex={sceneIndex} activeOffer={activeOffer} />

          {/* Floating callouts — adjusted for smaller screens */}
          <div className="absolute -top-2 -left-4 sm:-left-10 bg-white px-3 py-2.5 rounded-xl shadow-card flex items-center gap-2 animate-[slideIn_1s_0.4s_both]">
            <div className="w-8 h-8 rounded-full bg-mint grid place-items-center">
              <TrendingDown size={16} />
            </div>
            <div>
              <div className="text-[11px] text-muted">Rate dropped</div>
              <div className="text-[13px] font-bold">−0.4%</div>
            </div>
          </div>
          <div className="absolute bottom-20 -right-4 sm:-right-12 bg-white px-3 py-2.5 rounded-xl shadow-card flex items-center gap-2 animate-[slideIn_1s_0.8s_both]">
            <div className="w-8 h-8 rounded-full bg-accent grid place-items-center">
              <Bell size={16} />
            </div>
            <div>
              <div className="text-[11px] text-muted">New bid</div>
              <div className="text-[13px] font-bold">{scene.offers[activeOffer]?.bank}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes only — Tailwind doesn't ship "float" or "slideIn" out of the box */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
        .ticker-dot { animation: pulse-ring 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ticker-dot { animation: none; } }
      `}</style>
    </section>
  );
}

/* ---------- Phone mockup ---------- */

function Phone({ scene, sceneIndex, activeOffer }: { scene: Scene; sceneIndex: number; activeOffer: number }) {
  return (
    <div
      className="w-[280px] sm:w-[320px] lg:w-[340px] aspect-[340/680] bg-ink rounded-[40px] sm:rounded-[48px] p-3 relative shadow-phone"
    >
      <div className="w-full h-full rounded-[32px] sm:rounded-[38px] p-[44px_22px_22px] overflow-hidden relative bg-gradient-to-br from-ficium to-ficium-deep">
        {/* Notch */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-ink rounded-pill" />

        {/* Header row */}
        <div className="flex justify-between items-center mt-2 mb-5">
          <div className="text-white text-[13px] opacity-70">Your request</div>
          <div className="bg-white/15 px-2.5 py-1 rounded-pill text-white text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint" />
            LIVE
          </div>
        </div>

        {/* Amount */}
        <div className="text-white mb-6">
          <div className="text-[13px] opacity-70 mb-1">{scene.product}</div>
          <div className="font-display text-[34px] sm:text-[38px] font-bold">{scene.amount}</div>
          <div className="text-[13px] opacity-70 mt-1">{scene.term}</div>
        </div>

        {/* Bids label */}
        <div className="text-white text-[13px] opacity-85 mb-3 flex justify-between">
          <span>{scene.bidsLabel}</span>
          <span className="flex items-center gap-1.5">
            <span className="relative w-2 h-2">
              <span className="ticker-dot absolute inset-0 rounded-full bg-mint" />
              <span className="absolute inset-0 rounded-full bg-mint" />
            </span>
            updating
          </span>
        </div>

        {/* Offers */}
        <div className="flex flex-col gap-2.5">
          {scene.offers.map((o, i) => {
            const isActive = i === activeOffer;
            return (
              <div
                key={`${sceneIndex}-${i}`}
                className={[
                  "rounded-2xl px-4 py-3.5 transition-all duration-500",
                  isActive
                    ? "bg-white scale-[1.02]"
                    : "bg-white/[0.08] border border-white/10 scale-100",
                ].join(" ")}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className={["text-sm font-semibold mb-0.5", isActive ? "text-ink" : "text-white"].join(" ")}>
                      {o.bank}
                    </div>
                    <div className={["text-[11px]", isActive ? "text-muted" : "text-white/60"].join(" ")}>
                      {o.product}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={["font-display text-[22px] font-bold", isActive ? "text-ficium" : "text-white"].join(" ")}>
                      {o.rate}
                    </div>
                    <div className={["text-[10px]", isActive ? "text-muted" : "text-white/50"].join(" ")}>
                      {scene.label === "Investments" ? "12mo" : "APR"}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <div
                    className="inline-block mt-2.5 px-2.5 py-0.5 rounded-pill text-[10px] font-bold text-ink"
                    style={{ background: o.color }}
                  >
                    ⚡ {o.badge}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="w-full mt-3.5 bg-white text-ficium py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 border-none cursor-pointer"
        >
          Accept best offer <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <section
      id="how-it-works"
      className="bg-ink text-cream py-20 sm:py-28 lg:py-32 px-5 sm:px-8 relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-ficium opacity-40 blur-[80px] pointer-events-none" />
      <div
        ref={ref}
        className={[
          "relative max-w-[1280px] mx-auto transition-all duration-700",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7",
        ].join(" ")}
      >
        <div className="mb-12 sm:mb-16 lg:mb-20 max-w-[720px]">
          <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-accent mb-3 sm:mb-4">
            How it works
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold m-0">
            Three steps.
            <br />
            Zero friction.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {[
            { n: "01", t: "Tell us what you need", d: "Pick a product — loan, deposit, business funding, investment. Set your terms. Takes 90 seconds.", c: "text-accent" },
            { n: "02", t: "Banks bid on your request", d: "Banks see your anonymized request and compete with their best offer. Your identity stays private.", c: "text-mint" },
            { n: "03", t: "Pick the winner", d: "Compare offers side by side. Accept with one tap. We handle the handover.", c: "text-peach" },
          ].map((s) => (
            <div key={s.n} className="py-8 sm:py-10 border-t border-cream/15">
              <div className={["font-display text-base font-bold tracking-[0.08em] mb-6 sm:mb-8", s.c].join(" ")}>
                {s.n}
              </div>
              <h3 className="font-display text-2xl sm:text-3xl lg:text-[32px] font-bold m-0 mb-3 sm:mb-4">
                {s.t}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed opacity-70 m-0">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Products ---------- */

function Products() {
  return (
    <section id="products" className="py-20 sm:py-28 lg:py-32 px-5 sm:px-8 max-w-[1280px] mx-auto">
      <div className="mb-10 sm:mb-14 max-w-[720px]">
        <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-ficium mb-3 sm:mb-4">
          Products
        </div>
        <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold m-0">
          Four products. One marketplace.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
        <ProductCard
          icon={<HandCoins size={28} />}
          bg="bg-ficium"
          fg="text-white"
          tag="Personal"
          title="Loans that compete for you"
          desc="Personal loans, car loans, home loans. Banks across Mauritius bid against each other for your business."
          metric="Best rate seen"
          metricValue="8.2% APR"
        />
        <ProductCard
          icon={<Building2 size={28} />}
          bg="bg-ink"
          fg="text-cream"
          tag="Business"
          title="SME funding, on demand"
          desc="Working capital, equipment finance, growth credit. Banks compete to fund your business."
          metric="Best rate seen"
          metricValue="7.9% APR"
        />
        <ProductCard
          icon={<PiggyBank size={28} />}
          bg="bg-accent"
          fg="text-ink"
          tag="Deposits"
          title="Deposits with real yield"
          desc="Lock in fixed-term deposits. Banks bid against each other to hold your money."
          metric="Top yield this week"
          metricValue="5.4% p.a."
        />
        <ProductCard
          icon={<LineChart size={28} />}
          bg="bg-mint"
          fg="text-ink"
          tag="Wealth"
          title="Investments that find you"
          desc="Bank wealth desks pitch their best portfolios for your profile. Compare returns, fees, terms."
          metric="Avg. fee saving"
          metricValue="0.4%"
        />
      </div>
    </section>
  );
}

function ProductCard({
  icon, bg, fg, tag, title, desc, metric, metricValue,
}: {
  icon: React.ReactNode;
  bg: string;
  fg: string;
  tag: string;
  title: string;
  desc: string;
  metric: string;
  metricValue: string;
}) {
  return (
    <div className={[bg, fg, "p-7 sm:p-9 rounded-[28px] min-h-[300px] sm:min-h-[320px] flex flex-col justify-between relative overflow-hidden transition-transform duration-400 hover:-translate-y-1.5"].join(" ")}>
      <div>
        <div className="flex justify-between items-start mb-7 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/[0.18] grid place-items-center">
            {icon}
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-pill text-[11px] font-bold uppercase tracking-[0.06em]">
            {tag}
          </div>
        </div>
        <h3 className="font-display text-2xl sm:text-[28px] font-bold m-0 mb-3 leading-[1.1]">
          {title}
        </h3>
        <p className="text-[15px] leading-snug opacity-85 m-0">{desc}</p>
      </div>
      <div className="flex justify-between items-end mt-7 pt-5 border-t border-white/20">
        <div>
          <div className="text-xs opacity-70 mb-1">{metric}</div>
          <div className="font-display text-2xl sm:text-[28px] font-bold">{metricValue}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Trust ---------- */

function Trust() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <section className="py-12 sm:py-16 lg:py-20 pb-20 sm:pb-28 lg:pb-32 px-5 sm:px-8 max-w-[1280px] mx-auto">
      <div
        ref={ref}
        className={[
          "grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-20 items-center transition-all duration-700",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7",
        ].join(" ")}
      >
        <div>
          <div className="aspect-square bg-ficium rounded-[32px] p-8 sm:p-10 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-ficium-bright opacity-50 pointer-events-none" />
            <Shield size={56} className="sm:hidden relative" />
            <Shield size={64} className="hidden sm:block relative" />
            <div className="font-display text-4xl sm:text-5xl font-bold mt-10 relative">
              Privacy
              <br />
              by design
            </div>
            <div className="relative mt-5 opacity-85 text-sm sm:text-[15px]">
              Bank-grade encryption. Your identity stays anonymous to banks until you accept an offer.
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-ficium mb-3 sm:mb-4">
            Trust & safety
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold m-0 mb-7 sm:mb-8">
            Your data, your terms.
          </h2>
          <div className="flex flex-col gap-5">
            {[
              { i: Lock,   t: "Anonymized by default",   d: "Banks see your need, not your name. They bid blind." },
              { i: Shield, t: "Built privacy-first",     d: "Compliance with FSC Mauritius guidelines underway. India next." },
              { i: Globe,  t: "No selling, no sharing",  d: "We make money when you accept an offer — never from your data." },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 py-5 border-b border-ink/[0.08]">
                <div className="w-11 h-11 rounded-xl bg-ficium/10 grid place-items-center flex-shrink-0 text-ficium">
                  <f.i size={20} />
                </div>
                <div>
                  <div className="text-[17px] font-semibold mb-1">{f.t}</div>
                  <div className="text-[15px] text-muted leading-snug">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */

function CTA() {
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-8 pb-20 sm:pb-28 lg:pb-32">
      <div className="max-w-[1280px] mx-auto bg-ficium rounded-[28px] sm:rounded-[40px] px-7 sm:px-12 lg:px-16 py-16 sm:py-24 lg:py-28 relative overflow-hidden text-white">
        <div className="absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-accent opacity-25 blur-[60px] pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-mint opacity-20 blur-[40px] pointer-events-none" />
        <div className="relative max-w-[720px]">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[72px] xl:text-[88px] font-bold m-0 mb-5 sm:mb-6 leading-[0.95]">
            Banks compete. You choose.
          </h2>
          <p className="text-base sm:text-lg lg:text-xl opacity-85 mb-8 sm:mb-10 max-w-[540px] leading-snug">
            Post your first request in under a minute. See real offers from banks across Mauritius.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-ficium px-7 py-4 sm:py-5 rounded-pill text-base sm:text-[17px] font-bold no-underline"
            >
              Start free <ArrowRight size={18} />
            </Link>
            <a
              href="mailto:kishan.jeebun@ficium.net"
              className="inline-flex items-center justify-center bg-transparent text-white px-6 py-4 sm:py-5 rounded-pill text-base sm:text-[17px] font-semibold border-[1.5px] border-white/30 no-underline"
            >
              Contact us
            </a>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-7 mt-8 sm:mt-10 text-sm opacity-85">
            <div className="flex items-center gap-1.5">
              <Check size={16} /> Free for clients
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={16} /> Anonymized requests
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="bg-ink text-cream px-5 sm:px-8 pt-16 sm:pt-20 pb-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-12 sm:pb-16 border-b border-cream/10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <FLogo size={28} colorClass="text-cream" />
              <span className="font-display text-xl sm:text-2xl font-bold">Ficium</span>
            </div>
            <div className="text-sm opacity-60 leading-relaxed max-w-[280px]">
              More value, less friction. Banking flipped on its head.
            </div>
          </div>
          {[
            { h: "Products", l: ["Personal loans", "Business funding", "Fixed deposits", "Investments"] },
            { h: "Company",  l: ["About", "Contact"] },
            { h: "Legal",    l: ["Terms", "Privacy"] },
          ].map((c) => (
            <div key={c.h}>
              <div className="text-[13px] font-bold tracking-[0.08em] uppercase mb-4 opacity-50">
                {c.h}
              </div>
              <div className="flex flex-col gap-2.5">
                {c.l.map((item) => (
                  <a key={item} href="#" className="text-cream no-underline text-sm opacity-80 hover:opacity-100 transition-opacity">
                    {item}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-7 text-[13px] opacity-50">
          <div>© {new Date().getFullYear()} Ficium · Mauritius</div>
          <div>EN</div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Logo ---------- */

function FLogo({ size = 32, className = "", colorClass = "text-white" }: { size?: number; className?: string; colorClass?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[className, colorClass].join(" ")}
    >
      <path
        d="M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58 L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z"
        fill="currentColor"
      />
    </svg>
  );
}