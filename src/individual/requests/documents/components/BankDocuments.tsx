/**
 * BankDocuments — the bank's document request on an accepted deal.
 *
 * For each document the bank needs from the borrower: share a matching copy from the vault, or upload a
 * new one. A vault copy older than the bank accepts, undated, or in a format banks don't take can't be
 * shared; the borrower uploads a new one instead. Sharing is an explicit choice per document: the vault
 * promises documents stay in Ficium, so each share is confirmed and logged.
 *
 * A new upload is saved to the borrower's vault first, then sent by the server, so files never go from
 * the browser to the bank side. Everything reaches the bank through the interface API.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, FileText, Upload, XCircle } from "lucide-react";
import { uploadVaultDocument, type VaultDocType } from "../../../vault/api/vault";
import { fetchBankDocuments, sendBankDocument } from "../api/documents";
import {
  ACCEPTED_TYPES, MAX_UPLOAD_BYTES,
  type BankDocStatus, type BankDocumentChecklist, type BankDocumentItem, type VaultOption,
} from "../types";

const STATUS: Record<BankDocStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  required: { label: "Needed",        cls: "text-amber-700 bg-amber-50",     Icon: Clock },
  received: { label: "With the bank", cls: "text-ficium bg-ficium/8",        Icon: Clock },
  verified: { label: "Accepted",      cls: "text-emerald-700 bg-emerald-50", Icon: CheckCircle2 },
  rejected: { label: "Sent back",     cls: "text-red-700 bg-red-50",         Icon: XCircle },
  waived:   { label: "Not needed",    cls: "text-muted bg-ink/5",            Icon: CheckCircle2 },
};

const WHY: Record<NonNullable<VaultOption["reason"]>, (o: VaultOption, max?: number | null) => string> = {
  undated: () => "date unknown",
  too_old: (o, max) => `${o.age_days} days old, the bank accepts up to ${max}`,
  format:  () => "banks accept PDF, JPEG or PNG",
};

const day = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" });

export function BankDocuments({ requestId }: { requestId: string }) {
  const [data, setData] = useState<BankDocumentChecklist | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchBankDocuments(requestId).then(setData).catch((e: Error) => setError(e.message));
  }, [requestId]);
  useEffect(load, [load]);

  if (error) return <p role="alert" className="text-[12px] text-red-700">{error}</p>;
  if (data === undefined) return <div className="h-24 bg-ink/5 rounded-[22px] animate-pulse" />;
  if (data === null) return null; // the bank hasn't sent a request (yet)

  const mine = data.items.filter((i) => i.provided_by === "borrower");
  if (!mine.length) return null;
  const owed = mine.filter((i) => i.awaiting_borrower).length;

  return (
    <section className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5" aria-labelledby="bank-docs-h">
      <div className="flex items-center justify-between mb-1">
        <h2 id="bank-docs-h" className="text-[12px] font-bold text-muted uppercase tracking-widest">
          Documents your bank needs
        </h2>
        <span className={`text-[11px] font-semibold ${owed ? "text-amber-600" : "text-emerald-600"}`}>
          {owed ? `${owed} to send` : "All sent"}
        </span>
      </div>
      <p className="text-[12px] text-muted mb-4">
        Share a copy from your vault or upload a new one. Each document goes to this bank, for this loan only.
      </p>
      <ul className="space-y-3">
        {mine.map((item) => (
          <BankDocumentRow key={item.requirement_id} item={item} requestId={requestId} onSent={load} />
        ))}
      </ul>
    </section>
  );
}

function BankDocumentRow({ item, requestId, onSent }: {
  item: BankDocumentItem; requestId: string; onSent: () => void;
}) {
  const s = STATUS[item.status];
  const [mode, setMode] = useState<"idle" | "vault" | "new">("idle");
  const [pick, setPick] = useState<VaultOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usable = item.vault_options.filter((o) => o.usable);

  const send = async (vaultDocumentId: string, source: "vault" | "new", documentDate?: string) => {
    setBusy(true);
    setError(null);
    try {
      await sendBankDocument({ requestId, requirementId: item.requirement_id, vaultDocumentId, source, documentDate });
      setMode("idle");
      setPick(null);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't reach the bank. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-ink/8 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink">
            {item.name}{!item.mandatory && <span className="ml-1.5 text-[11px] text-muted">optional</span>}
          </p>
          {item.description && <p className="text-[11px] text-muted">{item.description}</p>}
          {item.max_age_days != null && item.awaiting_borrower && (
            <p className="text-[11px] text-muted">No older than {item.max_age_days} days.</p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-1.5 py-0.5 ${s.cls}`}>
          <s.Icon size={11} aria-hidden /> {s.label}
        </span>
      </div>

      {item.status === "rejected" && item.review_note && (
        <p className="mt-2 text-[12px] text-red-800 bg-red-50 rounded-lg px-2.5 py-1.5">
          The bank says: {item.review_note}
        </p>
      )}

      {item.awaiting_borrower && mode === "idle" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {usable.length > 0 && (
            <button onClick={() => setMode("vault")}
                    className="text-[12px] font-semibold text-ficium border border-ficium/30 rounded-lg px-3 py-1.5 hover:bg-ficium/5">
              Use from vault ({usable.length})
            </button>
          )}
          <button onClick={() => setMode("new")}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink border border-ink/15 rounded-lg px-3 py-1.5 hover:bg-ink/4">
            <Upload size={12} aria-hidden /> Upload new
          </button>
        </div>
      )}

      {mode === "vault" && (
        <div className="mt-3 space-y-1.5">
          {item.vault_options.map((o) => (
            <label key={o.id}
                   className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] ${
                     o.usable ? "cursor-pointer border-ink/10 hover:border-ficium/40" : "border-ink/5 text-muted opacity-70"} ${
                     pick?.id === o.id ? "border-ficium/60 bg-ficium/4" : ""}`}>
              <input type="radio" name={`vault-${item.requirement_id}`} disabled={!o.usable}
                     checked={pick?.id === o.id} onChange={() => setPick(o)} className="accent-ficium" />
              <FileText size={13} aria-hidden className="shrink-0" />
              <span className="truncate">{o.file_name}</span>
              <span className="ml-auto shrink-0 text-muted">
                {o.usable ? (o.doc_date ? day(o.doc_date) : "") : WHY[o.reason!](o, item.max_age_days)}
              </span>
            </label>
          ))}
          {item.vault_options.some((o) => !o.usable) && (
            <p className="text-[11px] text-muted">Copies the bank can't accept are greyed out. Upload a new one instead.</p>
          )}
          {pick && (
            <div className="rounded-lg bg-ink/4 p-2.5 text-[12px] text-ink">
              Share <strong>{pick.file_name}</strong> with your bank for this loan? It's sent to this bank only.
              <div className="mt-2 flex gap-2">
                <button disabled={busy} onClick={() => send(pick.id, "vault")}
                        className="text-[12px] font-semibold text-white bg-ficium rounded-lg px-3 py-1.5 disabled:opacity-50">
                  {busy ? "Sending…" : "Share"}
                </button>
                <button disabled={busy} onClick={() => { setPick(null); setMode("idle"); }}
                        className="text-[12px] text-muted px-2">Cancel</button>
              </div>
            </div>
          )}
          {!pick && <button onClick={() => setMode("idle")} className="text-[12px] text-muted">Cancel</button>}
        </div>
      )}

      {mode === "new" && (
        <NewUpload item={item} busy={busy}
                   onCancel={() => setMode("idle")}
                   onUploaded={(vaultId, date) => send(vaultId, "new", date)}
                   onError={setError} setBusy={setBusy} />
      )}

      {error && <p role="alert" className="mt-2 text-[12px] text-red-700">{error}</p>}
    </li>
  );
}

function NewUpload({ item, busy, onCancel, onUploaded, onError, setBusy }: {
  item: BankDocumentItem; busy: boolean; onCancel: () => void;
  onUploaded: (vaultDocumentId: string, documentDate: string) => void;
  onError: (m: string | null) => void; setBusy: (b: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  // Fixed when the form opens (render must stay pure).
  const [{ today, oldest }] = useState(() => {
    const now = Date.now();
    return {
      today: new Date(now).toISOString().slice(0, 10),
      oldest: item.max_age_days != null
        ? new Date(now - item.max_age_days * 86_400_000).toISOString().slice(0, 10) : undefined,
    };
  });

  const problem =
    !file ? null
    : !ACCEPTED_TYPES.includes(file.type) ? "Use a PDF, JPEG or PNG file."
    : file.size > MAX_UPLOAD_BYTES ? "Files must be 10 MB or less."
    : !date ? "Give the date the document covers."
    : oldest && date < oldest ? `The bank needs a document from the last ${item.max_age_days} days.`
    : date > today ? "That date is in the future."
    : null;

  const go = async () => {
    if (!file || problem) return;
    setBusy(true);
    onError(null);
    const up = await uploadVaultDocument(file, (item.document_type ?? "other") as VaultDocType);
    if (!up.ok || !up.document) {
      setBusy(false);
      onError(up.ok ? "Upload failed. Try again." : up.error);
      return;
    }
    onUploaded(up.document.id, date); // send() clears busy
  };

  return (
    <div className="mt-3 space-y-2">
      <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="sr-only"
             aria-label={`File for ${item.name}`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => fileRef.current?.click()}
              className="w-full text-left text-[12px] border border-dashed border-ink/20 rounded-lg px-3 py-2.5 hover:border-ficium/40">
        {file ? file.name : "Choose a PDF, JPEG or PNG (10 MB max)"}
      </button>
      <label className="flex items-center gap-2 text-[12px] text-ink">
        Date the document covers
        <input type="date" value={date} max={today} min={oldest} onChange={(e) => setDate(e.target.value)}
               className="text-[12px] border border-ink/12 rounded-lg px-2 py-1" />
      </label>
      {problem && <p className="text-[11px] text-amber-700">{problem}</p>}
      <p className="text-[11px] text-muted">It's also kept in your vault, so you can reuse it next time.</p>
      <div className="flex gap-2">
        <button disabled={!file || !!problem || busy} onClick={go}
                className="text-[12px] font-semibold text-white bg-ficium rounded-lg px-3 py-1.5 disabled:opacity-50">
          {busy ? "Sending…" : "Upload and send"}
        </button>
        <button disabled={busy} onClick={onCancel} className="text-[12px] text-muted px-2">Cancel</button>
      </div>
    </div>
  );
}
