import { apiClient } from './client';
import type { KBCapacity, KBHealth, KnowledgeBase, IndexedChunk, SharedKBEntry } from './types';

export const kbApi = {
  list: () =>
    apiClient.get<KnowledgeBase[]>('/knowledge-bases'),
  get: (id: string) => apiClient.get<KnowledgeBase>(`/knowledge-bases/${id}`),
  create: (data: { name: string; description: string }) =>
    apiClient.post<KnowledgeBase>('/knowledge-bases', data),
  update: (id: string, data: { pipeline_config?: Record<string, any>; name?: string; description?: string }) =>
    apiClient.put<KnowledgeBase>(`/knowledge-bases/${id}`, data),
  reindex: (id: string) => apiClient.post(`/knowledge-bases/${id}/reindex`),
  delete: (id: string) => apiClient.delete(`/knowledge-bases/${id}`),
  // Free-tier (Zilliz Cloud) usage — capped app-wide, not per user.
  capacity: () => apiClient.get<KBCapacity>('/knowledge-bases/capacity'),
  // Every active knowledge base across all users, so anyone can free up a
  // shared slot once the free-tier cap is hit.
  sharedPool: () => apiClient.get<SharedKBEntry[]>('/knowledge-bases/shared-pool'),
  // LLM-suggested example searches grounded in this KB's actual content.
  sampleQueries: (id: string) =>
    apiClient.get<{ queries: string[] }>(`/knowledge-bases/${id}/sample-queries`),
  // Real chunk listing straight from Zilliz/Milvus (not cached Postgres data).
  chunks: (id: string, limit: number, offset: number) =>
    apiClient.get<{ chunks: IndexedChunk[]; total: number; has_more: boolean }>(
      `/knowledge-bases/${id}/chunks`,
      { params: { limit, offset } }
    ),
  // Live connectivity check against Zilliz/Milvus, not just cached counters.
  health: (id: string) => apiClient.get<KBHealth>(`/knowledge-bases/${id}/health`),
};
