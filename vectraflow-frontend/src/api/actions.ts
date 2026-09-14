import { apiClient } from './client';

export interface ActionWhitelistEntry {
  name: string;
  description: string;
  is_write: boolean;
  parameters: string[];
}

export interface ActionLogResult {
  id: string;
  action_name: string;
  parameters: Record<string, unknown>;
  status: 'pending_confirmation' | 'executed' | 'failed' | 'cancelled';
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  executed_at: string | null;
}

export const actionsApi = {
  whitelist: () => apiClient.get<ActionWhitelistEntry[]>('/d365-actions/whitelist'),
  confirm: (kbId: string, actionLogId: string) =>
    apiClient.post<ActionLogResult>(`/knowledge-bases/${kbId}/actions/${actionLogId}/confirm`),
  cancel: (kbId: string, actionLogId: string) =>
    apiClient.post<ActionLogResult>(`/knowledge-bases/${kbId}/actions/${actionLogId}/cancel`),
  history: (kbId: string) =>
    apiClient.get<ActionLogResult[]>(`/knowledge-bases/${kbId}/actions/history`),
};
