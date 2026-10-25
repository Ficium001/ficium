// src/individual/money/panels/ui.tsx — small building blocks shared by the Money panels.
import type { ReactNode } from "react";

export function Panel({ title, icon, right, children, className = "" }: {
  title?: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={["bg-white rounded-[22px] border border-ink/6 shadow-xs overflow-hidden", className].join(" ")}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ink/5">
          <h2 className="flex items-center gap-2 font-bold text-[15px] text-ink">{icon}{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="text-[12px] font-semibold text-ficium hover:underline">
      {children}
    </button>
  );
}
