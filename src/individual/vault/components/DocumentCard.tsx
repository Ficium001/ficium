/**
 * DocumentCard — single document row in the vault list.
 * Shows doc type, extraction status badge, doc date, and actions.
 */
import { useState }                                from "react";
import { FileText, Eye, Trash2, Loader2, CheckCircle2, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { DOC_TYPE_LABELS, EXTRACT_STATUS_LABELS, type VaultDocument, type ExtractStatus } from "../api/vault";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<ExtractStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  pending:       { bg: "bg-ink/6",       text: "text-muted",  icon: <Clock      size={11} /> },
  processing:    { bg: "bg-warn/10",          text: "text-warn",   icon: <Loader2    size={11} className="animate-spin" /> },
  extracted:     { bg: "bg-ficium/10",        text: "text-ficium", icon: <Clock      size={11} /> },
  attested:      { bg: "bg-good/10",          text: "text-good",   icon: <CheckCircle2 size={11} /> },
  failed:        { bg: "bg-bad/10",           text: "text-bad",    icon: <AlertCircle  size={11} /> },
  manual_review: { bg: "bg-warn/10",          text: "text-warn",   icon: <AlertTriangle size={11} /> },
};

function StatusBadge({ status }: { status: ExtractStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold ${s.bg} ${s.text}`}>
      {s.icon}
      {EXTRACT_STATUS_LABELS[status]}
    </span>
  );
}

// ── File size formatter ───────────────────────────────────────────────────────
function fmtBytes(n: number | null) {
  if (!n) return null;
  if (n < 1024)         return `${n} B`;
  if (n < 1024 * 1024)  return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  doc:      VaultDocument;
  onView:   (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentCard({ doc, onView, onDelete }: Props) {
  const [deleting,  setDeleting]  = useState(false);
  const [viewing,   setViewing]   = useState(false);

  const handleView = async () => {
    setViewing(true);
    await onView(doc.id);
    setViewing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${DOC_TYPE_LABELS[doc.doc_type]}"?`)) return;
    setDeleting(true);
    await onDelete(doc.id);
  };

  const size = fmtBytes(doc.file_size_bytes);

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-line hover:border-line/60 transition-all">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
        <FileText size={18} className="text-muted" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-ink truncate">
            {DOC_TYPE_LABELS[doc.doc_type]}
          </span>
          <StatusBadge status={doc.extract_status} />
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[11px] text-muted truncate max-w-[160px]">{doc.file_name}</span>
          {size && <span className="text-[11px] text-muted/50">· {size}</span>}
          {doc.doc_date && (
            <span className="text-[11px] text-muted/50">
              · {new Date(doc.doc_date).toLocaleDateString("en-MU", { month: "short", year: "numeric" })}
            </span>
          )}
          {doc.expires_at && (
            <span className={[
              "text-[10px] font-medium px-1.5 py-0.5 rounded-pill",
              new Date(doc.expires_at) < new Date()
                ? "bg-bad/10 text-bad"
                : "bg-surface text-muted",
            ].join(" ")}>
              {new Date(doc.expires_at) < new Date() ? "Expired" : `Exp ${new Date(doc.expires_at).toLocaleDateString("en-MU", { month: "short", year: "numeric" })}`}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleView}
          disabled={viewing}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-ficium hover:bg-ficium/6 transition-all disabled:opacity-40"
          title="View"
        >
          {viewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-bad hover:bg-bad/6 transition-all disabled:opacity-40"
          title="Delete"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}
