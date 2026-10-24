// src/individual/money/panels/CalculatorsPanel.tsx
import { useState } from "react";
import { LoanSavingsCalculator } from "@/individual/money/tools/components/LoanSavingsCalculator";
import { ROICalculator } from "@/individual/money/tools/components/ROICalculator";

const TOOLS = [
  { key: "loan",    label: "Loan" },
  { key: "savings", label: "Savings" },
  { key: "roi",     label: "Return on an asset" },
] as const;
type Tool = (typeof TOOLS)[number]["key"];

export default function CalculatorsPanel({ initialTool }: { initialTool: string | null }) {
  const [tool, setTool] = useState<Tool>(TOOLS.some((t) => t.key === initialTool) ? (initialTool as Tool) : "loan");
  return (
    <>
      <div role="radiogroup" aria-label="Calculator" className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button key={t.key} role="radio" aria-checked={tool === t.key} onClick={() => setTool(t.key)}
            className={[
              "px-4 py-2 rounded-pill text-[13px] font-semibold border transition-colors",
              tool === t.key ? "bg-ink text-white border-ink" : "bg-white text-ink/70 border-ink/10 hover:border-ink/30",
            ].join(" ")}>
            {t.label}
          </button>
        ))}
      </div>
      {tool === "roi" ? <ROICalculator /> : <LoanSavingsCalculator key={tool} mode={tool} />}
    </>
  );
}
