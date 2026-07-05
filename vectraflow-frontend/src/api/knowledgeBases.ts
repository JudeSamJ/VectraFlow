import { apiClient } from './client';
import type { KnowledgeBase } from './types';

export const kbApi = {
  list: () =>
    apiClient.get<KnowledgeBase[]>('/knowledge-bases'),
  get: (id: string) => apiClient.get<KnowledgeBase>(`/knowledge-bases/${id}`),
  create: (data: { name: string; description: string }) =>
    apiClient.post<KnowledgeBase>('/knowledge-bases', data),
  reindex: (id: string) => apiClient.post(`/knowledge-bases/${id}/reindex`),
  delete: (id: string) => apiClient.delete(`/knowledge-bases/${id}`),
};
