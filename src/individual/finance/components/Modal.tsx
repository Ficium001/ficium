// src/individual/finance/components/Modal.tsx
import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  title, onClose, children, wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-ink/40 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}>
      <div
        className={["w-full bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl", wide ? "sm:max-w-lg" : "sm:max-w-md", "max-h-[92vh] overflow-y-auto"].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-ink/6 sticky top-0 bg-white rounded-t-[28px] sm:rounded-t-[24px]">
          <h2 className="font-display text-[17px] font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-ink/5 text-muted">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
