// =============================================================
// Ficium — CardScroller
// Bounds a row of fixed-width cards to the available container
// width and adds left/right arrow controls + edge fades, instead
// of relying on the browser's native horizontal scrollbar.
//
// Candidate for promotion into @ficium/shared/ui/dashboard once
// proven across more than one card row (Requests, Market, Bids…).
// =============================================================
import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardScrollerProps {
  children: ReactNode;
  /** Extra classes for the inner scroll track (e.g. gap sizing). */
  className?: string;
}

export function CardScroller({ children, className = "" }: CardScrollerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    // Re-check on resize and whenever children change size (e.g. data loads in).
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollByCard = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by roughly one card + gap, derived from the first child's width.
    const firstCard = el.firstElementChild as HTMLElement | null;
    const step = (firstCard?.offsetWidth ?? 260) + 16; // + gap-4
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  return (
    // min-w-0 is critical here: as a grid/flex item, this wrapper defaults
    // to min-width:auto and grows to fit its content's intrinsic width
    // instead of shrinking to the available column width. That silently
    // defeats overflow-x-auto (clientWidth ends up == scrollWidth) and
    // hides the scroll arrows entirely.
    <div className="relative min-w-0">
      {/* Left edge fade + arrow */}
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-12 bg-linear-to-r from-paper to-transparent z-10 hidden sm:block" />
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByCard("left")}
            className="hidden sm:grid absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 place-items-center rounded-full bg-white border border-line shadow-md hover:bg-ink/3 transition-colors"
          >
            <ChevronLeft size={18} className="text-ink" />
          </button>
        </>
      )}

      <div
        ref={trackRef}
        className={`flex overflow-x-auto scrollbar-hide ${className}`}
      >
        {children}
      </div>

      {/* Right edge fade + arrow */}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-linear-to-l from-paper to-transparent z-10 hidden sm:block" />
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByCard("right")}
            className="hidden sm:grid absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 place-items-center rounded-full bg-white border border-line shadow-md hover:bg-ink/3 transition-colors"
          >
            <ChevronRight size={18} className="text-ink" />
          </button>
        </>
      )}
    </div>
  );
}
