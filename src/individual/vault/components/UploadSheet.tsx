/**
 * UploadSheet — bottom sheet for selecting doc type and dropping a file.
 * Modular: no vault state here, just props in / callbacks out.
 */
import { useState, useRef, useCallback }  from "react";
import { X, Upload, FileText, ChevronRight } from "lucide-react";
import { Button }       from "@/shared/ui";
import { DOC_TYPE_LABELS, type VaultDocType } from "../api/vault";

// ── Doc category menu ─────────────────────────────────────────────────────────
type Category = { label: string; icon: string; types: VaultDocType[] };

const CATEGORIES: Category[] = [
  {
    label: "Identity",
    icon:  "🪪",
    types: ["nic", "passport", "birth_certificate", "driving_licence"],
  },
  {
    label: "Property",
    icon:  "🏠",
    types: ["title_deed", "valuation_report", "land_registry_extract"],
  },
  {
    label: "Income",
    icon:  "💼",
    types: ["payslip", "employment_letter", "tax_return"],
  },
  {
    label: "Banking & Loans",
    icon:  "🏦",
    types: ["bank_statement", "loan_statement", "credit_card_statement"],
  },
  {
    label: "Business",
    icon:  "📊",
    types: ["brn_certificate", "audited_accounts"],
  },
  {
    label: "Other",
    icon:  "📄",
    types: ["insurance_policy", "other"],
  },
];

interface Props {
  onUpload: (file: File, docType: VaultDocType) => void;
  onClose:  () => void;
}

type SheetStep = "category" | "type" | "file";

export function UploadSheet({ onUpload, onClose }: Props) {
  const [step,        setStep]        = useState<SheetStep>("category");
  const [category,    setCategory]    = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<VaultDocType | null>(null);
  const [dragOver,    setDragOver]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!selectedType) return;
    onUpload(file, selectedType);
    onClose();
  }, [selectedType, onUpload, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const back = () => {
    if (step === "file")     { setStep("type");     return; }
    if (step === "type")     { setStep("category"); setCategory(null); return; }
    onClose();
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-lift max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            {step !== "category" && (
              <button onClick={back} className="text-muted hover:text-ink transition-colors">
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
            <div>
              <h2 className="font-display text-[17px] font-bold text-ink">
                {step === "category" && "Add document"}
                {step === "type"     && category?.label}
                {step === "file"     && DOC_TYPE_LABELS[selectedType!]}
              </h2>
              {step === "category" && (
                <p className="text-[12px] text-muted mt-0.5">Choose what you're uploading</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-ink transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Step 1: Category ── */}
          {step === "category" && (
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => { setCategory(cat); setStep("type"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-line hover:border-ficium/30 hover:bg-ficium/2 transition-all text-left group"
                >
                  <span className="text-[22px] w-9 text-center">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-ink">{cat.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {cat.types.length} document type{cat.types.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-muted/40 group-hover:text-ficium transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Doc type ── */}
          {step === "type" && category && (
            <div className="space-y-2">
              {category.types.map(type => (
                <button
                  key={type}
                  onClick={() => { setSelectedType(type); setStep("file"); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-line hover:border-ficium/30 hover:bg-ficium/2 transition-all text-left group"
                >
                  <FileText size={16} className="text-muted shrink-0" />
                  <span className="flex-1 text-[14px] font-medium text-ink">
                    {DOC_TYPE_LABELS[type]}
                  </span>
                  <ChevronRight size={15} className="text-muted/40 group-hover:text-ficium transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* ── Step 3: File drop ── */}
          {step === "file" && selectedType && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted">
                Upload a photo or scanned copy. We accept JPG, PNG, and PDF.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                  dragOver
                    ? "border-ficium bg-ficium/5"
                    : "border-line hover:border-ficium/40 hover:bg-ficium/2",
                ].join(" ")}
              >
                <div className={[
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  dragOver ? "bg-ficium text-white" : "bg-surface text-muted",
                ].join(" ")}>
                  <Upload size={22} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-ink">
                    {dragOver ? "Drop to upload" : "Tap to choose file"}
                  </p>
                  <p className="text-[12px] text-muted mt-1">or drag and drop here</p>
                </div>
                <p className="text-[11px] text-muted/60">JPG · PNG · PDF · Max 10 MB</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2.5 bg-ficium/4 border border-ficium/10 rounded-xl px-4 py-3">
                <span className="text-[14px] mt-0.5">🔒</span>
                <p className="text-[12px] text-ink/60 leading-relaxed">
                  Stored encrypted. Never shared with lenders — only verified data points flow to applications.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA for file step */}
        {step === "file" && (
          <div className="px-6 pb-6 shrink-0">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
