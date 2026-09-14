import { apiClient } from './client';
import type { Citation } from '../stores/chatStore';

// Shape returned by POST /{kb_id}/chat/sync's `citations` array — see
// CitationItem in kb_chat.py. Kept as its own type (rather than reusing
// Citation directly) since the API's field names (source_name, chunk_id)
// differ slightly from the store's historical Citation shape.
export interface ApiCitation {
  index: number;
  chunk_id: string;
  document_id: string | null;
  source_type: 'document' | 'd365_record';
  source_name: string;
  source_reference: string | null;
  page_number: number | null;
  section_heading: string | null;
  excerpt: string;
  score: number;
}

export function toCitation(c: ApiCitation): Citation {
  // Falls back gracefully for citations persisted before source_name/
  // source_type/excerpt existed on the stored message (older conversation
  // history), rather than rendering "undefined" in the UI.
  return {
    id: c.chunk_id ?? '',
    index: c.index,
    excerpt: c.excerpt ?? '',
    document_name: c.source_name ?? 'Source',
    page_number: c.page_number ?? undefined,
    document_id: c.document_id ?? '',
    score: c.score ?? 0,
    source_type: c.source_type,
    source_name: c.source_name,
    source_reference: c.source_reference ?? undefined,
  };
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: { items: ApiCitation[] } | null;
  created_at: string;
}

export const chatApi = {
  getMessages: (conversationId: string) =>
    apiClient.get<StoredMessage[]>(`/conversations/${conversationId}/messages`),
};
