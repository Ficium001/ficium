import { useState, useEffect } from "react";
import type { RefObject }       from "react";

export function useReducedMotion(): boolean {
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

export function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf: number | null = null;
    const tick    = () => { setY(window.scrollY); raf = null; };
    const onScroll = () => { if (raf === null) raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf !== null) cancelAnimationFrame(raf); };
  }, []);
  return y;
}

/** Global page scroll progress, 0 → 1 from top to bottom of the document. */
export function useScrollProgress(): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf: number | null = null;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      raf = null;
    };
    const onScroll = () => { if (raf === null) raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);
  return p;
}

/**
 * Progress, 0 → 1, of scrolling *through* a tall element that contains an inner
 * sticky viewport. 0 when the element's top reaches the viewport top, 1 when its
 * bottom is about to leave. Drives pinned "scrollytelling" sections.
 */
export function useElementProgress<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf: number | null = null;
    const tick = () => {
      const rect = el.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      setP(distance > 0 ? Math.min(1, Math.max(0, scrolled / distance)) : 0);
      raf = null;
    };
    const onScroll = () => { if (raf === null) raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

export function useInView<T extends HTMLElement>(ref: RefObject<T | null>, threshold = 0.15): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) { setInView(true); io.disconnect(); } } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
}
