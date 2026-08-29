import { apiClient } from './client';
import type { KBCapacity, KnowledgeBase, SharedKBEntry } from './types';

export const kbApi = {
  list: () =>
    apiClient.get<KnowledgeBase[]>('/knowledge-bases'),
  get: (id: string) => apiClient.get<KnowledgeBase>(`/knowledge-bases/${id}`),
  create: (data: { name: string; description: string }) =>
    apiClient.post<KnowledgeBase>('/knowledge-bases', data),
  reindex: (id: string) => apiClient.post(`/knowledge-bases/${id}/reindex`),
  delete: (id: string) => apiClient.delete(`/knowledge-bases/${id}`),
  // Free-tier (Zilliz Cloud) usage — capped app-wide, not per user.
  capacity: () => apiClient.get<KBCapacity>('/knowledge-bases/capacity'),
  // Every active knowledge base across all users, so anyone can free up a
  // shared slot once the free-tier cap is hit.
  sharedPool: () => apiClient.get<SharedKBEntry[]>('/knowledge-bases/shared-pool'),
};
