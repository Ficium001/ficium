/**
 * src/individual/vault/hooks/useVault.ts
 *
 * All vault state in one place. Pages are thin — they only render.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  listVaultDocuments,
  listVaultProperties,
  uploadVaultDocument,
  deleteVaultDocument,
  getExtractionStatus,
  getVaultDocumentUrl,
  type VaultDocument,
  type VaultProperty,
  type VaultDocType,
  type ExtractStatus,
} from "../api/vault";

// ── Types re-exported for pages ──────────────────────────────────────────────
export type { VaultDocument, VaultProperty, VaultDocType, ExtractStatus };

// ── Upload state ─────────────────────────────────────────────────────────────
export type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string; progress: number }
  | { phase: "processing"; documentId: string; fileName: string }
  | { phase: "done";       documentId: string; status: ExtractStatus }
  | { phase: "error";      message: string };

const POLL_INTERVAL_MS   = 3_000;
const POLL_MAX_ATTEMPTS  = 20;       // 60 s max
const TERMINAL: ExtractStatus[] = ["attested", "failed", "manual_review"];

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useVault() {
  const [documents,    setDocuments]    = useState<VaultDocument[]>([]);
  const [properties,   setProperties]   = useState<VaultProperty[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [uploadState,  setUploadState]  = useState<UploadState>({ phase: "idle" });

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const refresh = useCallback(async () => {
    const [docs, props] = await Promise.all([listVaultDocuments(), listVaultProperties()]);
    setDocuments(docs);
    setProperties(props);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // ── Polling — starts when a document enters 'processing' ─────────────────
  const stopPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current    = null;
    attemptsRef.current = 0;
  }, []);

  const startPoll = useCallback((documentId: string) => {
    stopPoll();
    attemptsRef.current = 0;

    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      const status = await getExtractionStatus(documentId);

      if (!status || attemptsRef.current >= POLL_MAX_ATTEMPTS) {
        stopPoll();
        setUploadState({ phase: "done", documentId, status: status ?? "failed" });
        await refresh();
        return;
      }

      if (TERMINAL.includes(status)) {
        stopPoll();
        setUploadState({ phase: "done", documentId, status });
        await refresh();
      }
    }, POLL_INTERVAL_MS);
  }, [stopPoll, refresh]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const upload = useCallback(async (file: File, docType: VaultDocType) => {
    setUploadState({ phase: "uploading", fileName: file.name, progress: 0 });

    // Simulate upload progress (Storage doesn't give progress events in this SDK version)
    const progressTimer = setInterval(() => {
      setUploadState(prev =>
        prev.phase === "uploading"
          ? { ...prev, progress: Math.min(prev.progress + 20, 90) }
          : prev
      );
    }, 150);

    const result = await uploadVaultDocument(file, docType);
    clearInterval(progressTimer);

    if (!result.ok) {
      setUploadState({ phase: "error", message: result.error });
      return;
    }

    setUploadState({ phase: "processing", documentId: result.document.id, fileName: file.name });
    await refresh();
    startPoll(result.document.id);
  }, [refresh, startPoll]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const remove = useCallback(async (documentId: string) => {
    await deleteVaultDocument(documentId);
    await refresh();
  }, [refresh]);

  // ── View (signed URL) ─────────────────────────────────────────────────────
  const view = useCallback(async (documentId: string): Promise<string | null> => {
    return getVaultDocumentUrl(documentId);
  }, []);

  const dismissUpload = useCallback(() => {
    setUploadState({ phase: "idle" });
  }, []);

  return {
    documents,
    properties,
    loading,
    uploadState,
    upload,
    remove,
    view,
    dismissUpload,
    refresh,
  };
}
