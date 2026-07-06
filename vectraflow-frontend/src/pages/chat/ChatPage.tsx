import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Database, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { kbApi } from '../../api/knowledgeBases';
import { chatApi } from '../../api/chat';
import { useChatStore } from '../../stores/chatStore';
import { useKBStore } from '../../stores/kbStore';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { CitationPanel } from '../../components/chat/CitationPanel';
import type { Citation } from '../../stores/chatStore';

export function ChatPage() {
  const { activeKBId, setActiveKB } = useKBStore();
  const { messages, agentMode, addMessage, updateStreamingMessage, finalizeMessage, setAgentMode, clearMessages, restoreConversation } = useChatStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const restoringFromNavRef = useRef(false);
  const qc = useQueryClient();
  const location = useLocation();

  const { data: kbData } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
  });
  const kbs = Array.isArray(kbData) ? kbData : [];

  // Restore conversation when navigated from history page
  useEffect(() => {
    const state = location.state as { conversationId?: string; kbId?: string } | null;
    if (!state?.conversationId) return;
    const { conversationId: convId, kbId } = state;
    restoringFromNavRef.current = true;
    if (kbId) setActiveKB(kbId);
    clearMessages();
    setRestoring(true);
    window.history.replaceState({}, '');
    chatApi.getMessages(convId).then(res => {
      const restored = res.data
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          citations: m.citations?.items ?? [],
        }));
      restoreConversation(convId, restored);
      setConversationId(convId);
    }).catch(() => {}).finally(() => {
      setRestoring(false);
      restoringFromNavRef.current = false;
    });
  }, []);

  // Reset conversation when KB changes — skip during nav-restore to avoid clearing the loading state
  useEffect(() => {
    if (restoringFromNavRef.current) return;
    setConversationId(null);
    clearMessages();
  }, [activeKBId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const newChat = () => {
    setConversationId(null);
    clearMessages();
  };

  const send = async () => {
    if (!input.trim() || streaming || !activeKBId) return;
    const query = input.trim();

    // Create a conversation on the first message
    let convId = conversationId;
    if (!convId) {
      try {
        const convRes = await apiClient.post<{ id: string }>('/conversations', {
          knowledge_base_id: activeKBId,
          title: query.slice(0, 60),
        });
        convId = convRes.data.id;
        setConversationId(convId);
      } catch {
        // Continue without conversation persistence if creation fails
      }
    }

    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: query };
    addMessage(userMsg);
    const assistantId = crypto.randomUUID();
    addMessage({ id: assistantId, role: 'assistant', content: '', isStreaming: true });
    setInput('');
    setStreaming(true);

    try {
      const res = await apiClient.post<{ answer: string; citations: Citation[]; conversation_id?: string }>(
        `/knowledge-bases/${activeKBId}/chat/sync`,
        { query, conversation_id: convId }
      );
      const { answer, citations } = res.data;
      // Animate word-by-word
      const words = answer.split(' ');
      for (let i = 0; i < words.length; i++) {
        updateStreamingMessage(assistantId, (i === 0 ? '' : ' ') + words[i]);
        if (i % 8 === 7) await new Promise(r => setTimeout(r, 8));
      }
      finalizeMessage(assistantId, citations ?? []);
      // Invalidate conversations list so History page reflects new chat
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      updateStreamingMessage(assistantId, 'Error: ' + (err?.response?.data?.detail ?? err?.message ?? 'Unknown error'));
      finalizeMessage(assistantId, []);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topnav-height) - 48px)', gap: 16 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Toolbar: KB selector + New chat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 0' }}>
          <Database size={14} color="var(--text-muted)" />
          <select
            value={activeKBId ?? ''}
            onChange={e => setActiveKB(e.target.value || null)}
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-md)',
              color: '#f2f2f2',
              padding: '6px 10px',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              cursor: 'pointer',
              minWidth: 220,
            }}
          >
            <option value="" style={{ background: '#1a1a1a', color: '#9a9a9a' }}>Select a knowledge base…</option>
            {kbs.map(kb => (
              <option key={kb.id} value={kb.id} style={{ background: '#1a1a1a', color: '#f2f2f2' }}>{kb.name}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <Button variant="secondary" size="sm" onClick={newChat}>
              <Plus size={13} /> New chat
            </Button>
          )}
          {conversationId && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Saving history
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
          {restoring && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Loading conversation…
            </div>
          )}
          {!restoring && !messages.length && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, paddingTop: 80 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(0,192,122,0.1)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} color="var(--accent)" />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                {activeKBId ? 'Ask your first question to start a conversation' : 'Select a knowledge base above to start chatting'}
              </p>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} onCitationClick={setActiveCitation} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={activeKBId ? 'Ask a question about your knowledge base…' : 'Select a knowledge base first…'}
            rows={1}
            disabled={!activeKBId}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
              color: 'var(--text-primary)', fontSize: 'var(--text-base)', lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto', opacity: activeKBId ? 1 : 0.5,
            }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setAgentMode(!agentMode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                background: agentMode ? 'rgba(0,192,122,0.1)' : 'transparent',
                border: `1px solid ${agentMode ? 'rgba(0,192,122,0.3)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                color: agentMode ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 'var(--text-xs)', fontWeight: 500, transition: 'all 0.15s',
              }}
            >
              <Bot size={12} /> Agent
            </button>
            <Button onClick={send} disabled={!input.trim() || streaming || !activeKBId}>
              <Send size={14} /> {streaming ? 'Thinking…' : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      {activeCitation && (
        <CitationPanel citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
