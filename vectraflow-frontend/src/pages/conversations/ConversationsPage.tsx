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
    navigate('/chat', { state: { conversationId: conv.id, kbId: conv.knowledge_base_id } });
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
