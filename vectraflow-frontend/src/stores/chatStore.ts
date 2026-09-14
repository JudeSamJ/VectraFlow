import { create } from 'zustand';

export interface Citation {
  id: string;
  index: number;
  excerpt: string;
  document_name: string;
  page_number?: number;
  document_id: string;
  score: number;
  // Structured source metadata — additive. source_type distinguishes an
  // uploaded document from a synced D365 F&O record; source_reference is
  // a page number (documents) or a direct OData record link (D365).
  source_type?: 'document' | 'd365_record';
  source_name?: string;
  source_reference?: string;
}

export interface PendingAction {
  actionLogId: string;
  actionName: string;
  parameters: Record<string, unknown>;
  // Set once the user has confirmed or cancelled — hides the buttons and
  // lets the follow-up "Action executed/cancelled" message stand on its own.
  resolved?: 'confirmed' | 'cancelled';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  stages?: string[];
  pendingAction?: PendingAction;
}

interface ChatState {
  conversationId: string | null;
  // Which knowledge base the current conversationId/messages belong to —
  // lets the Chat page tell "navigated away and back to the same KB"
  // (keep the conversation) apart from "switched to a different KB"
  // (start fresh), since this store — unlike component state — survives
  // ChatPage unmounting when the user visits another page.
  kbId: string | null;
  messages: Message[];
  agentMode: boolean;
  setConversationId: (id: string | null, kbId: string | null) => void;
  addMessage: (msg: Message) => void;
  updateStreamingMessage: (id: string, token: string) => void;
  finalizeMessage: (id: string, citations: Citation[]) => void;
  setPendingAction: (id: string, pendingAction: PendingAction | undefined) => void;
  resolvePendingAction: (id: string, resolution: 'confirmed' | 'cancelled') => void;
  setAgentMode: (on: boolean) => void;
  clearMessages: () => void;
  restoreConversation: (conversationId: string, kbId: string, messages: Message[]) => void;
}

export const useChatStore = create<ChatState>(set => ({
  conversationId: null,
  kbId: null,
  messages: [],
  agentMode: false,
  setConversationId: (id, kbId) => set({ conversationId: id, kbId }),
  addMessage: msg => set(s => ({ messages: [...s.messages, msg] })),
  updateStreamingMessage: (id, token) =>
    set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),
  finalizeMessage: (id, citations) =>
    set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, isStreaming: false, citations } : m
      ),
    })),
  setPendingAction: (id, pendingAction) =>
    set(s => ({
      messages: s.messages.map(m => (m.id === id ? { ...m, pendingAction } : m)),
    })),
  resolvePendingAction: (id, resolution) =>
    set(s => ({
      messages: s.messages.map(m =>
        m.id === id && m.pendingAction ? { ...m, pendingAction: { ...m.pendingAction, resolved: resolution } } : m
      ),
    })),
  setAgentMode: on => set({ agentMode: on }),
  clearMessages: () => set({ messages: [], conversationId: null, kbId: null }),
  restoreConversation: (conversationId, kbId, messages) => set({ conversationId, kbId, messages }),
}));
