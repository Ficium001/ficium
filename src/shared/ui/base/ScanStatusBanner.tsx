import { useEffect, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export type ScanState = "idle" | "scanning" | "done" | "error";

type Props = {
  state: ScanState;
  message: string | null;
  scanningLabel?: string;
};

/**
 * Status banner for the "Scan NIC" capture flow.
 *
 * On mobile, returning from the native camera (after <input capture>
 * fires) commonly resets the page's scroll position to the top —
 * the person ends up looking at the header with no sign anything
 * happened, disoriented. A single scrollIntoView() right after the
 * state change isn't reliable here: the browser's own scroll-reset
 * on camera-return can fire asynchronously (tied to the visual
 * viewport resizing as the camera UI closes) and land *after* ours,
 * silently undoing it. So instead of one attempt, we correct
 * repeatedly for ~1.5s — each retry re-wins the position even if
 * the browser resets it in between — and also re-trigger on the
 * visibility/viewport events that specifically mark "returned from
 * camera", not just on the state change itself.
 */
export function ScanStatusBanner({ state, message, scanningLabel = "Scanning your ID…" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "idle") return;

    const scroll = () => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    // Repeated corrections: outlasts the browser's own async scroll-reset
    // on camera-return instead of racing a single call against it.
    const delays = [50, 150, 300, 500, 800, 1200, 1600];
    const timers = delays.map((d) => setTimeout(scroll, d));

    // Also re-correct on the events that actually mark "back from camera" —
    // more reliable than a fixed timeout on some Android WebViews.
    const onVisible = () => { if (document.visibilityState === "visible") scroll(); };
    document.addEventListener("visibilitychange", onVisible);
    window.visualViewport?.addEventListener("resize", scroll);

    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", onVisible);
      window.visualViewport?.removeEventListener("resize", scroll);
    };
  }, [state]);

  if (state === "idle") return null;

  return (
    <div ref={ref} className={[
      "flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[13px] scroll-mt-20",
      state === "scanning" && "bg-ficium/4 border border-ficium/15 text-ink/80",
      state === "done"     && "bg-mint/15 border border-mint text-ink/80",
      state === "error"    && "bg-amber-50 border border-amber-200 text-amber-900",
    ].filter(Boolean).join(" ")}>
      {state === "scanning" && <Loader2 size={16} className="shrink-0 mt-0.5 animate-spin text-ficium" />}
      {state === "done"     && <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-ink" />}
      {state === "error"    && <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />}
      <p>{state === "scanning" ? scanningLabel : message}</p>
    </div>
  );
}
