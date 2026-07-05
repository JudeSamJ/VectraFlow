<<<<<<< HEAD
import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Database, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { kbApi } from '../../api/knowledgeBases';
import { useChatStore } from '../../stores/chatStore';
import { useKBStore } from '../../stores/kbStore';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { CitationPanel } from '../../components/chat/CitationPanel';
import type { Citation } from '../../stores/chatStore';

export function ChatPage() {
  const { activeKBId, setActiveKB } = useKBStore();
  const { messages, agentMode, addMessage, updateStreamingMessage, finalizeMessage, setAgentMode, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: kbData } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
  });
  const kbs = Array.isArray(kbData) ? kbData : [];

  // Reset conversation when KB changes
  useEffect(() => {
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
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-md)',
              color: activeKBId ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '6px 10px',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              cursor: 'pointer',
              minWidth: 220,
            }}
          >
            <option value="">Select a knowledge base…</option>
            {kbs.map(kb => (
              <option key={kb.id} value={kb.id}>{kb.name}</option>
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
          {!messages.length && (
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
=======
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  X, 
  FileText,
  Compass,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../../stores/chatStore';
import { useSSEChat } from '../../hooks/useSSEChat';
import { listKnowledgeBases } from '../../api/knowledgeBases';
import { listConversations, getMessages, deleteConversation } from '../../api/conversations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation, Message, ConversationListItem } from '../../api/types';

export const ChatPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeKbId, activeConversationId, setActiveKbId, setActiveConversationId } = useChatStore();

  const [input, setInput] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [activeUserMessage, setActiveUserMessage] = useState<string | null>(null);
  
  // Feedback states
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [ratedMessages, setRatedMessages] = useState<Record<string, 'thumbs_up' | 'thumbs_down'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch KBs
  const { data: kbsData } = useQuery({
    queryKey: ['kbs'],
    queryFn: () => listKnowledgeBases(),
  });

  // Fetch conversations
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations(),
  });

  // Fetch messages for active conversation
  const { data: messagesData } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => getMessages(activeConversationId!),
    enabled: !!activeConversationId,
  });

  const kbsList = kbsData?.items || [];
  const conversationsList = conversationsData?.items || [];
  const dbMessages = messagesData?.items || [];

  const { 
    isStreaming, 
    stage, 
    streamedText, 
    citations, 
    conversationId, 
    isNoContentError, 
    errorMessage, 
    sendMessage, 
    cancel, 
    reset: resetSSE 
  } = useSSEChat();

  // Scroll to bottom on updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [dbMessages, streamedText, isStreaming, activeUserMessage]);

  // Handle active conversation changes
  useEffect(() => {
    resetSSE();
    setActiveUserMessage(null);
  }, [activeConversationId, resetSSE]);

  // Sync finished SSE assistant message back to API & update UI
  useEffect(() => {
    if (!isStreaming && stage === 'done' && conversationId) {
      if (conversationId !== activeConversationId) {
        setActiveConversationId(conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setActiveUserMessage(null);
      resetSSE();
    }
  }, [isStreaming, stage, conversationId, activeConversationId, setActiveConversationId, queryClient, resetSSE]);

  const activeKb = kbsList.find((kb) => kb.id === activeKbId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !activeKbId) return;

    const queryText = input;
    setInput( ' ');
    setActiveUserMessage(queryText);

    // Trigger SSE fetch stream
    sendMessage(activeKbId, queryText, activeConversationId || undefined);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(convId);
      if (activeConversationId === convId) {
        setActiveConversationId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  };

  const handleRating = (msgId: string, rating: 'thumbs_up' | 'thumbs_down') => {
    setRatedMessages(prev => ({ ...prev, [msgId]: rating }));
    if (rating === 'thumbs_down') {
      setFeedbackMessageId(msgId);
    } else {
      toastSuccess('Feedback submitted!');
    }
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessageId) return;
    toastSuccess('Feedback note submitted!');
    setFeedbackMessageId(null);
    setFeedbackNote('');
  };

  const toastSuccess = (msg: string) => {
    alert(msg);
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        height: 'calc(100vh - var(--nav-height) - 48px)',
        margin: '-24px',
        position: 'relative',
        overflow: 'hidden'
      }}
      className="page-enter"
    >
      {/* Left Conversations Sidebar */}
      <div 
        style={{
          width: '280px',
          borderRight: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Conversations</span>
          <button 
            className="btn btn-secondary" 
            style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
            onClick={() => setActiveConversationId(null)}
          >
            New Chat
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '8px', gap: '4px' }}>
          {conversationsList.map((conv: ConversationListItem) => {
            const isSelected = conv.id === activeConversationId;
            return (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveKbId(conv.kb_id);
                  setActiveConversationId(conv.id);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
                  borderLeft: isSelected ? '2px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  outline: 'none',
                  transition: 'background-color 150ms ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: isSelected ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.title || 'Untitled conversation'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {conv.kb_name}
                  </span>
                </div>
                <X 
                  size={12} 
                  color="var(--text-muted)" 
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  style={{ marginLeft: '8px', cursor: 'pointer' }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          backgroundColor: 'var(--bg-page)'
        }}
      >
        {/* Chat Header */}
        <div 
          style={{ 
            height: 'var(--nav-height)', 
            borderBottom: '1px solid var(--border)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 20px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '500', fontSize: '15px' }}>
              {activeKb ? activeKb.name : 'VectraFlow Chat'}
            </span>
          </div>

          {activeConversationId && (
            <button 
              className="btn-icon" 
              onClick={() => setActiveConversationId(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {dbMessages.length === 0 && !activeUserMessage && !isStreaming ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '12px' }}>
              <Compass size={40} color="var(--text-muted)" className="status-pulsing" />
              <span style={{ fontSize: '13px' }}>Ask your first question to start a conversation in this Knowledge Base</span>
            </div>
          ) : (
            <>
              {/* Saved Database Messages */}
              {dbMessages.map((msg: Message) => {
                const isUser = msg.role === 'user';
                const hasRated = ratedMessages[msg.id];
                
                return (
                  <div 
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: isUser ? 'var(--accent-subtle)' : 'rgba(255, 255, 255, 0.03)',
                        border: isUser ? '1px solid rgba(0, 192, 122, 0.12)' : '1px solid var(--border)',
                        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '12px 16px',
                        maxWidth: isUser ? '80%' : '90%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Saved Citations */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                          {msg.citations.map((citation: Citation, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitation(citation)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: 'var(--accent-subtle)',
                                border: '1px solid var(--border-accent)',
                                color: 'var(--accent)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '11px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              <FileText size={11} />
                              <span>[{idx + 1}] {citation.document_filename}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Saved Feedback Rating */}
                      {!isUser && (
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                          <button 
                            className="btn-icon" 
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              border: 'none',
                              color: hasRated === 'thumbs_up' ? 'var(--accent)' : 'var(--text-muted)' 
                            }}
                            onClick={() => handleRating(msg.id, 'thumbs_up')}
                            disabled={!!hasRated}
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              border: 'none',
                              color: hasRated === 'thumbs_down' ? 'var(--status-error)' : 'var(--text-muted)' 
                            }}
                            onClick={() => handleRating(msg.id, 'thumbs_down')}
                            disabled={!!hasRated}
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Temporary active user message bubble during streaming */}
              {activeUserMessage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <div
                    style={{
                      backgroundColor: 'var(--accent-subtle)',
                      border: '1px solid rgba(0, 192, 122, 0.12)',
                      borderRadius: '14px 14px 4px 14px',
                      padding: '12px 16px',
                      maxWidth: '80%',
                      fontSize: '15px',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {activeUserMessage}
                  </div>
                </div>
              )}

              {/* SSE Live Stream Bubble */}
              {isStreaming && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: '14px 14px 14px 4px',
                      padding: '12px 16px',
                      maxWidth: '90%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Stage indicators */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {stage === 'retrieving' && (
                        <span 
                          className="badge status-pulsing" 
                          style={{ 
                            fontSize: '11px', 
                            height: '22px',
                            backgroundColor: 'rgba(124, 109, 255, 0.1)',
                            color: 'var(--status-indexing)',
                            border: '1px solid rgba(124, 109, 255, 0.2)'
                          }}
                        >
                          🔍 Retrieving relevant chunks...
                        </span>
                      )}
                      {stage === 'generating' && (
                        <span 
                          className="badge status-pulsing" 
                          style={{ 
                            fontSize: '11px', 
                            height: '22px',
                            backgroundColor: 'rgba(0, 192, 122, 0.1)',
                            color: 'var(--status-ready)',
                            border: '1px solid rgba(0, 192, 122, 0.2)'
                          }}
                        >
                          ✨ Generating answer...
                        </span>
                      )}
                    </div>

                    {/* Typing dots indicator before token arrival */}
                    {stage === 'generating' && !streamedText && (
                      <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
                        <span className="dot-1" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%' }} />
                        <span className="dot-2" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%' }} />
                        <span className="dot-3" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%' }} />
                      </div>
                    )}

                    {/* Stream text content */}
                    {streamedText && (
                      <div style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamedText}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Stream citations */}
                    {citations.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        {citations.map((citation: Citation, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedCitation(citation)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'var(--accent-subtle)',
                              border: '1px solid var(--border-accent)',
                              color: 'var(--accent)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              padding: '2px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            <FileText size={11} />
                            <span>[{idx + 1}] {citation.document_filename}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No relevant context error block */}
              {stage === 'error' && isNoContentError && (
                <div 
                  style={{
                    backgroundColor: 'rgba(255, 160, 67, 0.08)',
                    border: '1px solid rgba(255, 160, 67, 0.20)',
                    borderRadius: 'var(--radius-md)',
                    color: '#FFA043',
                    padding: '12px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    alignSelf: 'flex-start'
                  }}
                >
                  <HelpCircle size={16} />
                  <span>No relevant content found in this knowledge base for your question.</span>
                </div>
              )}

              {/* System Error Display */}
              {stage === 'error' && !isNoContentError && (
                <div 
                  style={{
                    backgroundColor: 'rgba(255, 77, 77, 0.08)',
                    border: '1px solid rgba(255, 77, 77, 0.20)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--status-error)',
                    padding: '12px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    alignSelf: 'flex-start'
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{errorMessage || 'Connection failed. Please try again.'}</span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={handleSend}
          style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            backgroundColor: 'var(--bg-card)' 
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="input"
              style={{ 
                flex: 1, 
                height: '38px',
                minHeight: '38px',
                maxHeight: '160px',
                padding: '8px 12px', 
                resize: 'none',
                lineHeight: '1.4'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button 
                type="button" 
                className="btn btn-destructive" 
                style={{ height: '38px', minWidth: '80px' }}
                onClick={cancel}
              >
                Stop
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ height: '38px', minWidth: '80px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                disabled={!input.trim() || !activeKbId}
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Right Drawer: Citation Panel */}
      {selectedCitation && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '360px',
            height: '100%',
            backgroundColor: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 150,
            animation: 'drawer-in 200ms ease-out'
          }}
        >
          {/* Header */}
          <div 
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent)" />
              <span style={{ fontSize: '15px', fontWeight: '600' }}>Citation Details</span>
            </div>
            <button className="btn-icon" onClick={() => setSelectedCitation(null)} style={{ border: 'none', background: 'none' }}>
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Source Document</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedCitation.document_filename}</span>
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Page Number</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedCitation.page_number || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Match Score</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--accent)' }}>{(selectedCitation.score * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Excerpt Extract</span>
              <div 
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  whiteSpace: 'pre-wrap'
                }}
              >
                "{selectedCitation.excerpt}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downvoted note popover feedback popup */}
      {feedbackMessageId && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <form 
            onSubmit={handleNoteSubmit}
            className="card"
            style={{
              width: '320px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>Note Feedback</span>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setFeedbackMessageId(null)}
                style={{ border: 'none', background: 'none' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <textarea
              className="input"
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="What could be improved? (optional)"
              style={{ height: '80px', padding: '8px 12px', resize: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setFeedbackMessageId(null)}
                style={{ height: '30px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ height: '30px', fontSize: '13px' }}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
