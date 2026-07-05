import { apiClient } from './client';
<<<<<<< HEAD
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
=======
import type { KnowledgeBase, KBStats, PaginatedResponse } from './types';

export async function listKnowledgeBases(): Promise<PaginatedResponse<KnowledgeBase>> {
  const res = await apiClient.get<PaginatedResponse<KnowledgeBase>>('/knowledge-bases');
  return res.data;
}

export async function getKnowledgeBase(kbId: string): Promise<KnowledgeBase> {
  const res = await apiClient.get<KnowledgeBase>(`/knowledge-bases/${kbId}`);
  return res.data;
}

export async function createKnowledgeBase(data: { name: string; description?: string }): Promise<KnowledgeBase> {
  const res = await apiClient.post<KnowledgeBase>('/knowledge-bases', data);
  return res.data;
}

export async function updateKnowledgeBase(
  kbId: string,
  data: { name?: string; description?: string }
): Promise<KnowledgeBase> {
  const res = await apiClient.put<KnowledgeBase>(`/knowledge-bases/${kbId}`, data);
  return res.data;
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  await apiClient.delete(`/knowledge-bases/${kbId}`);
}

export async function getKnowledgeBaseStats(kbId: string): Promise<KBStats> {
  const res = await apiClient.get<KBStats>(`/knowledge-bases/${kbId}/stats`);
  return res.data;
}
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
