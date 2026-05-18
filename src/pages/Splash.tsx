import { useState, useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";
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
      { bank: "MCB Bank",     product: "Personal Loan · MUR 500K",  rate: "8.2%", badge: "Best rate",         color: "#FFD84D" },
      { bank: "SBM Bank",     product: "Personal Loan · MUR 500K",  rate: "9.1%", badge: "Fastest decision",  color: "#7DF9C5" },
      { bank: "AfrAsia Bank", product: "Personal Loan · MUR 500K",  rate: "9.4%", badge: "No fees",           color: "#FF9F7A" },
    ],
  },
  {
    label: "Business Funding",
    product: "SME Working Capital",
    amount: "MUR 2,500,000",
    term: "60 months · Port Louis SME",
    bidsLabel: "8 banks bidding",
    offers: [
      { bank: "AfrAsia Bank", product: "SME Loan · MUR 2.5M",  rate: "7.9%", badge: "Best rate",       color: "#FFD84D" },
      { bank: "MCB Bank",     product: "SME Loan · MUR 2.5M",  rate: "8.3%", badge: "Relationship",    color: "#7DF9C5" },
      { bank: "MauBank",      product: "SME Loan · MUR 2.5M",  rate: "8.7%", badge: "Fast approval",   color: "#FF9F7A" },
    ],
  },
  {
    label: "Fixed Deposit",
    product: "Fixed Deposit",
    amount: "MUR 1,000,000",
    term: "24 months · p.a.",
    bidsLabel: "9 banks bidding",
    offers: [
      { bank: "ABC Banking",  product: "FD · MUR 1M · 24mo",   rate: "5.4%", badge: "Best yield",   color: "#FFD84D" },
      { bank: "SBM Bank",     product: "FD · MUR 1M · 24mo",   rate: "5.1%", badge: "Tier 1",       color: "#7DF9C5" },
      { bank: "MauBank",      product: "FD · MUR 1M · 24mo",   rate: "4.9%", badge: "Bonus tier",   color: "#FF9F7A" },
    ],
  },
  {
    label: "Investments",
    product: "Investment Account",
    amount: "MUR 750,000",
    term: "Managed · 12mo target",
    bidsLabel: "6 banks bidding",
    offers: [
      { bank: "MCB Capital",      product: "Balanced · MUR 750K",  rate: "+7.4%", badge: "Top return",  color: "#FFD84D" },
      { bank: "AfrAsia Wealth",   product: "Growth · MUR 750K",    rate: "+8.1%", badge: "Higher risk", color: "#7DF9C5" },
      { bank: "SBM Asset Mgmt",   product: "Income · MUR 750K",    rate: "+5.6%", badge: "Lowest fee",  color: "#FF9F7A" },
    ],
  },
];

/* ---------- Brand tokens (used as CSS custom props) ---------- */

const tokens: CSSProperties = {
  ["--ficium" as never]: "#2A1FE6",
  ["--ficium-deep" as never]: "#1A14A8",
  ["--ficium-bright" as never]: "#3D32FF",
  ["--ink" as never]: "#0A0A1A",
  ["--cream" as never]: "#FAF7F0",
  ["--accent" as never]: "#FFD84D",
  ["--mint" as never]: "#7DF9C5",
  ["--peach" as never]: "#FF9F7A",
  ["--muted" as never]: "#6B6B85",
};

/* ---------- Main page ---------- */

export default function Splash() {
  const reducedMotion = useReducedMotion();
  const scrollY = useScrollY();

  const [sceneIndex, setSceneIndex] = useState(0);
  const [activeOffer, setActiveOffer] = useState(0);

  // Cycle scenes every ~5s (unless user prefers reduced motion)
  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => {
      setSceneIndex((i) => (i + 1) % SCENES.length);
      setActiveOffer(0);
    }, 5200);
    return () => clearInterval(t);
  }, [reducedMotion]);

  // Within a scene, cycle the "winning" offer every ~1.7s
  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => {
      setActiveOffer((o) => (o + 1) % 3);
    }, 1700);
    return () => clearInterval(t);
  }, [sceneIndex, reducedMotion]);

  const scene = SCENES[sceneIndex];

  return (
    <div
      style={{
        ...tokens,
        fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "var(--ink)",
        background: "var(--cream)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; letter-spacing: -0.035em; line-height: 0.95; }
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1); }
        .reveal.in { opacity: 1; transform: translateY(0); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
        .hover-lift { transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s; }
        .hover-lift:hover { transform: translateY(-6px); }
        .ticker-dot { animation: pulse-ring 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; transform: none; transition: none; }
          .ticker-dot { animation: none; }
        }
      `}</style>

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
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? "rgba(250, 247, 240, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(10,10,26,0.06)" : "1px solid transparent",
        transition: "all 0.3s",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FLogo size={32} color="var(--ficium)" />
          <span className="display" style={{ fontSize: 26, fontWeight: 700 }}>Ficium</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", gap: 28, fontSize: 15, fontWeight: 500 }}>
            {[
              { l: "Loans", h: "#products" },
              { l: "Deposits", h: "#products" },
              { l: "Business", h: "#products" },
              { l: "How it works", h: "#how-it-works" },
            ].map((it) => (
              <a key={it.l} href={it.h} style={{ color: "var(--ink)", textDecoration: "none", opacity: 0.75 }}>{it.l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link to="/login" style={{ background: "transparent", padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
              Sign in
            </Link>
            <Link to="/register" style={{ background: "var(--ink)", color: "var(--cream)", padding: "11px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
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
    <section style={{ position: "relative", paddingTop: 140, paddingBottom: 100, minHeight: "100vh" }}>
      {/* decorative shapes */}
      <div style={{ position: "absolute", top: 200, right: -120, width: 380, height: 380, borderRadius: "50%", background: "var(--accent)", opacity: 0.55, filter: "blur(2px)" }} />
      <div style={{ position: "absolute", top: 480, left: -80, width: 240, height: 240, borderRadius: "50%", background: "var(--mint)", opacity: 0.5 }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 60, alignItems: "center", position: "relative", zIndex: 2 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(42, 31, 230, 0.08)", color: "var(--ficium)", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 28 }}>
            <Sparkles size={14} /> The reverse-banking marketplace
          </div>
          <h1 className="display" style={{ fontSize: "clamp(52px, 6.5vw, 96px)", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
            Loans, deposits,<br />
            <span style={{ color: "var(--ficium)" }}>business funding</span> —
            <br />
            <span style={{ position: "relative", display: "inline-block" }}>
              let banks
              <svg style={{ position: "absolute", left: 0, bottom: -8, width: "100%" }} viewBox="0 0 400 14" preserveAspectRatio="none">
                <path d="M2 8 Q 100 2, 200 7 T 398 6" stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            <br />come to you.
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: "var(--muted)", marginTop: 32, maxWidth: 480 }}>
            Post what you need once. Banks across Mauritius compete with their best offer. You pick. That's it.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
            <Link to="/register" style={{ background: "var(--ficium)", color: "white", padding: "18px 28px", borderRadius: 999, fontSize: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 12px 32px rgba(42, 31, 230, 0.35)", textDecoration: "none" }}>
              Get my offers <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" style={{ background: "transparent", color: "var(--ink)", padding: "18px 24px", borderRadius: 999, fontSize: 16, fontWeight: 600, border: "1.5px solid rgba(10,10,26,0.15)", textDecoration: "none" }}>
              See how it works
            </a>
          </div>

          {/* scene pagination */}
          <div style={{ display: "flex", gap: 8, marginTop: 40, alignItems: "center" }}>
            {SCENES.map((s, i) => (
              <div
                key={s.label}
                style={{
                  width: i === sceneIndex ? 28 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === sceneIndex ? "var(--ficium)" : "rgba(10,10,26,0.15)",
                  transition: "width 0.4s",
                }}
              />
            ))}
            <div style={{ marginLeft: 12, fontSize: 13, color: "var(--muted)" }}>{scene.label}</div>
          </div>
        </div>

        {/* PHONE */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", animation: "float 6s ease-in-out infinite" }}>
          <div style={{ width: 340, height: 680, background: "var(--ink)", borderRadius: 48, padding: 12, boxShadow: "0 40px 80px -20px rgba(10,10,26,0.45), 0 0 0 1px rgba(10,10,26,0.1)", position: "relative" }}>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, var(--ficium) 0%, var(--ficium-deep) 100%)", borderRadius: 38, padding: "44px 22px 22px", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 100, height: 26, background: "var(--ink)", borderRadius: 999 }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 22 }}>
                <div style={{ color: "white", fontSize: 13, opacity: 0.7 }}>Your request</div>
                <div style={{ background: "rgba(255,255,255,0.15)", padding: "5px 10px", borderRadius: 999, color: "white", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint)" }} />
                  LIVE
                </div>
              </div>

              <div style={{ color: "white", marginBottom: 24 }}>
                <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>{scene.product}</div>
                <div className="display" style={{ fontSize: 38, fontWeight: 700 }}>{scene.amount}</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{scene.term}</div>
              </div>

              <div style={{ color: "white", fontSize: 13, opacity: 0.85, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                <span>{scene.bidsLabel}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ position: "relative", width: 8, height: 8 }}>
                    <span className="ticker-dot" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--mint)" }} />
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--mint)" }} />
                  </span>
                  updating
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {scene.offers.map((o, i) => {
                  const isActive = i === activeOffer;
                  return (
                    <div
                      key={`${sceneIndex}-${i}`}
                      style={{
                        background: isActive ? "white" : "rgba(255,255,255,0.08)",
                        borderRadius: 16,
                        padding: "14px 16px",
                        transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                        transform: isActive ? "scale(1.02)" : "scale(1)",
                        border: isActive ? "none" : "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "var(--ink)" : "white", marginBottom: 3 }}>{o.bank}</div>
                          <div style={{ fontSize: 11, color: isActive ? "var(--muted)" : "rgba(255,255,255,0.6)" }}>{o.product}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="display" style={{ fontSize: 22, fontWeight: 700, color: isActive ? "var(--ficium)" : "white" }}>{o.rate}</div>
                          <div style={{ fontSize: 10, color: isActive ? "var(--muted)" : "rgba(255,255,255,0.5)" }}>{scene.label === "Investments" ? "12mo" : "APR"}</div>
                        </div>
                      </div>
                      {isActive && (
                        <div style={{ marginTop: 10, display: "inline-block", background: o.color, color: "var(--ink)", padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                          ⚡ {o.badge}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button style={{ width: "100%", marginTop: 14, background: "white", color: "var(--ficium)", padding: "14px", borderRadius: 14, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Accept best offer <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ position: "absolute", top: -10, left: -40, background: "white", padding: "10px 14px", borderRadius: 14, boxShadow: "0 12px 30px rgba(10,10,26,0.12)", display: "flex", alignItems: "center", gap: 8, animation: "slideIn 1s 0.4s both" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--mint)", display: "grid", placeItems: "center" }}><TrendingDown size={16} /></div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Rate dropped</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>−0.4%</div>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 80, right: -50, background: "white", padding: "10px 14px", borderRadius: 14, boxShadow: "0 12px 30px rgba(10,10,26,0.12)", display: "flex", alignItems: "center", gap: 8, animation: "slideIn 1s 0.8s both" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center" }}><Bell size={16} /></div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>New bid</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{scene.offers[activeOffer]?.bank}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <section id="how-it-works" style={{ background: "var(--ink)", color: "var(--cream)", padding: "120px 32px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "var(--ficium)", opacity: 0.4, filter: "blur(80px)" }} />
      <div ref={ref} style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }} className={`reveal ${inView ? "in" : ""}`}>
        <div style={{ marginBottom: 80, maxWidth: 720 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 16 }}>How it works</div>
          <h2 className="display" style={{ fontSize: 56, fontWeight: 700, margin: 0 }}>Three steps.<br />Zero friction.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { n: "01", t: "Tell us what you need", d: "Pick a product — loan, deposit, business funding, investment. Set your terms. Takes 90 seconds.", c: "var(--accent)" },
            { n: "02", t: "Banks bid on your request", d: "Banks see your anonymized request and compete with their best offer. Your identity stays private.", c: "var(--mint)" },
            { n: "03", t: "Pick the winner", d: "Compare offers side by side. Accept with one tap. We handle the handover.", c: "var(--peach)" },
          ].map((s) => (
            <div key={s.n} style={{ padding: "40px 0", borderTop: "1px solid rgba(250, 247, 240, 0.15)" }}>
              <div className="display" style={{ fontSize: 16, fontWeight: 700, color: s.c, letterSpacing: "0.08em", marginBottom: 32 }}>{s.n}</div>
              <h3 className="display" style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 16 }}>{s.t}</h3>
              <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.7, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Products grid ---------- */

function Products() {
  return (
    <section id="products" style={{ padding: "120px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 60, maxWidth: 720 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ficium)", marginBottom: 16 }}>Products</div>
        <h2 className="display" style={{ fontSize: 56, fontWeight: 700, margin: 0 }}>Four products. One marketplace.</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        <ProductCard
          icon={<HandCoins size={28} />}
          color="var(--ficium)"
          textColor="white"
          tag="Personal"
          title="Loans that compete for you"
          desc="Personal loans, car loans, home loans. Banks across Mauritius bid against each other for your business."
          metric="Best rate seen"
          metricValue="8.2% APR"
        />
        <ProductCard
          icon={<Building2 size={28} />}
          color="var(--ink)"
          textColor="var(--cream)"
          tag="Business"
          title="SME funding, on demand"
          desc="Working capital, equipment finance, growth credit. Banks compete to fund your business."
          metric="Best rate seen"
          metricValue="7.9% APR"
        />
        <ProductCard
          icon={<PiggyBank size={28} />}
          color="var(--accent)"
          textColor="var(--ink)"
          tag="Deposits"
          title="Deposits with real yield"
          desc="Lock in fixed-term deposits. Banks bid against each other to hold your money."
          metric="Top yield this week"
          metricValue="5.4% p.a."
        />
        <ProductCard
          icon={<LineChart size={28} />}
          color="var(--mint)"
          textColor="var(--ink)"
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
  icon, color, textColor, tag, title, desc, metric, metricValue,
}: { icon: React.ReactNode; color: string; textColor: string; tag: string; title: string; desc: string; metric: string; metricValue: string }) {
  return (
    <div className="hover-lift" style={{ background: color, color: textColor, padding: 36, borderRadius: 28, minHeight: 320, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center" }}>
            {icon}
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tag}</div>
        </div>
        <h3 className="display" style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 12, lineHeight: 1.1 }}>{title}</h3>
        <p style={{ fontSize: 15, lineHeight: 1.5, opacity: 0.85, margin: 0 }}>{desc}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{metric}</div>
          <div className="display" style={{ fontSize: 28, fontWeight: 700 }}>{metricValue}</div>
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
    <section style={{ padding: "60px 32px 120px", maxWidth: 1280, margin: "0 auto" }}>
      <div ref={ref} className={`reveal ${inView ? "in" : ""}`} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "center" }}>
        <div>
          <div style={{ aspectRatio: "1", background: "var(--ficium)", borderRadius: 32, padding: 40, color: "white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "var(--ficium-bright)", opacity: 0.5 }} />
            <Shield size={64} style={{ position: "relative" }} />
            <div className="display" style={{ fontSize: 48, fontWeight: 700, marginTop: 40, position: "relative" }}>
              Privacy<br />by design
            </div>
            <div style={{ position: "relative", marginTop: 20, opacity: 0.85, fontSize: 15 }}>
              Bank-grade encryption. Your identity stays anonymous to banks until you accept an offer.
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ficium)", marginBottom: 16 }}>Trust & safety</div>
          <h2 className="display" style={{ fontSize: 56, fontWeight: 700, margin: 0, marginBottom: 32 }}>Your data, your terms.</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { i: Lock,   t: "Anonymized by default",   d: "Banks see your need, not your name. They bid blind." },
              { i: Shield, t: "Built privacy-first",     d: "Compliance with FSC Mauritius guidelines underway. India next." },
              { i: Globe,  t: "No selling, no sharing",  d: "We make money when you accept an offer — never from your data." },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: "1px solid rgba(10,10,26,0.08)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(42, 31, 230, 0.08)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--ficium)" }}>
                  <f.i size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{f.t}</div>
                  <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.5 }}>{f.d}</div>
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
    <section style={{ padding: "60px 32px 120px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", background: "var(--ficium)", borderRadius: 40, padding: "100px 60px", position: "relative", overflow: "hidden", color: "white" }}>
        <div style={{ position: "absolute", bottom: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "var(--accent)", opacity: 0.25, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "var(--mint)", opacity: 0.2, filter: "blur(40px)" }} />
        <div style={{ position: "relative", maxWidth: 720 }}>
          <h2 className="display" style={{ fontSize: "clamp(48px, 6vw, 88px)", fontWeight: 700, margin: 0, marginBottom: 24 }}>
            Banks compete. You choose.
          </h2>
          <p style={{ fontSize: 20, opacity: 0.85, marginBottom: 40, maxWidth: 540, lineHeight: 1.5 }}>
            Post your first request in under a minute. See real offers from banks across Mauritius.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/register" style={{ background: "white", color: "var(--ficium)", padding: "20px 32px", borderRadius: 999, fontSize: 17, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              Start free <ArrowRight size={18} />
            </Link>
            <a href="mailto:kishan.jeebun@ficium.net" style={{ background: "transparent", color: "white", padding: "20px 28px", borderRadius: 999, fontSize: 17, fontWeight: 600, border: "1.5px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>
              Contact us
            </a>
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 40, fontSize: 14, opacity: 0.85 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> Free for clients</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> Anonymized requests</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer style={{ background: "var(--ink)", color: "var(--cream)", padding: "80px 32px 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40, paddingBottom: 60, borderBottom: "1px solid rgba(250, 247, 240, 0.1)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <FLogo size={28} color="var(--cream)" />
              <span className="display" style={{ fontSize: 24, fontWeight: 700 }}>Ficium</span>
            </div>
            <div style={{ fontSize: 14, opacity: 0.6, lineHeight: 1.6, maxWidth: 280 }}>
              More value, less friction. Banking flipped on its head.
            </div>
          </div>
          {[
            { h: "Products", l: ["Personal loans", "Business funding", "Fixed deposits", "Investments"] },
            { h: "Company",  l: ["About", "Contact"] },
            { h: "Legal",    l: ["Terms", "Privacy"] },
          ].map((c) => (
            <div key={c.h}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, opacity: 0.5 }}>{c.h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {c.l.map((item) => (
                  <a key={item} href="#" style={{ color: "var(--cream)", textDecoration: "none", fontSize: 14, opacity: 0.8 }}>{item}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 30, fontSize: 13, opacity: 0.5 }}>
          <div>© {new Date().getFullYear()} Ficium · Mauritius</div>
          <div>EN</div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Logo ---------- */

function FLogo({ size = 32, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58 L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z"
        fill={color}
      />
    </svg>
  );
}