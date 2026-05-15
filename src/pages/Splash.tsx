import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Sparkles,
  Shield,
  Bell,
  Lock,
  Globe,
  TrendingDown,
} from "lucide-react";

type Offer = {
  bank: string;
  product: string;
  rate: string;
  badge: string;
  color: string;
};

export default function Splash() {
  const [scrollY, setScrollY] = useState(0);
  const [activeOffer, setActiveOffer] = useState(0);
  const [counters, setCounters] = useState({ banks: 0, saved: 0, users: 0 });

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setActiveOffer((o) => (o + 1) % 3),
      2800
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const targets = { banks: 12, saved: 1.2, users: 84 };
    const duration = 1800;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setCounters({
        banks: Math.round(targets.banks * ease),
        saved: +(targets.saved * ease).toFixed(1),
        users: Math.round(targets.users * ease),
      });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const offers: Offer[] = [
    { bank: "MCB Bank", product: "Personal Loan · MUR 500,000", rate: "8.2%", badge: "Best rate", color: "#FFD84D" },
    { bank: "SBM Bank", product: "Personal Loan · MUR 500,000", rate: "9.1%", badge: "Fastest decision", color: "#7DF9C5" },
    { bank: "AfrAsia Bank", product: "Personal Loan · MUR 500,000", rate: "9.4%", badge: "No fees", color: "#FF9F7A" },
  ];

  return (
    <div
      style={{
        ["--ficium" as never]: "#2A1FE6",
        ["--ficium-deep" as never]: "#1A14A8",
        ["--ficium-bright" as never]: "#3D32FF",
        ["--ink" as never]: "#0A0A1A",
        ["--cream" as never]: "#FAF7F0",
        ["--accent" as never]: "#FFD84D",
        ["--mint" as never]: "#7DF9C5",
        ["--peach" as never]: "#FF9F7A",
        ["--muted" as never]: "#6B6B85",
        fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "var(--ink)",
        background: "var(--cream)",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap');
        .ficium-page * { box-sizing: border-box; }
        .display { font-family: 'Bricolage Grotesque', sans-serif; letter-spacing: -0.035em; line-height: 0.95; }
        .fade-up { animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
        .hover-lift { transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s; }
        .hover-lift:hover { transform: translateY(-6px); }
        .ticker-dot { animation: pulse-ring 1.6s ease-out infinite; }
        .nav-btn { font-family: inherit; cursor: pointer; border: none; }
      `}</style>

      {/* NAV */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: scrollY > 40 ? "rgba(250, 247, 240, 0.85)" : "transparent",
          backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
          borderBottom: scrollY > 40 ? "1px solid rgba(10,10,26,0.06)" : "1px solid transparent",
          transition: "all 0.3s",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FLogo size={32} color="var(--ficium)" />
            <span className="display" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)" }}>Ficium</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ display: "flex", gap: 28, fontSize: 15, fontWeight: 500 }}>
              {["Loans", "Deposits", "Business", "How it works"].map((l) => (
                <a key={l} href="#" style={{ color: "var(--ink)", textDecoration: "none", opacity: 0.75 }}>{l}</a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/login" className="nav-btn" style={{ background: "transparent", padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                Sign in
              </Link>
              <Link to="/register" className="nav-btn" style={{ background: "var(--ink)", color: "var(--cream)", padding: "11px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", paddingTop: 140, paddingBottom: 100, minHeight: "100vh" }}>
        <div style={{ position: "absolute", top: 200, right: -120, width: 380, height: 380, borderRadius: "50%", background: "var(--accent)", opacity: 0.55, filter: "blur(2px)" }} />
        <div style={{ position: "absolute", top: 480, left: -80, width: 240, height: 240, borderRadius: "50%", background: "var(--mint)", opacity: 0.5 }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 60, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div className="fade-up">
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
              Post what you need once. Banks compete with their best offer. You pick. That's it.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
              <Link to="/register" style={{ background: "var(--ficium)", color: "white", padding: "18px 28px", borderRadius: 999, fontSize: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 12px 32px rgba(42, 31, 230, 0.35)", textDecoration: "none" }}>
                Get my offers <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" style={{ background: "transparent", color: "var(--ink)", padding: "18px 24px", borderRadius: 999, fontSize: 16, fontWeight: 600, border: "1.5px solid rgba(10,10,26,0.15)", textDecoration: "none" }}>
                See how it works
              </a>
            </div>
            <div style={{ display: "flex", gap: 28, marginTop: 40, fontSize: 14, color: "var(--muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={16} style={{ color: "var(--ficium)" }} /> No credit check to browse</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={16} style={{ color: "var(--ficium)" }} /> Free for clients</div>
            </div>
          </div>

          {/* PHONE MOCKUP */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", animation: "float 6s ease-in-out infinite" }}>
            <div style={{ width: 340, height: 680, background: "var(--ink)", borderRadius: 48, padding: 12, boxShadow: "0 40px 80px -20px rgba(10,10,26,0.45), 0 0 0 1px rgba(10,10,26,0.1)", position: "relative" }}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, var(--ficium) 0%, var(--ficium-deep) 100%)", borderRadius: 38, padding: "44px 22px 22px", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 100, height: 26, background: "var(--ink)", borderRadius: 999 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 22 }}>
                  <div style={{ color: "white", fontSize: 13, opacity: 0.7 }}>Your request</div>
                  <div style={{ background: "rgba(255,255,255,0.15)", padding: "5px 10px", borderRadius: 999, color: "white", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint)", display: "inline-block" }} />
                    LIVE
                  </div>
                </div>

                <div style={{ color: "white", marginBottom: 24 }}>
                  <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Personal loan</div>
                  <div className="display" style={{ fontSize: 38, fontWeight: 700 }}>MUR 500,000</div>
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>36 months · Mauritius</div>
                </div>

                <div style={{ color: "white", fontSize: 13, opacity: 0.85, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{counters.banks} banks bidding</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ position: "relative", width: 8, height: 8 }}>
                      <span className="ticker-dot" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--mint)" }} />
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--mint)" }} />
                    </span>
                    updating
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {offers.map((o, i) => (
                    <div key={i} style={{ background: i === activeOffer ? "white" : "rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)", transform: i === activeOffer ? "scale(1.02)" : "scale(1)", border: i === activeOffer ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: i === activeOffer ? "var(--ink)" : "white", marginBottom: 3 }}>{o.bank}</div>
                          <div style={{ fontSize: 11, color: i === activeOffer ? "var(--muted)" : "rgba(255,255,255,0.6)" }}>{o.product}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="display" style={{ fontSize: 22, fontWeight: 700, color: i === activeOffer ? "var(--ficium)" : "white" }}>{o.rate}</div>
                          <div style={{ fontSize: 10, color: i === activeOffer ? "var(--muted)" : "rgba(255,255,255,0.5)" }}>APR</div>
                        </div>
                      </div>
                      {i === activeOffer && (
                        <div style={{ marginTop: 10, display: "inline-block", background: o.color, color: "var(--ink)", padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                          ⚡ {o.badge}
                        </div>
                      )}
                    </div>
                  ))}
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
                <div style={{ fontSize: 13, fontWeight: 700 }}>SBM · 9.1%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ background: "var(--ink)", color: "var(--cream)", padding: "120px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "var(--ficium)", opacity: 0.4, filter: "blur(80px)" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
          <div style={{ marginBottom: 80, maxWidth: 720 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 16 }}>How it works</div>
            <h2 className="display" style={{ fontSize: 56, fontWeight: 700, margin: 0 }}>Three steps.<br />Zero friction.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              { n: "01", t: "Tell us what you need", d: "Pick a product — loan, deposit, business funding. Set your terms. Takes 90 seconds.", c: "var(--accent)" },
              { n: "02", t: "Banks bid on your request", d: "Banks see your anonymized request and compete with their best offer. Your identity stays private.", c: "var(--mint)" },
              { n: "03", t: "Pick the winner", d: "Compare offers side by side. Accept with one tap. We handle the handover.", c: "var(--peach)" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "40px 0", borderTop: "1px solid rgba(250, 247, 240, 0.15)" }}>
                <div className="display" style={{ fontSize: 16, fontWeight: 700, color: s.c, letterSpacing: "0.08em", marginBottom: 32 }}>{s.n}</div>
                <h3 className="display" style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 16 }}>{s.t}</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.7, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ padding: "120px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
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
                { i: Lock, t: "Anonymized by default", d: "Banks see your need, not your name. They bid blind." },
                { i: Shield, t: "Built privacy-first", d: "Compliance with FSC Mauritius guidelines underway. India next." },
                { i: Globe, t: "No selling, no sharing", d: "We make money when you accept an offer — never from your data." },
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

      {/* CTA */}
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
              <a href="mailto:hello@ficium.net" style={{ background: "transparent", color: "white", padding: "20px 28px", borderRadius: 999, fontSize: 17, fontWeight: 600, border: "1.5px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>
                Contact us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
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
              { h: "Products", l: ["Personal loans", "Business funding", "Fixed deposits", "Mortgages"] },
              { h: "Company", l: ["About", "Contact"] },
              { h: "Legal", l: ["Terms", "Privacy"] },
            ].map((c, i) => (
              <div key={i}>
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
    </div>
  );
}

function FLogo({ size = 32, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 18 H72 C75 18 76 21 74 24 L62 38 H44 V52 H58 C61 52 62 55 60 58 L52 68 H44 V82 C44 85 41 86 38 84 L26 76 C24 75 24 73 24 71 V22 C24 19 26 18 28 18 Z" fill={color} />
    </svg>
  );
}