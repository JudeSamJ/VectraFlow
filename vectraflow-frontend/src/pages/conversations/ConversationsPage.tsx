<<<<<<< HEAD
import { ArrowLeft, Filter, ChevronRight, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { useKBStore } from '../../stores/kbStore';
import { formatRelativeTime } from '../../utils/formatters';

interface ConversationItem {
  id: string;
  knowledge_base_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function ConversationsPage() {
  const navigate = useNavigate();
  const { setActiveKB } = useKBStore();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () =>
      apiClient.get<ConversationItem[]>('/conversations').then(r => r.data),
  });

  const openConversation = (conv: ConversationItem) => {
    setActiveKB(conv.knowledge_base_id);
    navigate('/chat');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="icon" onClick={() => navigate(-1)}><ArrowLeft size={16} /></Button>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, flex: 1 }}>History</h1>
        <Button variant="icon"><Filter size={16} /></Button>
      </div>

      <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {isLoading ? 'Loading…' : `${conversations.length} past conversation${conversations.length === 1 ? '' : 's'}`}
      </p>

      {!isLoading && conversations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>No conversations yet — start chatting to see history here</p>
          <Button variant="secondary" style={{ marginTop: 16 }} onClick={() => navigate('/chat')}>
            Start a conversation
          </Button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {conversations.map(conv => (
          <Card key={conv.id} interactive style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{conv.title}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {formatRelativeTime(conv.updated_at)}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 12 }}>
                KB: {conv.knowledge_base_id.slice(0, 8)}…
              </p>
              <Button variant="secondary" size="sm" onClick={() => openConversation(conv)}>
                Open in Chat <ChevronRight size={13} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
=======
import React, { useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listConversations } from '../../api/conversations';
import { listKnowledgeBases } from '../../api/knowledgeBases';
import { useChatStore } from '../../stores/chatStore';

export const ConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveKbId, setActiveConversationId } = useChatStore();
  const [selectedKbFilter, setSelectedKbFilter] = useState('');

  // Fetch KBs for filter dropdown
  const { data: kbsData } = useQuery({
    queryKey: ['kbs'],
    queryFn: () => listKnowledgeBases(),
  });

  // Fetch conversations (filtered by KB if selected)
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations', selectedKbFilter],
    queryFn: () => listConversations(selectedKbFilter || undefined),
  });

  const kbsList = kbsData?.items || [];
  const conversationsList = conversationsData?.items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="page-enter">
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-icon" 
            onClick={() => navigate('/dashboard')}
            style={{ border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
            History
          </h1>
        </div>

        {/* KB Filter Selector */}
        <select
          value={selectedKbFilter}
          onChange={(e) => setSelectedKbFilter(e.target.value)}
          className="input"
          style={{ width: '220px' }}
        >
          <option value="">All Knowledge Bases</option>
          {kbsList.map(kb => (
            <option key={kb.id} value={kb.id}>{kb.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="card skeleton" style={{ height: '200px' }} />
      ) : conversationsList.length === 0 ? (
        <div 
          className="card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px', 
            gap: '12px' 
          }}
        >
          <MessageSquare size={48} color="var(--text-muted)" />
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)' }}>No conversations yet</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Start chatting with your documents to see history here.
          </span>
          <button className="btn btn-primary" onClick={() => navigate('/chat')} style={{ marginTop: '8px' }}>
            Start a chat
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {conversationsList.map((conv) => (
              <div 
                key={conv.id} 
                className="card card-interactive"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setActiveKbId(conv.kb_id);
                  setActiveConversationId(conv.id);
                  navigate('/chat');
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {conv.title || 'Untitled conversation'}
                    </span>
                    <span className="badge badge-low" style={{ fontSize: '11px', height: '18px' }}>
                      {conv.kb_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {conv.message_count || 0} messages · Created on {new Date(conv.created_at).toLocaleDateString()}
                  </span>
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ height: '30px', fontSize: '13px' }}
                >
                  View
                </button>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', height: '40px', fontSize: '14px', color: 'var(--text-secondary)' }}
            disabled
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
