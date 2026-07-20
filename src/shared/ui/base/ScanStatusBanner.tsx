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
 * happened, disoriented. This scrolls itself into view as soon as
 * a scan starts, so the feedback is always where their eyes land.
 */
export function ScanStatusBanner({ state, message, scanningLabel = "Scanning your ID…" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "idle") return;
    // Small delay lets the mobile browser finish restoring the page
    // (and any layout shift from the banner appearing) before we scroll.
    const t = setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
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
