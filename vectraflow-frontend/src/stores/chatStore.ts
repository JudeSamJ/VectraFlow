import { create } from 'zustand';

<<<<<<< HEAD
export interface Citation {
  id: string;
  index: number;
  excerpt: string;
  document_name: string;
  page_number?: number;
  document_id: string;
  score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  stages?: string[];
}

interface ChatState {
  conversationId: string | null;
  messages: Message[];
  agentMode: boolean;
  setConversationId: (id: string) => void;
  addMessage: (msg: Message) => void;
  updateStreamingMessage: (id: string, token: string) => void;
  finalizeMessage: (id: string, citations: Citation[]) => void;
  setAgentMode: (on: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>(set => ({
  conversationId: null,
  messages: [],
  agentMode: false,
  setConversationId: id => set({ conversationId: id }),
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
  setAgentMode: on => set({ agentMode: on }),
  clearMessages: () => set({ messages: [], conversationId: null }),
=======
interface ChatState {
  activeKbId: string | null;
  activeConversationId: string | null;
  setActiveKbId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeKbId: null,
  activeConversationId: null,
  setActiveKbId: (id) => set({ activeKbId: id }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
}));
