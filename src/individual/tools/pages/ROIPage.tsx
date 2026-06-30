import { PageShell } from "../../../shared/ui";
import { ROICalculator } from "../components/ROICalculator";

/* ─────────────────────────────────────────────
   ROIPage
   Standalone page at /tools/roi — same shell pattern
   as FinancialTools (credit / investment tools).
───────────────────────────────────────────── */
export default function ROIPage() {
  return (
    <PageShell max="1160px">
      <div className="pt-6 pb-10">

        {/* ── Header ── */}
        <div className="mb-10">
          <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted mb-1">
            Financial Tools Module
          </div>
          <h1 className="font-display text-[32px] sm:text-[38px] font-extrabold text-ink leading-none">
            Return on Investment
          </h1>
          <p className="text-[14px] text-muted mt-2">
            Calculate the real return on any asset — property, equity, gold, a business stake — with or without charges and cash flows.
          </p>
        </div>

        <ROICalculator />

      </div>
    </PageShell>
  );
}
