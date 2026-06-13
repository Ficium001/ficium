import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Shield, TrendingDown, Building2, Bell,
  Lock, Globe, LineChart, HandCoins, PiggyBank, Check,
  Briefcase, CreditCard, BarChart2, Banknote, Send, Gavel,
} from "lucide-react";
import { useInView, useElementProgress } from "@/features/marketing/hooks";
import { SCENES } from "@/features/marketing/config/scenes";
import type { Scene } from "@/features/marketing/config/scenes";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";

// ─────────────────────────────────────────────────────────────────────────────
// Ficium marketing landing — 2026 skin.
// Palette: paper / ink + the Ficium blue→purple gradient as the signature.
// Motion: a single scroll spine — top progress, hero parallax, section reveals,
// and one pinned "scrollytelling" moment where a request travels submit →
// compete → accept. Everything degrades to static under reduced motion.
// ─────────────────────────────────────────────────────────────────────────────

const GRADIENT = "linear-gradient(135deg, #3536DC 0%, #356EF4 50%, #8231EC 100%)";

// ── FLogo ─────────────────────────────────────────────────────────────────────

export function FLogo({ size = 32, className = "", colorClass = "" }: {
  size?: number; className?: string; colorClass?: string;
}) {
  const mono = colorClass.includes("white") || colorClass.includes("paper") || colorClass.includes("cream");
  return <FiciumLogo heightPx={size} mono={mono} className={[className, mono ? colorClass : ""].join(" ")} />;
}

// ── Reveal: fade + rise children when they scroll into view ─────────────────────

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.18);
  return (
    <div
      ref={ref}
      className={["transition-all duration-700 ease-swift motion-reduce:transition-none", className].join(" ")}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(26px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Nav (with scroll-progress spine) ────────────────────────────────────────────

export function Nav({ scrollY, progress }: { scrollY: number; progress: number }) {
  const scrolled = scrollY > 40;
  return (
    <nav className={["fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "bg-paper/85 backdrop-blur-xl border-b border-line" : "bg-transparent border-b border-transparent",
    ].join(" ")}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-4 sm:py-[18px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-ink">
          <FLogo size={28} className="sm:hidden" colorClass="text-ficium" />
          <FLogo size={32} className="hidden sm:block" colorClass="text-ficium" />
          <span className="font-display text-xl sm:text-2xl font-bold tracking-display">Ficium</span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-9">
          <div className="hidden lg:flex gap-7 text-[15px] font-medium">
            {[{ l: "Loans", h: "#products" },{ l: "Deposits", h: "#products" },{ l: "Business", h: "#products" },{ l: "How it works", h: "#how-it-works" }].map((it) => (
              <a key={it.l} href={it.h} className="text-ink/70 hover:text-ink no-underline transition-colors">{it.l}</a>
            ))}
          </div>
          <div className="flex gap-2 sm:gap-3 items-center">
            <Link to="/login" className="inline-flex items-center bg-transparent px-3 sm:px-4 py-2 text-sm font-semibold text-ink no-underline">Sign in</Link>
            <Link to="/register" className="inline-flex items-center text-white px-4 sm:px-5 py-2.5 rounded-pill text-sm font-semibold no-underline shadow-ficium" style={{ background: GRADIENT }}>Get started</Link>
          </div>
        </div>
      </div>
      {/* scroll-progress spine */}
      <div className="h-[2px] w-full bg-transparent">
        <div className="h-full origin-left transition-transform duration-150 ease-out"
          style={{ background: GRADIENT, transform: `scaleX(${progress})`, width: "100%" }} />
      </div>
    </nav>
  );
}

// ── Phone ─────────────────────────────────────────────────────────────────────

export function Phone({ scene, sceneIndex, activeOffer }: { scene: Scene; sceneIndex: number; activeOffer: number }) {
  return (
    <div className="w-[280px] sm:w-[320px] lg:w-[340px] aspect-[340/680] bg-ink rounded-[40px] sm:rounded-[48px] p-3 relative shadow-phone">
      <div className="w-full h-full rounded-[32px] sm:rounded-[38px] p-[44px_22px_22px] overflow-hidden relative" style={{ background: GRADIENT }}>
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-ink rounded-pill" />
        <div className="flex justify-between items-center mt-2 mb-5">
          <div className="text-white text-[13px] opacity-70">Your request</div>
          <div className="bg-white/15 px-2.5 py-1 rounded-pill text-white text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse-ring-green" /> LIVE
          </div>
        </div>
        <div className="text-white mb-6">
          <div className="text-[13px] opacity-70 mb-1">{scene.product}</div>
          <div className="font-display text-[34px] sm:text-[38px] font-bold tracking-display">{scene.amount}</div>
          <div className="text-[13px] opacity-70 mt-1">{scene.term}</div>
        </div>
        <div className="text-white text-[13px] opacity-85 mb-3 flex justify-between">
          <span>{scene.bidsLabel}</span>
          <span className="flex items-center gap-1.5">
            <span className="relative w-2 h-2">
              <span className="ticker-dot absolute inset-0 rounded-full bg-good" />
              <span className="absolute inset-0 rounded-full bg-good" />
            </span>
            updating
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {scene.offers.map((o, i) => {
            const isActive = i === activeOffer;
            return (
              <div key={`${sceneIndex}-${i}`} className={["rounded-2xl px-4 py-3.5 transition-all duration-500", isActive ? "bg-white scale-[1.02] shadow-lg" : "bg-white/[0.08] border border-white/10 scale-100"].join(" ")}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className={["text-sm font-semibold mb-0.5", isActive ? "text-ink" : "text-white"].join(" ")}>{o.bank}</div>
                    <div className={["text-[11px]", isActive ? "text-muted" : "text-white/60"].join(" ")}>{o.product}</div>
                  </div>
                  <div className="text-right">
                    <div className={["font-display text-[22px] font-bold tracking-display", isActive ? "text-ficium" : "text-white"].join(" ")}>{o.rate}</div>
                    <div className={["text-[10px]", isActive ? "text-muted" : "text-white/50"].join(" ")}>{scene.label === "Investments" ? "12mo" : "APR"}</div>
                  </div>
                </div>
                {isActive && (
                  <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-0.5 rounded-pill text-[10px] font-bold text-ink bg-line">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.color }} /> {o.badge}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className="w-full mt-3.5 bg-white text-ficium py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 border-none cursor-pointer">
          Accept best offer <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Hero (parallax) ─────────────────────────────────────────────────────────────

export function Hero({ scene, sceneIndex, activeOffer, scrollY, reducedMotion }: {
  scene: Scene; sceneIndex: number; activeOffer: number; scrollY: number; reducedMotion: boolean;
}) {
  const p = reducedMotion ? 0 : scrollY;
  return (
    <section className="relative pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-24 lg:pb-28 min-h-[calc(100vh-80px)] overflow-hidden">
      <div className="absolute top-40 -right-20 sm:-right-24 w-60 sm:w-80 lg:w-[460px] h-60 sm:h-80 lg:h-[460px] rounded-full opacity-[0.18] blur-[60px] pointer-events-none"
        style={{ background: GRADIENT, transform: `translateY(${p * 0.18}px)` }} />
      <div className="absolute top-[520px] -left-12 sm:-left-20 w-40 sm:w-56 lg:w-72 h-40 sm:h-56 lg:h-72 rounded-full bg-ficium opacity-[0.10] blur-[50px] pointer-events-none"
        style={{ transform: `translateY(${-p * 0.12}px)` }} />
      <div className="relative z-[2] max-w-[1280px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-ficium/10 text-ficium px-3.5 py-2 rounded-pill text-xs sm:text-[13px] font-semibold mb-6 sm:mb-7">
            <Sparkles size={14} /> The reverse-banking marketplace
          </div>
          <h1 className="font-display font-bold text-ink m-0 text-[44px] leading-[0.95] sm:text-6xl md:text-7xl lg:text-[88px] xl:text-[96px] tracking-display">
            Credit, savings,<br />
            <span style={{ background: GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>investment</span> &amp;<br />
            <span className="relative inline-block">
              business
              <svg className="absolute left-0 -bottom-2 w-full" viewBox="0 0 400 14" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ul" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3536DC" /><stop offset="50%" stopColor="#356EF4" /><stop offset="100%" stopColor="#8231EC" />
                  </linearGradient>
                </defs>
                <path d="M2 8 Q 100 2, 200 7 T 398 6" stroke="url(#ul)" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span><br />
            financing — let<br />the market<br />compete for you.
          </h1>
          <p className="text-base sm:text-lg lg:text-[19px] leading-snug text-muted mt-6 sm:mt-8 max-w-[480px]">
            Submit your financial requirement anonymously. Banks, fintechs, and other qualified financial providers compete with tailored offers. Compare options, stay in control, and connect only when you're ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 sm:mt-10">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 text-white px-6 sm:px-7 py-4 rounded-pill text-base font-semibold no-underline shadow-ficium" style={{ background: GRADIENT }}>
              Get my offers <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center bg-transparent text-ink px-6 py-4 rounded-pill text-base font-semibold border-[1.5px] border-ink/15 no-underline hover:border-ink/30 transition-colors">
              See how it works
            </a>
          </div>
          <div className="flex gap-2 mt-8 sm:mt-10 items-center">
            {SCENES.map((s, i) => (
              <div key={s.label} className="h-2 rounded-pill transition-[width,background] duration-400"
                style={{ width: i === sceneIndex ? 28 : 8, background: i === sceneIndex ? "#2A1FE6" : "rgba(11,11,30,0.15)" }} />
            ))}
            <div className="ml-3 text-xs sm:text-[13px] text-muted">{scene.label}</div>
          </div>
        </div>
        <div className="relative flex justify-center mt-6 lg:mt-0 motion-reduce:!translate-y-0"
          style={{ transform: `translateY(${-p * 0.06}px)` }}>
          <div className="animate-[float_6s_ease-in-out_infinite] motion-reduce:animate-none">
            <Phone scene={scene} sceneIndex={sceneIndex} activeOffer={activeOffer} />
          </div>
          <div className="absolute -top-2 -left-4 sm:-left-10 bg-white px-3 py-2.5 rounded-xl shadow-card flex items-center gap-2 animate-[slideIn_1s_0.4s_both]">
            <div className="w-8 h-8 rounded-full bg-good/15 text-good grid place-items-center"><TrendingDown size={16} /></div>
            <div><div className="text-[11px] text-muted">Rate dropped</div><div className="text-[13px] font-bold text-good">−0.4%</div></div>
          </div>
          <div className="absolute bottom-20 -right-4 sm:-right-12 bg-white px-3 py-2.5 rounded-xl shadow-card flex items-center gap-2 animate-[slideIn_1s_0.8s_both]">
            <div className="w-8 h-8 rounded-full bg-ficium/10 text-ficium grid place-items-center"><Bell size={16} /></div>
            <div><div className="text-[11px] text-muted">New bid</div><div className="text-[13px] font-bold">{scene.offers[activeOffer]?.bank}</div></div>
          </div>
        </div>
      </div>
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

// ── HowItWorks: pinned scroll story (lg) + static fallback ──────────────────────

const STEPS = [
  { n: "01", icon: Send,     t: "Tell us what you need",     d: "Pick a product — loan, deposit, business funding, investment. Set your terms. Takes 90 seconds." },
  { n: "02", icon: Gavel,    t: "Banks bid on your request", d: "Banks see your anonymized request and compete with their best offer. Your identity stays private." },
  { n: "03", icon: Check,    t: "Pick the winner",           d: "Compare offers side by side. Accept with one tap. We handle the handover." },
];

export function HowItWorksSection({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section id="how-it-works" className="bg-ink text-paper relative overflow-hidden">
      {/* Static version — mobile + reduced motion */}
      <div className={["px-5 sm:px-8 py-20 sm:py-28", reducedMotion ? "block" : "lg:hidden"].join(" ")}>
        <StoryIntro />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-[1280px] mx-auto mt-12">
          {STEPS.map((s) => (
            <div key={s.n} className="py-8 border-t border-paper/15">
              <div className="w-11 h-11 rounded-xl bg-paper/10 grid place-items-center mb-6"><s.icon size={20} /></div>
              <div className="font-display text-sm font-bold tracking-[0.08em] text-ficium-bright mb-3">{s.n}</div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold m-0 mb-3 tracking-display">{s.t}</h3>
              <p className="text-sm sm:text-base leading-relaxed opacity-70 m-0">{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pinned scrollytelling — lg only, motion on */}
      {!reducedMotion && <PinnedStory />}
    </section>
  );
}

function StoryIntro() {
  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-ficium-bright mb-3 sm:mb-4">How it works</div>
      <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold m-0 tracking-display">Three steps.<br />Zero friction.</h2>
    </div>
  );
}

function PinnedStory() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useElementProgress(trackRef);
  // Three beats across the scroll; ~0.5 of each beat is the transition.
  const beat = Math.min(2, Math.floor(progress * 3));
  const local = progress * 3 - beat; // 0..1 within the current beat

  return (
    <div ref={trackRef} className="hidden lg:block relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-25 blur-[90px] pointer-events-none" style={{ background: GRADIENT }} />
        <div className="relative max-w-[1280px] mx-auto px-8 w-full grid grid-cols-[1fr_1fr] gap-16 items-center">
          {/* Left: narrated steps */}
          <div>
            <StoryIntro />
            <div className="mt-12 flex flex-col gap-3">
              {STEPS.map((s, i) => {
                const active = i === beat;
                const done = i < beat;
                return (
                  <div key={s.n}
                    className="flex gap-5 p-5 rounded-card border transition-all duration-500"
                    style={{
                      borderColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                      background: active ? "rgba(255,255,255,0.05)" : "transparent",
                      opacity: active ? 1 : done ? 0.55 : 0.3,
                      transform: active ? "translateX(8px)" : "translateX(0)",
                    }}>
                    <div className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 transition-colors duration-500"
                      style={{ background: active ? GRADIENT : "rgba(255,255,255,0.08)" }}>
                      {done ? <Check size={20} /> : <s.icon size={20} />}
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold tracking-[0.08em] text-ficium-bright mb-1">{s.n}</div>
                      <h3 className="font-display text-2xl font-bold m-0 mb-1.5 tracking-display">{s.t}</h3>
                      <div className="overflow-hidden transition-all duration-500" style={{ maxHeight: active ? 80 : 0, opacity: active ? 0.7 : 0 }}>
                        <p className="text-[15px] leading-relaxed m-0">{s.d}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Right: the request, morphing through the story */}
          <div className="flex justify-center">
            <StoryCard beat={beat} local={local} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryCard({ beat, local }: { beat: number; local: number }) {
  const scene = SCENES[2]; // Fixed Deposit — clean numbers
  const bidsShown = beat === 0 ? 0 : beat === 1 ? Math.min(3, Math.ceil(local * 3 + 0.34)) : 3;
  return (
    <div className="w-[360px] rounded-[28px] p-7 text-white shadow-phone relative overflow-hidden" style={{ background: GRADIENT }}>
      <div className="flex justify-between items-center mb-5">
        <div className="text-[13px] opacity-70">Your request</div>
        <div className="bg-white/15 px-2.5 py-1 rounded-pill text-[11px] font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-good" /> {beat === 0 ? "DRAFT" : beat === 2 ? "MATCHED" : "LIVE"}
        </div>
      </div>
      <div className="mb-6">
        <div className="text-[13px] opacity-70 mb-1">{scene.product}</div>
        <div className="font-display text-[40px] font-bold tracking-display leading-none">{scene.amount}</div>
        <div className="text-[13px] opacity-70 mt-1.5">{scene.term}</div>
      </div>

      <div className="text-[13px] opacity-85 mb-3 h-5 flex items-center gap-2">
        {beat === 0
          ? <span className="inline-flex items-center gap-2"><Send size={13} /> Posting anonymously…</span>
          : beat === 2
            ? <span className="inline-flex items-center gap-2 text-good font-semibold"><Check size={14} /> Best offer accepted</span>
            : <span className="inline-flex items-center gap-2">{bidsShown} of 3 banks bidding<span className="ticker-dot inline-block w-1.5 h-1.5 rounded-full bg-good" /></span>}
      </div>

      <div className="flex flex-col gap-2.5 min-h-[210px]">
        {scene.offers.map((o, i) => {
          const visible = i < bidsShown;
          const isWinner = beat === 2 && i === 0;
          const dimmed = beat === 2 && i !== 0;
          return (
            <div key={i}
              className="rounded-2xl px-4 py-3.5 transition-all duration-500"
              style={{
                background: isWinner ? "#FFFFFF" : "rgba(255,255,255,0.08)",
                border: isWinner ? "none" : "1px solid rgba(255,255,255,0.10)",
                opacity: visible ? (dimmed ? 0.4 : 1) : 0,
                transform: visible ? `scale(${isWinner ? 1.03 : 1})` : "translateY(10px) scale(0.98)",
              }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className={["text-sm font-semibold mb-0.5", isWinner ? "text-ink" : "text-white"].join(" ")}>{o.bank}</div>
                  <div className={["text-[11px]", isWinner ? "text-muted" : "text-white/60"].join(" ")}>{o.product}</div>
                </div>
                <div className="text-right">
                  <div className={["font-display text-[22px] font-bold tracking-display", isWinner ? "text-ficium" : "text-white"].join(" ")}>{o.rate}</div>
                  <div className={["text-[10px]", isWinner ? "text-muted" : "text-white/50"].join(" ")}>p.a.</div>
                </div>
              </div>
              {isWinner && (
                <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-0.5 rounded-pill text-[10px] font-bold text-white bg-good">
                  <Check size={11} /> Accepted
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Products ──────────────────────────────────────────────────────────────────

type Tone = "gradient" | "ink" | "light" | "tint";

export function Products() {
  return (
    <section id="products" className="py-20 sm:py-28 lg:py-32 px-5 sm:px-8 max-w-[1280px] mx-auto">
      <Reveal className="mb-10 sm:mb-14 max-w-[720px]">
        <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-ficium mb-3 sm:mb-4">Products</div>
        <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold m-0 tracking-display">Four products. One marketplace.</h2>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
        {[
          { icon: <HandCoins size={28} />, tone: "gradient" as Tone, tag: "Personal", title: "Loans that compete for you", desc: "Personal loans, car loans, home loans. Banks across Mauritius bid against each other for your business.", metric: "Best rate seen", metricValue: "8.2% APR" },
          { icon: <Building2 size={28} />, tone: "ink" as Tone, tag: "Business", title: "SME funding, on demand", desc: "Working capital, equipment finance, growth credit. Banks compete to fund your business.", metric: "Best rate seen", metricValue: "7.9% APR" },
          { icon: <PiggyBank size={28} />, tone: "light" as Tone, tag: "Deposits", title: "Deposits with real yield", desc: "Lock in fixed-term deposits. Banks bid against each other to hold your money.", metric: "Top yield this week", metricValue: "5.4% p.a." },
          { icon: <LineChart size={28} />, tone: "tint" as Tone, tag: "Wealth", title: "Investments that find you", desc: "Bank wealth desks pitch their best portfolios for your profile. Compare returns, fees, terms.", metric: "Avg. fee saving", metricValue: "0.4%" },
        ].map((c, i) => (
          <Reveal key={c.tag} delay={i * 90}>
            <ProductCard {...c} />
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-5 lg:mt-6" delay={120}>
        <p className="text-[12px] font-semibold text-muted uppercase tracking-widest mb-4">Also available</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SecondaryProductCard icon={<Briefcase size={18} />}  label="Leasing"        desc="Asset & equipment lease"   productType="leasing"       />
          <SecondaryProductCard icon={<CreditCard size={18} />} label="Overdrafts"     desc="Flexible credit lines"     productType="overdraft"     />
          <SecondaryProductCard icon={<BarChart2 size={18} />}  label="SME Loans"      desc="Dedicated SME financing"   productType="sme_loan"      />
          <SecondaryProductCard icon={<Banknote size={18} />}   label="Business Loans" desc="Corporate & growth credit" productType="business_loan" />
        </div>
      </Reveal>
    </section>
  );
}

function ProductCard({ icon, tone, tag, title, desc, metric, metricValue }: {
  icon: React.ReactNode; tone: Tone; tag: string;
  title: string; desc: string; metric: string; metricValue: string;
}) {
  const styles = {
    gradient: { className: "text-white", style: { background: GRADIENT }, chip: "bg-white/20", border: "border-white/20", iconBg: "bg-white/[0.18]" },
    ink:      { className: "bg-ink text-paper", style: {}, chip: "bg-white/15", border: "border-white/15", iconBg: "bg-white/[0.10]" },
    light:    { className: "bg-white text-ink border border-line", style: {}, chip: "bg-ficium/10 text-ficium", border: "border-line", iconBg: "bg-ficium/10 text-ficium" },
    tint:     { className: "text-ink", style: { background: "#F1F0FF" }, chip: "bg-ficium/10 text-ficium", border: "border-ink/10", iconBg: "bg-ficium/10 text-ficium" },
  }[tone];
  return (
    <div className={[styles.className, "p-7 sm:p-9 rounded-hero min-h-[300px] sm:min-h-[320px] flex flex-col justify-between relative overflow-hidden transition-all duration-400 hover:-translate-y-1.5 hover:shadow-lift"].join(" ")} style={styles.style}>
      <div>
        <div className="flex justify-between items-start mb-7 sm:mb-8">
          <div className={["w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center", styles.iconBg].join(" ")}>{icon}</div>
          <div className={["px-3 py-1 rounded-pill text-[11px] font-bold uppercase tracking-[0.06em]", styles.chip].join(" ")}>{tag}</div>
        </div>
        <h3 className="font-display text-2xl sm:text-[28px] font-bold m-0 mb-3 leading-[1.1] tracking-display">{title}</h3>
        <p className="text-[15px] leading-snug opacity-80 m-0">{desc}</p>
      </div>
      <div className={["flex justify-between items-end mt-7 pt-5 border-t", styles.border].join(" ")}>
        <div>
          <div className="text-xs opacity-70 mb-1">{metric}</div>
          <div className="font-display text-2xl sm:text-[28px] font-bold tracking-display">{metricValue}</div>
        </div>
      </div>
    </div>
  );
}

function SecondaryProductCard({ icon, label, desc, productType }: { icon: React.ReactNode; label: string; desc: string; productType: string }) {
  return (
    <Link to={`/register?product=${productType}`} className="group flex items-start gap-3 bg-white border border-line hover:border-ficium/30 hover:shadow-card rounded-2xl px-4 py-3.5 transition-all">
      <div className="w-8 h-8 rounded-xl bg-ficium/[0.08] text-ficium flex items-center justify-center flex-shrink-0 group-hover:bg-ficium group-hover:text-white transition-colors">{icon}</div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-ink leading-tight">{label}</div>
        <div className="text-[11px] text-muted mt-0.5 leading-tight">{desc}</div>
      </div>
    </Link>
  );
}

// ── Trust ─────────────────────────────────────────────────────────────────────

export function Trust() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 pb-20 sm:pb-28 lg:pb-32 px-5 sm:px-8 max-w-[1280px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-20 items-center">
        <Reveal>
          <div className="aspect-square rounded-hero p-8 sm:p-10 text-white relative overflow-hidden" style={{ background: GRADIENT }}>
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-[0.12] pointer-events-none" />
            <Shield size={56} className="sm:hidden relative" />
            <Shield size={64} className="hidden sm:block relative" />
            <div className="font-display text-4xl sm:text-5xl font-bold mt-10 relative tracking-display">Privacy<br />by design</div>
            <div className="relative mt-5 opacity-85 text-sm sm:text-[15px]">Bank-grade encryption. Your identity stays anonymous to banks until you accept an offer.</div>
          </div>
        </Reveal>
        <div>
          <Reveal>
            <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-ficium mb-3 sm:mb-4">Trust &amp; safety</div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold m-0 mb-7 sm:mb-8 tracking-display">Your data, your terms.</h2>
          </Reveal>
          <div className="flex flex-col gap-5">
            {[
              { i: Lock,   t: "Anonymized by default",  d: "Banks see your need, not your name. They bid blind." },
              { i: Shield, t: "Built privacy-first",    d: "Compliance with FSC Mauritius guidelines underway. India next." },
              { i: Globe,  t: "No selling, no sharing", d: "We make money when you accept an offer — never from your data." },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="flex gap-4 py-5 border-b border-line">
                  <div className="w-11 h-11 rounded-xl bg-ficium/10 grid place-items-center flex-shrink-0 text-ficium"><f.i size={20} /></div>
                  <div>
                    <div className="text-[17px] font-semibold mb-1">{f.t}</div>
                    <div className="text-[15px] text-muted leading-snug">{f.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

export function CTA() {
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-8 pb-20 sm:pb-28 lg:pb-32">
      <Reveal className="max-w-[1280px] mx-auto">
        <div className="rounded-hero px-7 sm:px-12 lg:px-16 py-16 sm:py-24 lg:py-28 relative overflow-hidden text-white" style={{ background: GRADIENT }}>
          <div className="absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-white opacity-[0.10] blur-[60px] pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-ink opacity-15 blur-[50px] pointer-events-none" />
          <div className="relative max-w-[720px]">
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[72px] xl:text-[88px] font-bold m-0 mb-5 sm:mb-6 leading-[0.95] tracking-display">Banks compete. You choose.</h2>
            <p className="text-base sm:text-lg lg:text-xl opacity-85 mb-8 sm:mb-10 max-w-[540px] leading-snug">Post your first request in under a minute. See real offers from banks across Mauritius.</p>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-white text-ficium px-7 py-4 sm:py-5 rounded-pill text-base sm:text-[17px] font-bold no-underline hover:bg-paper transition-colors">Start free <ArrowRight size={18} /></Link>
              <a href="mailto:kishan.jeebun@ficium.net" className="inline-flex items-center justify-center bg-transparent text-white px-6 py-4 sm:py-5 rounded-pill text-base sm:text-[17px] font-semibold border-[1.5px] border-white/30 no-underline hover:border-white/60 transition-colors">Contact us</a>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-7 mt-8 sm:mt-10 text-sm opacity-85">
              <div className="flex items-center gap-1.5"><Check size={16} /> Free for clients</div>
              <div className="flex items-center gap-1.5"><Check size={16} /> Anonymized requests</div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="bg-ink text-paper px-5 sm:px-8 pt-16 sm:pt-20 pb-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-12 sm:pb-16 border-b border-paper/10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <FLogo size={28} colorClass="text-paper" />
              <span className="font-display text-xl sm:text-2xl font-bold tracking-display">Ficium</span>
            </div>
            <div className="text-sm opacity-60 leading-relaxed max-w-[280px]">More value, less friction. Banking flipped on its head.</div>
          </div>
          {[
            { h: "Products", l: ["Personal loans", "Business funding", "Fixed deposits", "Investments"] },
            { h: "Company",  l: ["About", "Contact"] },
            { h: "Legal",    l: ["Terms", "Privacy"] },
          ].map((c) => (
            <div key={c.h}>
              <div className="text-[13px] font-bold tracking-[0.08em] uppercase mb-4 opacity-50">{c.h}</div>
              <div className="flex flex-col gap-2.5">
                {c.l.map((item) => <a key={item} href="#" className="text-paper no-underline text-sm opacity-80 hover:opacity-100 transition-opacity">{item}</a>)}
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
