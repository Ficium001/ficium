import { useState, useEffect } from "react";
import { useReducedMotion, useScrollY, useScrollProgress } from "@/features/marketing/hooks";
import { SCENES }   from "@/features/marketing/config/scenes";
import { Nav, Hero, HowItWorksSection, Products, Trust, CTA, Footer } from "@/features/marketing/components/SplashComponents";

// ─────────────────────────────────────────────────────────────────────────────
// Splash — marketing landing page orchestrator.
// Scene rotation, scroll tracking, and auth-error redirect live here.
// All visual sections are in features/marketing/components/SplashComponents.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export default function Splash() {
  const reducedMotion  = useReducedMotion();
  const scrollY        = useScrollY();
  const progress       = useScrollProgress();
  const [sceneIndex,   setSceneIndex]  = useState(0);
  const [activeOffer,  setActiveOffer] = useState(0);

  // Redirect Supabase auth errors (e.g. expired password-reset link)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error=access_denied") || hash.includes("error_code=otp_expired")) {
      window.history.replaceState(null, "", window.location.pathname);
      window.location.href = "/auth/reset-password";
    }
  }, []);

  // Cycle scenes every 5.2s
  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => { setSceneIndex((i) => (i + 1) % SCENES.length); setActiveOffer(0); }, 5200);
    return () => clearInterval(t);
  }, [reducedMotion]);

  // Cycle active offer highlight
  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => setActiveOffer((o) => (o + 1) % 3), 1700);
    return () => clearInterval(t);
  }, [sceneIndex, reducedMotion]);

  const scene = SCENES[sceneIndex];

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-hidden">
      <Nav scrollY={scrollY} progress={progress} />
      <Hero scene={scene} sceneIndex={sceneIndex} activeOffer={activeOffer} scrollY={scrollY} reducedMotion={reducedMotion} />
      <HowItWorksSection reducedMotion={reducedMotion} />
      <Products />
      <Trust />
      <CTA />
      <Footer />
    </div>
  );
}
