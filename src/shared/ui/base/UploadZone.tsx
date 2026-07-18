import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  inputId: string;
  capture?: "user" | "environment";
  accept?: string;
};

/**
 * A dashed drop-zone that opens the native file/camera picker on tap.
 * Used for ID document, selfie, and proof-of-address capture across
 * onboarding and signup.
 */
export function UploadZone({
  icon, title, hint, file, onFile, inputId, capture, accept = "image/jpeg,image/png",
}: Props) {
  return (
    <label htmlFor={inputId} className={[
      "block cursor-pointer rounded-xl border-[1.5px] border-dashed transition-colors px-4 py-5",
      file ? "bg-mint/15 border-mint" : "bg-surface border-ink/15 hover:border-ficium/50 hover:bg-ficium/3",
    ].join(" ")}>
      <div className="flex items-start gap-3">
        <div className={["w-10 h-10 rounded-xl grid place-items-center shrink-0", file ? "bg-mint text-ink" : "bg-ficium/10 text-ficium"].join(" ")}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{title}</div>
          <div className="text-xs text-muted mt-0.5">{hint}</div>
          {file && <div className="mt-2 text-xs font-medium text-ink/80 truncate">✓ {file.name}</div>}
        </div>
      </div>
      <input id={inputId} type="file" accept={accept} capture={capture} className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </label>
  );
}
