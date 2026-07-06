import { apiClient } from './client';
import type { Citation } from '../stores/chatStore';

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: { items: Citation[] } | null;
  created_at: string;
}

export const chatApi = {
  getMessages: (conversationId: string) =>
    apiClient.get<StoredMessage[]>(`/conversations/${conversationId}/messages`),
};
