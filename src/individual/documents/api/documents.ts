// src/individual/documents/api/documents.ts
import { supabase } from "@/shared/lib/supabase";

export type DocumentType = "payslip"|"bank_statement"|"id_document"|"utility_bill"|"tax_return"|"business_plan"|"property_valuation"|"vehicle_quote"|"other";

export type Doc = {
  id: string; clientId: string; journeyId: string|null;
  type: DocumentType; label: string; storagePath: string;
  fileName: string; fileSize: number|null; mimeType: string|null;
  extracted: Record<string,unknown>|null; verified: boolean; createdAt: string;
};

export async function getDocuments(journeyId?: string): Promise<Doc[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase.from("client_documents").select("*").eq("client_id", user.id).order("created_at", { ascending: false });
  if (journeyId) q = q.eq("journey_id", journeyId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id, clientId: r.client_id, journeyId: r.journey_id,
    type: r.type, label: r.label, storagePath: r.storage_path,
    fileName: r.file_name, fileSize: r.file_size, mimeType: r.mime_type,
    extracted: r.extracted, verified: r.verified, createdAt: r.created_at,
  }));
}

export async function uploadDocument(
  file: File, journeyId: string|null, type: DocumentType, label: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const ext  = file.name.split(".").pop() ?? "bin";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { error: dbErr } = await supabase.from("client_documents").insert({
    client_id: user.id, journey_id: journeyId ?? null,
    type, label, storage_path: path,
    file_name: file.name, file_size: file.size, mime_type: file.type,
  });
  if (dbErr) return { ok: false, error: dbErr.message };
  return { ok: true };
}
