import { apiClient } from './client';
<<<<<<< HEAD
import type { Document, Chunk } from './types';

export const documentsApi = {
  list: (kbId: string) =>
    apiClient.get<Document[]>(`/knowledge-bases/${kbId}/documents`),
  get: (kbId: string, docId: string) =>
    apiClient.get<Document>(`/knowledge-bases/${kbId}/documents/${docId}`),
  upload: (kbId: string, formData: FormData, onProgress?: (pct: number) => void) =>
    apiClient.post<Document[]>(`/knowledge-bases/${kbId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded / (e.total ?? 1)) * 100)),
    }),
  getStatus: (kbId: string, docId: string) =>
    apiClient.get<{ status: Document['status'] }>(`/knowledge-bases/${kbId}/documents/${docId}/status`),
  delete: (kbId: string, docId: string) =>
    apiClient.delete(`/knowledge-bases/${kbId}/documents/${docId}`),
  listChunks: (kbId: string, docId: string) =>
    apiClient.get<PaginatedResponse<Chunk>>(`/knowledge-bases/${kbId}/documents/${docId}/chunks`),
};
=======
import type { Chunk, Document, DocumentUploadResult, PaginatedResponse } from './types';

export async function uploadDocument(kbId: string, file: File): Promise<DocumentUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<DocumentUploadResult>(
    `/knowledge-bases/${kbId}/documents/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
}

export async function listDocuments(kbId: string): Promise<PaginatedResponse<Document>> {
  const res = await apiClient.get<PaginatedResponse<Document>>(`/knowledge-bases/${kbId}/documents`);
  return res.data;
}

export async function getDocument(kbId: string, docId: string): Promise<Document> {
  const res = await apiClient.get<Document>(`/knowledge-bases/${kbId}/documents/${docId}`);
  return res.data;
}

export async function deleteDocument(kbId: string, docId: string): Promise<void> {
  await apiClient.delete(`/knowledge-bases/${kbId}/documents/${docId}`);
}

export async function reprocessDocument(kbId: string, docId: string): Promise<Document> {
  const res = await apiClient.post<Document>(`/knowledge-bases/${kbId}/documents/${docId}/reprocess`);
  return res.data;
}

export async function listChunks(kbId: string, docId: string): Promise<{ items: Chunk[]; next_cursor: string | null }> {
  const res = await apiClient.get<{ items: Chunk[]; next_cursor: string | null }>(
    `/knowledge-bases/${kbId}/documents/${docId}/chunks`
  );
  return res.data;
}
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
