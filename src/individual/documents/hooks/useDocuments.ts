import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, uploadDocument, type DocumentType, type Doc } from "@/individual/documents/api/documents";

export type { Doc, DocumentType };

const QK = { docs: (jid?: string) => ["documents", jid ?? "all"] as const };

export function useDocuments(journeyId?: string) {
  return useQuery({ queryKey: QK.docs(journeyId), queryFn: () => getDocuments(journeyId), staleTime: 60_000 });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, journeyId, type, label }: { file: File; journeyId: string|null; type: DocumentType; label: string }) =>
      uploadDocument(file, journeyId, type, label),
    onSuccess: (_, { journeyId }) => {
      qc.invalidateQueries({ queryKey: QK.docs(journeyId ?? undefined) });
      qc.invalidateQueries({ queryKey: QK.docs() });
    },
  });
}
