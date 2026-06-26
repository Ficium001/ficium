/**
 * src/individual/vault/pages/Vault.tsx
 *
 * The Ficium Vault — client-facing document safe.
 * Thin page: delegates all logic to useVault(), renders components.
 *
 * Sections:
 *   1. Verified net worth summary (derived from properties + snapshot)
 *   2. Extraction banner (upload progress / result)
 *   3. Properties tab — verified property records
 *   4. Documents tab — full document list grouped by category
 *   5. Upload sheet (modal)
 */
import { useState, useCallback }             from "react";
import { Plus, ShieldCheck, Loader2, Building2 } from "lucide-react";
import { PageShell, Button }                 from "@/shared/ui";
import { useVault }                          from "../hooks/useVault";
import { UploadSheet }                       from "../components/UploadSheet";
import { ExtractionBanner }                  from "../components/ExtractionBanner";
import { DocumentCard }                      from "../components/DocumentCard";
import { PropertyCard }                      from "../components/PropertyCard";
type Tab = "documents" | "properties";

// ── Document grouping ─────────────────────────────────────────────────────────
const CATEGORY_ORDER: Record<string, string[]> = {
  "Identity":         ["nic", "passport", "birth_certificate", "driving_licence"],
  "Property":         ["title_deed", "valuation_report", "land_registry_extract"],
  "Income":           ["payslip", "employment_letter", "tax_return"],
  "Banking & Loans":  ["bank_statement", "loan_statement", "credit_card_statement"],
  "Business":         ["brn_certificate", "audited_accounts"],
  "Other":            ["insurance_policy", "other"],
};

function fmtMUR(n: number) {
  return `MUR ${new Intl.NumberFormat("en-MU").format(Math.round(n))}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Vault() {
  const {
    documents, properties, loading,
    uploadState, upload, remove, view, dismissUpload,
  } = useVault();

  const [activeTab,     setActiveTab]     = useState<Tab>("documents");
  const [showUpload,    setShowUpload]    = useState(false);

  // ── View handler — opens signed URL in new tab ───────────────────────────
  const handleView = useCallback(async (id: string) => {
    const url = await view(id);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, [view]);

  // ── Grouped documents for list ───────────────────────────────────────────
  const grouped = Object.entries(CATEGORY_ORDER).reduce<Record<string, typeof documents>>(
    (acc, [cat, types]) => {
      const docs = documents.filter(d => types.includes(d.doc_type));
      if (docs.length) acc[cat] = docs;
      return acc;
    },
    {},
  );

  // ── Net worth summary from verified properties ───────────────────────────
  const verifiedPropertyValue = properties
    .filter(p => p.verified && p.market_value)
    .reduce((s, p) => s + (p.market_value ?? 0), 0);

  const verifiedCount = documents.filter(d => d.extract_status === "attested").length;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) return (
    <PageShell>
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="text-ficium animate-spin" />
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      <div className="max-w-[680px] mx-auto px-4 pb-32 space-y-6">

        {/* ── Hero header ── */}
        <div className="bg-hero rounded-hero px-6 py-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-white/60" />
                <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Ficium Vault</span>
              </div>
              <h1 className="font-display text-[26px] font-bold leading-tight">
                Your secure<br />document safe
              </h1>
              <p className="text-[12px] text-white/50 mt-2 leading-relaxed max-w-[260px]">
                Documents are encrypted and never shared with lenders. Only verified data points flow to your applications.
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mb-1">
                {verifiedCount} verified
              </p>
              <p className="text-[10px] text-white/40">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Property value if any verified */}
          {verifiedPropertyValue > 0 && (
            <div className="mt-6 pt-5 border-t border-white/[0.10]">
              <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider mb-1">
                Verified property holdings
              </p>
              <p className="font-display text-[22px] font-bold">
                {fmtMUR(verifiedPropertyValue)}
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">
                {properties.filter(p => p.verified).length} propert{properties.filter(p => p.verified).length !== 1 ? "ies" : "y"} verified
              </p>
            </div>
          )}
        </div>

        {/* ── Extraction banner ── */}
        <ExtractionBanner state={uploadState} onDismiss={dismissUpload} />

        {/* ── Add button ── */}
        <Button
          variant="primary"
          fullWidth
          leftIcon={<Plus size={16} />}
          onClick={() => setShowUpload(true)}
        >
          Add document
        </Button>

        {/* ── Tabs ── */}
        {(documents.length > 0 || properties.length > 0) && (
          <>
            <div className="flex gap-1 bg-surface p-1 rounded-2xl">
              {(["documents", "properties"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all capitalize",
                    activeTab === tab
                      ? "bg-white text-ink shadow-sm"
                      : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {tab}
                  {tab === "documents"  && documents.length  > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-muted">({documents.length})</span>
                  )}
                  {tab === "properties" && properties.length > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-muted">({properties.length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Documents list ── */}
            {activeTab === "documents" && (
              <div className="space-y-6">
                {Object.entries(grouped).map(([cat, docs]) => (
                  <div key={cat}>
                    <h3 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">{cat}</h3>
                    <div className="space-y-2">
                      {docs.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          onView={handleView}
                          onDelete={remove}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Properties list ── */}
            {activeTab === "properties" && (
              <div className="space-y-3">
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                      <Building2 size={24} className="text-amber-500" />
                    </div>
                    <p className="text-[14px] font-semibold text-ink mb-1">No properties yet</p>
                    <p className="text-[12px] text-muted">
                      Upload a title deed or valuation report to get started.
                    </p>
                  </div>
                ) : (
                  properties.map(p => <PropertyCard key={p.id} property={p} />)
                )}
              </div>
            )}
          </>
        )}

        {/* ── Empty state ── */}
        {documents.length === 0 && uploadState.phase === "idle" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-ficium/[0.06] flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-ficium/50" />
            </div>
            <p className="text-[15px] font-semibold text-ink mb-1">Your vault is empty</p>
            <p className="text-[13px] text-muted max-w-[280px] mx-auto leading-relaxed">
              Upload payslips, title deeds, and bank statements to verify your financial profile and strengthen your applications.
            </p>
          </div>
        )}
      </div>

      {/* ── Upload sheet ── */}
      {showUpload && (
        <UploadSheet
          onUpload={upload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </PageShell>
  );
}
