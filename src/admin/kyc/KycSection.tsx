// =============================================================
// Ficium Admin — KYC Review Dashboard
//
// Drop this into FiciumAdminPanel by adding:
//   { key: "kyc", label: "KYC Review", icon: "◉" }
// to NAV and rendering <KycSection /> in the section switch.
// =============================================================
import { useState } from "react";
import {
  useKycQueue, useKycStats, useApproveKyc, useRejectKyc,
  getSignedUrl, type KycQueueItem, type KycStatus,
} from "./useKycReview";

/* ---------- Helpers ---------- */

const fmt = {
  date: (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-MU", { day: "2-digit", month: "short", year: "numeric" }) : "—",
  docType: (t: string | null) =>
    ({ national_id: "National ID", passport: "Passport", drivers_license: "Driver's License", other: "Other" }[t ?? ""] ?? t ?? "—"),
};

function statusPill(status: KycStatus) {
  const map: Record<KycStatus, string> = {
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
    verified:       "bg-green-50  text-green-700  border-green-200",
    rejected:       "bg-red-50    text-red-500    border-red-200",
    not_submitted:  "bg-ink/5     text-muted      border-ink/10",
  };
  const label: Record<KycStatus, string> = {
    pending_review: "Pending review",
    verified:       "Verified",
    rejected:       "Rejected",
    not_submitted:  "Not submitted",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function riskBadge(score: number | null) {
  if (score === null) return <span className="text-muted text-[12px]">—</span>;
  const color = score >= 70 ? "text-red-500" : score >= 40 ? "text-amber-600" : "text-green-600";
  return <span className={`font-bold text-[13px] ${color}`}>{score}</span>;
}

/* ---------- Document viewer ---------- */

function DocImage({ path, label }: { path: string | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (url || !path) return;
    setLoading(true);
    const signed = await getSignedUrl(path);
    setUrl(signed);
    setLoading(false);
  };

  if (!path) {
    return (
      <div className="rounded-xl border border-ink/10 bg-cream aspect-[4/3] flex items-center justify-center text-[12px] text-muted">
        Not uploaded
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={label}
            className="rounded-xl border border-ink/10 w-full aspect-[4/3] object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
          />
        </a>
      ) : (
        <button
          onClick={load}
          disabled={loading}
          className="w-full rounded-xl border border-dashed border-ficium/40 bg-ficium/[0.03] aspect-[4/3] flex flex-col items-center justify-center gap-1.5 hover:bg-ficium/[0.06] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-ficium border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-[20px]">🔒</span>
              <span className="text-[12px] text-ficium font-semibold">Load document</span>
              <span className="text-[10px] text-muted">10-min secure link</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ---------- Review modal ---------- */

function KycReviewModal({ item, onClose }: { item: KycQueueItem; onClose: () => void }) {
  const [note, setNote]         = useState(item.admin_review_note ?? "");
  const [rejectReason, setReject] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approve    = useApproveKyc();
  const reject     = useRejectKyc();
  const [resetting, setResetting] = useState(false);
  const [resetMsg,  setResetMsg]  = useState<string | null>(null);

  const handleResetFace = async () => {
    if (!confirm("Delete this user's KYC record and remove their face from the recognition system? They will need to resubmit.")) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET ?? "";
      // Delete face from Rekognition collection
      const faceRes = await fetch(`/api/kyc-admin-faces?clientId=${item.id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret },
      });
      const faceData = await faceRes.json() as { deleted?: number; message?: string; error?: string };
      if (faceData.error) throw new Error(faceData.error);
      // Delete KYC submissions from DB
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
      await supabase.from("kyc_submissions").delete().eq("client_id", item.id);
      await supabase.from("clients").update({ kyc_status: "not_started" }).eq("id", item.id);
      setResetMsg(`✓ Reset complete. Faces removed: ${faceData.deleted ?? 0}. User can resubmit KYC.`);
      setTimeout(() => { onClose(); }, 2500);
    } catch (err) {
      setResetMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setResetting(false);
    }
  };

  const handleApprove = async () => {
    await approve.mutateAsync({ userId: item.id, note });
    onClose();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await reject.mutateAsync({ userId: item.id, reason: rejectReason });
    onClose();
  };

  const isReviewed = item.kyc_status === "verified" || item.kyc_status === "rejected";

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-ink/[0.07] sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-display font-bold text-[18px] text-ink">
              {item.full_name ?? item.email}
            </h2>
            <p className="text-[13px] text-muted mt-0.5">{item.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {statusPill(item.kyc_status)}
            <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Document images */}
          <div>
            <div className="text-[12px] font-bold text-ink uppercase tracking-wider mb-3">Uploaded documents</div>
            <div className="grid grid-cols-3 gap-3">
              <DocImage path={item.id_document_path}      label="ID Document" />
              <DocImage path={item.selfie_path}           label="Selfie" />
              <DocImage path={item.proof_of_address_path} label="Proof of Address" />
            </div>
          </div>

          {/* Info grid */}
          <div>
            <div className="text-[12px] font-bold text-ink uppercase tracking-wider mb-3">Submitted details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                ["Document type",   fmt.docType(item.id_document_type)],
                ["Document number", item.id_document_number ?? "—"],
                ["Date of birth",   item.date_of_birth ?? "—"],
                ["Address",         item.address_line_1 ?? "—"],
                ["City",            item.city ?? "—"],
                ["Country",         item.country ?? "—"],
                ["Risk score",      null],
                ["Provider",        item.kyc_provider ?? "manual_review"],
                ["Submitted",       fmt.date(item.kyc_submitted_at)],
              ].map(([k, v]) => (
                <div key={k as string} className="bg-cream rounded-xl p-3">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{k}</div>
                  {k === "Risk score"
                    ? riskBadge(item.kyc_risk_score)
                    : <div className="text-[13px] font-semibold text-ink">{v as string}</div>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Prior review note */}
          {item.admin_review_note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Previous review note</div>
              <p className="text-[13px] text-ink">{item.admin_review_note}</p>
              {item.reviewed_at && (
                <p className="text-[11px] text-muted mt-1">Reviewed {fmt.date(item.reviewed_at)}</p>
              )}
            </div>
          )}

          {!isReviewed && (
            <>
              {/* Review note */}
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1.5">
                  Review note <span className="text-muted font-normal">(optional — sent to user on approval)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. ID clearly legible, face matches selfie"
                  className="w-full border border-ink/[0.12] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-ficium focus:ring-2 focus:ring-ficium/20 resize-none"
                />
              </div>

              {/* Reject form */}
              {showReject && (
                <div className="space-y-2">
                  <label className="block text-[12px] font-semibold text-red-600 mb-1.5">
                    Rejection reason <span className="text-red-400">(required — sent to user)</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setReject(e.target.value)}
                    rows={2}
                    placeholder="e.g. Document is blurry, selfie does not match ID photo"
                    className="w-full border border-red-300 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none"
                  />
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || reject.isPending}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-[13px]"
                  >
                    {reject.isPending ? "Rejecting…" : "Confirm rejection"}
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleApprove}
                  disabled={approve.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-[14px]"
                >
                  {approve.isPending ? "Approving…" : "✓ Approve KYC"}
                </button>
                <button
                  onClick={() => setShowReject((s) => !s)}
                  className="flex-1 bg-white border border-red-200 hover:border-red-400 text-red-500 font-bold py-3 rounded-xl transition-colors text-[14px]"
                >
                  {showReject ? "Cancel" : "✕ Reject"}
                </button>
              </div>
            </>
          )}

          {isReviewed && (
            <div className={`rounded-xl px-4 py-3 border ${
              item.kyc_status === "verified"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              <p className="text-[13px] font-semibold">
                {item.kyc_status === "verified" ? "✓ Approved" : "✕ Rejected"} on {fmt.date(item.reviewed_at)}
              </p>
              {item.admin_review_note && (
                <p className="text-[12px] mt-1 opacity-80">{item.admin_review_note}</p>
              )}
            </div>
          )}

          {/* Reset KYC — clears DB record + Rekognition face */}
          <div className="pt-2 border-t border-ink/[0.07]">
            <p className="text-[11px] text-muted mb-2">
              Use this if the user needs to resubmit from scratch (e.g. wrong documents uploaded).
            </p>
            <button
              onClick={handleResetFace}
              disabled={resetting}
              className="w-full bg-white border border-ink/20 hover:border-red-300 hover:text-red-600 text-muted font-semibold py-2.5 rounded-xl transition-colors text-[13px] disabled:opacity-50"
            >
              {resetting ? "Resetting…" : "⟳ Reset KYC & clear face record"}
            </button>
            {resetMsg && (
              <p className={`text-[12px] mt-2 ${resetMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
                {resetMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main KYC Section ---------- */

const FILTERS: { key: KycStatus | "all"; label: string }[] = [
  { key: "pending_review", label: "Pending" },
  { key: "all",            label: "All" },
  { key: "verified",       label: "Approved" },
  { key: "rejected",       label: "Rejected" },
];

export default function KycSection() {
  const [filter, setFilter]     = useState<KycStatus | "all">("pending_review");
  const [selected, setSelected] = useState<KycQueueItem | null>(null);

  const { data: queue = [], isLoading } = useKycQueue(filter);
  const { data: stats }                 = useKycStats();

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending review", value: stats?.pending ?? 0,   color: "text-amber-600" },
          { label: "Verified",       value: stats?.verified ?? 0,  color: "text-green-600" },
          { label: "Rejected",       value: stats?.rejected ?? 0,  color: "text-red-500" },
          { label: "Avg risk score", value: stats?.avgRiskScore != null ? stats.avgRiskScore : "—", color: "text-ink" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className={`text-3xl font-bold tracking-tight mb-1 ${s.color}`}>
              {isLoading ? "—" : s.value}
            </div>
            <div className="text-[13px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between flex-wrap gap-3">
          <span className="font-display font-bold text-[16px] text-ink">KYC queue</span>
          <div className="flex gap-2">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filter === key
                    ? "bg-ficium text-white border-ficium"
                    : "bg-white border-ink/10 text-muted hover:border-ficium/40"
                }`}
              >
                {label}
                {key === "pending_review" && stats?.pending ? (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {stats.pending}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ficium border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                {["User", "Document", "Country", "Risk", "Provider", "Submitted", "Status", ""].map((h) => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="border-b border-ink/[0.04] hover:bg-cream/60 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-ink">{item.full_name ?? "—"}</div>
                    <div className="text-[11px] text-muted mt-0.5">{item.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[13px] text-ink">{fmt.docType(item.id_document_type)}</div>
                    <div className="text-[11px] text-muted font-mono">{item.id_document_number ?? "—"}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ink">{item.country ?? "—"}</td>
                  <td className="px-5 py-4">{riskBadge(item.kyc_risk_score)}</td>
                  <td className="px-5 py-4 text-[12px] text-muted">{item.kyc_provider ?? "manual_review"}</td>
                  <td className="px-5 py-4 text-[12px] text-muted whitespace-nowrap">
                    {fmt.date(item.kyc_submitted_at)}
                  </td>
                  <td className="px-5 py-4">{statusPill(item.kyc_status)}</td>
                  <td className="px-5 py-4">
                    <button className="text-ficium hover:underline text-[12px] font-semibold">→</button>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted text-[13px]">
                    {filter === "pending_review" ? "🎉 No pending KYC reviews" : "No records match"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && <KycReviewModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
