import { supabase } from "@/shared/lib/supabase";
import type { BankDocumentChecklist } from "../types";

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token ?? ""}` };
}

/** The bank's document request for this deal, or null when there is none (yet). */
export async function fetchBankDocuments(requestId: string): Promise<BankDocumentChecklist | null> {
  const res = await fetch(`/api/request-actions?action=documents&requestId=${encodeURIComponent(requestId)}`,
    { headers: await authHeader() });
  if (!res.ok) throw new Error("Couldn't load the bank's document request.");
  const json = await res.json() as { ok: boolean; data?: { checklist: BankDocumentChecklist | null } };
  return json.data?.checklist ?? null;
}

export interface SendBody {
  requestId: string;
  requirementId: string;
  vaultDocumentId: string;
  source: "vault" | "new";
  documentDate?: string | null;
}

export async function sendBankDocument(body: SendBody): Promise<void> {
  const res = await fetch("/api/request-actions", {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "document-send", ...body }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(j?.error ?? "That didn't reach the bank. Try again.");
  }
}
