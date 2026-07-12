import { apiClient } from "./client";
import type { Document, Chunk, PaginatedResponse } from "./types";

export const documentsApi = {
  list: (kbId: string) =>
    apiClient.get<Document[]>(`/knowledge-bases/${kbId}/documents`),
  get: (kbId: string, docId: string) =>
    apiClient.get<Document>(`/knowledge-bases/${kbId}/documents/${docId}`),
  upload: (
    kbId: string,
    formData: FormData,
    onProgress?: (pct: number) => void,
  ) =>
    apiClient.post<Document[]>(
      `/knowledge-bases/${kbId}/documents/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) =>
          onProgress?.(Math.round((e.loaded / (e.total ?? 1)) * 100)),
      },
    ),
  getStatus: (kbId: string, docId: string) =>
    apiClient.get<{ status: Document["status"] }>(
      `/knowledge-bases/${kbId}/documents/${docId}/status`,
    ),
  delete: (kbId: string, docId: string) =>
    apiClient.delete(`/knowledge-bases/${kbId}/documents/${docId}`),
  listChunks: (kbId: string, docId: string) =>
    apiClient.get<PaginatedResponse<Chunk>>(
      `/knowledge-bases/${kbId}/documents/${docId}/chunks`,
    ),
};
