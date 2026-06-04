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
